<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Participant extends ScopedRecord
{
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }
}
