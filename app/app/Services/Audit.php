<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class Audit
{
    public static function log(?User $actor, string $action, ?Model $subject = null, array $details = []): void
    {
        AuditEvent::create(['user_id' => $actor?->id, 'career_id' => $subject?->career_id, 'action' => $action, 'subject_type' => $subject ? $subject::class : null, 'subject_id' => $subject?->id, 'details' => $details, 'ip' => app()->runningInConsole() ? null : request()->ip()]);
    }
}
