<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends ScopedRecord
{
    protected $appends = ['full_name'];

    public function getFullNameAttribute(): string
    {
        return $this->first_names.' '.$this->last_names;
    }

    public function careers(): BelongsToMany
    {
        return $this->belongsToMany(Career::class)->withTimestamps();
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    public function scopeVisibleTo(Builder $q, User $u): Builder
    {
        return $u->isAdmin() ? $q : $q->whereHas('careers', fn ($c) => $c->where('careers.id', $u->career_id));
    }
}
