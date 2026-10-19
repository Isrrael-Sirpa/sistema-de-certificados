<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends ScopedRecord
{
    public function career(): BelongsTo
    {
        return $this->belongsTo(Career::class);
    }

    public function certificateType(): BelongsTo
    {
        return $this->belongsTo(CertificateType::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(Participant::class);
    }
}
