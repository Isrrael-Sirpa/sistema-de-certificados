<?php

namespace App\Console\Commands;

use App\Services\InstitutionalSetup;
use Illuminate\Console\Command;

class InstallInstitution extends Command
{
    protected $signature = 'certificates:institution';

    protected $description = 'Instalar nueve carreras y plantillas institucionales sin datos personales ni emisiones';

    public function handle(InstitutionalSetup $setup): int
    {
        $this->table(['Carrera ID', 'Carrera', 'Plantilla ID', 'Versión ID'], $setup->install());
        $this->info('Configuración completa. Las modificaciones de usuarios se conservan al repetir. Configure firmas y sellos antes de emitir.');

        return self::SUCCESS;
    }
}
