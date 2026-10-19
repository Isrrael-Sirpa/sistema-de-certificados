<?php

namespace App\Services;

use App\Models\Career;
use App\Models\CertificateType;
use App\Models\User;

class Context
{
    public static function careers(User $u)
    {
        return Career::query()->where('active', true)->when(! $u->isAdmin(), fn ($q) => $q->whereKey($u->career_id))->orderBy('name')->get();
    }

    public static function choices(User $u): array
    {
        return ['careers' => self::careers($u), 'types' => CertificateType::where('active', true)->orderBy('name')->get()];
    }
}
