<?php

namespace App\Console\Commands;

use App\Services\DemonstrationRetirement;
use Illuminate\Console\Command;

class RetireDemonstration extends Command
{
    protected $signature = 'certificates:retire-demo {--apply : Aplicar la retirada selectiva} {--backup= : Carpeta de respaldo verificado}';

    protected $description = 'Inventariar o retirar exclusivamente la demostración anterior, con respaldo previo';

    public function handle(DemonstrationRetirement $retirement): int
    {
        $result = $this->option('apply') ? $retirement->apply((string) $this->option('backup')) : $retirement->plan();
        $this->line(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}
