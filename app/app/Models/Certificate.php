<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Certificate extends ScopedRecord
{
    const UPDATED_AT = null;

    protected $hidden = ['delivery_token', 'pdf_path'];

    protected $appends = ['status'];

    protected function casts(): array
    {
        return ['snapshot' => 'array', 'issued_at' => 'immutable_datetime', 'expires_at' => 'immutable_datetime'];
    }

    public function revocation(): HasOne
    {
        return $this->hasOne(Revocation::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function getStatusAttribute(): string
    {
        return $this->revocation()->exists() ? 'anulado' : ($this->expires_at->lessThanOrEqualTo(now()) ? 'vencido' : 'vigente');
    }

    public function scopeWithStatus(Builder $q, ?string $status): Builder
    {
        return match ($status) {
            'anulado' => $q->whereHas('revocation'),
            'vencido' => $q->whereDoesntHave('revocation')->where('expires_at', '<=', now()),
            'vigente' => $q->whereDoesntHave('revocation')->where('expires_at', '>', now()),
            default => $q,
        };
    }
}
