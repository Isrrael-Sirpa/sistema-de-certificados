<?php

namespace App\Console\Commands;

use App\Jobs\IssueCertificate;
use App\Models\IssuanceBatch;
use App\Services\Issuance;
use Illuminate\Console\Command;

class ReconcileIssuance extends Command
{
    protected $signature = 'certificates:reconcile {--dispatch : Reencolar pendientes y fallidos de operaciones confirmadas}';

    protected $description = 'Recalcular seguimiento y recuperar operaciones interrumpidas de emisión';

    public function handle(Issuance $service): int
    {
        $count = 0;
        IssuanceBatch::whereNotNull('confirmed_at')->each(function ($b) use ($service, &$count) {
            $service->refreshBatch($b->id);
            if ($this->option('dispatch')) {
                foreach ($b->items()->whereIn('status', ['pending', 'failed'])->get() as $i) {
                    IssueCertificate::dispatch($i->id);
                    $count++;
                }
            }
        });
        $this->info('Seguimiento reconciliado. Elementos reenviados: '.$count);

        return self::SUCCESS;
    }
}
