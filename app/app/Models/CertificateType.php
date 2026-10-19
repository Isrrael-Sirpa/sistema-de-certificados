<?php

namespace App\Models;

class CertificateType extends ScopedRecord
{
    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}
