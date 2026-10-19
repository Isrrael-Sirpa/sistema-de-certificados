<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class BatchItem extends ScopedRecord
{
    protected function casts(): array
    {
        return ['snapshot' => 'array', 'review' => 'array'];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(IssuanceBatch::class, 'issuance_batch_id');
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(Participant::class);
    }

    public function version(): BelongsTo
    {
        return $this->belongsTo(TemplateVersion::class, 'template_version_id');
    }

    public function certificate(): HasOne
    {
        return $this->hasOne(Certificate::class);
    }
}
