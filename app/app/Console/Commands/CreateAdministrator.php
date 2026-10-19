<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Audit;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CreateAdministrator extends Command
{
    protected $signature = 'certificates:admin {--name=} {--email=}';

    protected $description = 'Crear de forma segura una cuenta personal inicial de Vicedecanato';

    public function handle(): int
    {
        $name = $this->option('name') ?: ($this->input->isInteractive() ? $this->ask('Nombre completo') : null);
        $email = $this->option('email') ?: ($this->input->isInteractive() ? $this->ask('Correo de la persona') : null);
        $password = getenv('ADMIN_INITIAL_PASSWORD') ?: ($this->input->isInteractive() ? $this->secret('Contraseña (mínimo 12 caracteres)') : null);
        $v = Validator::make(compact('name', 'email', 'password'), ['name' => 'required|string|max:255', 'email' => 'required|email|unique:users', 'password' => 'required|string|min:12']);
        if ($v->fails()) {
            $this->error(implode(' ', $v->errors()->all()));

            return self::FAILURE;
        }
        DB::transaction(function () use ($name, $email, $password) {
            $u = User::create(['name' => $name, 'email' => $email, 'password' => $password, 'role' => 'admin', 'active' => true]);
            Audit::log($u, 'user.initial_admin_created', $u);
        });
        $this->info('Administrador creado. No se cargaron datos de demostración.');

        return self::SUCCESS;
    }
}
