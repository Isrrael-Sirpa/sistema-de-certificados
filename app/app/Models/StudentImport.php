<?php

namespace App\Models;

class StudentImport extends ScopedRecord
{
    protected function casts(): array
    {
        return ['rows' => 'array', 'result' => 'array', 'confirmed_at' => 'datetime'];
    }
}
