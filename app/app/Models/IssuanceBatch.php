<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IssuanceBatch extends ScopedRecord
{
    protected function casts(): array
    {
        return ['confirmed_at' => 'datetime'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(BatchItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeVisibleTo(Builder $q, User $u): Builder
    {
        return $u->isAdmin() ? $q : $q->where('user_id', $u->id)->whereDoesntHave('items', fn ($i) => $i->where('career_id', '<>', $u->career_id));
    }
}
