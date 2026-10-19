<?php

namespace App\Jobs;

use App\Services\Issuance;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class IssueCertificate implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public int $itemId) {}

    public function handle(Issuance $service): void
    {
        $service->issue($this->itemId);
    }
}
