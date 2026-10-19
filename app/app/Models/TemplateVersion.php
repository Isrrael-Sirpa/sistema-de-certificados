<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemplateVersion extends ScopedRecord
{
    const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['design' => 'array'];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }
}
