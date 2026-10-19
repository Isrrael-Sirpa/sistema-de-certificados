<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CertificateTemplate extends ScopedRecord
{
    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function versions(): HasMany
    {
        return $this->hasMany(TemplateVersion::class);
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(TemplateVersion::class)->ofMany('number', 'max');
    }

    public function scopeVisibleTo(Builder $q, User $u): Builder
    {
        return $u->isAdmin() ? $q : $q->where(fn ($c) => $c->where('career_id', $u->career_id)->orWhereNull('career_id'));
    }
}
