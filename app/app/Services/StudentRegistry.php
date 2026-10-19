<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Normalizer;

class StudentRegistry
{
    public static function normalizeCi(string $ci): string
    {
        return mb_strtoupper(preg_replace('/\s+/u', ' ', trim(Normalizer::normalize($ci, Normalizer::FORM_KC))));
    }

    public static function sameName(Student $s, array $d): bool
    {
        $normalize = fn ($v) => mb_strtoupper(preg_replace('/\s+/u', ' ', trim(Normalizer::normalize($v, Normalizer::FORM_KC))));

        return $normalize($s->first_names) === $normalize($d['first_names']) && $normalize($s->last_names) === $normalize($d['last_names']);
    }

    public function inspect(User $u, array $d): array
    {
        $s = Student::where('normalized_ci', self::normalizeCi($d['ci']))->first();
        if (! $s) {
            return ['status' => 'new', 'message' => 'Nuevo estudiante'];
        }
        $visible = Student::visibleTo($u)->whereKey($s->id)->exists();
        if (! self::sameName($s, $d)) {
            return ['status' => 'discrepancy', 'message' => $visible ? 'El CI existe con otro nombre. Revisar la ficha; no se sobrescribirá.' : 'El CI requiere revisión por Vicedecanato. No se revelan datos de otra carrera.'];
        }

        return ['status' => 'existing', 'message' => 'Se reutilizará sin modificar sus datos.'];
    }

    public function register(User $u, int $careerId, array $d): array
    {
        Access::career($u, $careerId);

        return DB::transaction(function () use ($u, $careerId, $d) {
            $normalized = self::normalizeCi($d['ci']);
            $created = DB::table('students')->insertOrIgnore(['ci' => trim($d['ci']), 'normalized_ci' => $normalized, 'first_names' => trim($d['first_names']), 'last_names' => trim($d['last_names']), 'created_at' => now(), 'updated_at' => now()]);
            $s = Student::where('normalized_ci', $normalized)->lockForUpdate()->firstOrFail();
            if (! self::sameName($s, $d)) {
                throw ValidationException::withMessages(['ci' => $this->inspect($u, $d)['message']]);
            }
            $s->careers()->syncWithoutDetaching([$careerId]);
            Audit::log($u, $created ? 'student.created' : 'student.reused', $s, ['career_id' => $careerId]);

            return [$s, (bool) $created];
        });
    }
}
