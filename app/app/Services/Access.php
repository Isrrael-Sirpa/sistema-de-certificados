<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class Access
{
    public static function career(User $user, int|string|null $careerId, bool $allowGlobal = false): void
    {
        abort_unless($user->active && ($user->isAdmin() || ($careerId !== null && (int) $careerId === (int) $user->career_id) || ($allowGlobal && $careerId === null)), 403, 'No tiene permiso para esta carrera.');
    }

    public static function record(User $user, Model $record, bool $allowGlobal = false): void
    {
        self::career($user, $record->career_id, $allowGlobal);
    }

    public static function admin(User $user): void
    {
        abort_unless($user->active && $user->isAdmin(), 403, 'Esta acción corresponde a Vicedecanato.');
    }
}
