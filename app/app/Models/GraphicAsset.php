<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;

class GraphicAsset extends ScopedRecord
{
    protected $hidden = ['path'];

    public function scopeVisibleTo(Builder $q, User $u): Builder
    {
        return $u->isAdmin() ? $q : $q->where(fn ($c) => $c->where('career_id', $u->career_id)->orWhereNull('career_id'));
    }
}
