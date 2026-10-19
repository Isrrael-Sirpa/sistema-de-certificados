<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\TemplateVersion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DemonstrationRetirement
{
    public function plan(): array
    {
        $database = config('database.connections.pgsql.database');
        if (! app()->environment(['qa', 'testing']) || ! (str_ends_with($database, '_qa') || (app()->environment('testing') && str_ends_with($database, '_test')))) {
            throw new \RuntimeException('La retirada está limitada al QA anterior o a pruebas aisladas.');
        }
        if (DB::table('audit_events')->where('action', 'demo.retired')->exists()) {
            return ['database' => $database, 'already_retired' => true, 'delete' => [], 'deactivate' => []];
        }
        if (! DB::table('audit_events')->where('action', 'demo.loaded')->exists()) {
            throw new \RuntimeException('No existe evidencia de la carga de demostración. Se conserva toda la base.');
        }
        $careers = [];
        $activities = [];
        $templates = [];
        $expectedStudents = [];
        $type = DB::table('certificate_types')->where('name', 'Participación (ejemplo configurable)')->where('text', 'Por su participación en la actividad de formación que se detalla a continuación.')->first();
        for ($n = 1; $n <= 9; $n++) {
            $number = str_pad((string) $n, 2, '0', STR_PAD_LEFT);
            $career = DB::table('careers')->where('code', 'DEMO-'.$number)->where('name', 'Carrera ficticia '.$number)->whereNull('institutional_key')->first();
            if (! $career) {
                continue;
            }
            $careers[] = $career->id;
            if ($type) {
                $activity = DB::table('activities')->where('career_id', $career->id)->where('name', 'Seminario ficticio de actualización '.$n)->where('description', 'Actividad ficticia para supervisión y QA.')->where('starts_on', '2026-09-10')->where('ends_on', '2026-09-12')->where('certificate_type_id', $type->id)->first();
                if ($activity) {
                    $activities[] = $activity->id;
                }
            }
            $template = DB::table('certificate_templates')->where('career_id', $career->id)->where('name', 'Diseño institucional de ejemplo '.$n)->whereNull('institutional_key')->first();
            if ($template) {
                $templates[] = $template->id;
            }
            for ($s = 1; $s <= ($n === 1 ? 30 : 4); $s++) {
                $ci = $s === 1 ? '0001234-A' : str_pad((string) (100000 * $n + $s), 8, '0', STR_PAD_LEFT);
                $first = $s === 1 ? 'María José' : ($s === 2 ? 'Ángel Sebastián Maximiliano de los Ángeles' : 'Estudiante ficticio '.$s);
                $last = $s === 1 ? 'Muñoz Peña' : ($s === 2 ? 'Ñúñez Villarroel Fernández del Río' : 'Apellido de ejemplo '.$n);
                $student = DB::table('students')->where('normalized_ci', $ci)->where('first_names', $first)->where('last_names', $last)->first();
                if ($student) {
                    $expectedStudents[$student->id] = trim($first.' '.$last);
                }
            }
        }
        $global = DB::table('certificate_templates')->whereNull('career_id')->whereNull('institutional_key')->where('name', 'Diseño desde imagen de fondo (ficticio)')->first();
        if ($global) {
            $templates[] = $global->id;
        }
        $versions = DB::table('template_versions')->whereIn('certificate_template_id', $templates)->pluck('id')->all();
        $participants = DB::table('participants')->whereIn('activity_id', $activities)->whereIn('student_id', array_keys($expectedStudents))->pluck('id')->all();
        $items = DB::table('batch_items')->whereIn('participant_id', $participants)->whereIn('template_version_id', $versions)->pluck('id')->all();
        $certificates = Certificate::whereIn('batch_item_id', $items)->get()->filter(function ($c) use ($expectedStudents, $activities, $careers) {
            $activity = DB::table('activities')->find($c->activity_id);
            $career = DB::table('careers')->find($c->career_id);

            return in_array($c->activity_id, $activities) && in_array($c->career_id, $careers) && ($c->snapshot['full_name'] ?? '') === ($expectedStudents[$c->student_id] ?? null) && ($c->snapshot['activity'] ?? '') === $activity?->name && ($c->snapshot['career'] ?? '') === $career?->name;
        })->pluck('id')->all();
        do {
            $previous = [$items, $certificates];
            $preservedItems = Certificate::whereNotIn('id', $certificates)->pluck('batch_item_id')->all();
            $items = array_values(array_diff($items, $preservedItems));
            $blockedBatches = DB::table('batch_items')->whereNotIn('id', $items)->pluck('issuance_batch_id')->all();
            $items = DB::table('batch_items')->whereIn('id', $items)->whereNotIn('issuance_batch_id', $blockedBatches)->pluck('id')->all();
            $protectedReplacementIds = Certificate::whereNotIn('id', $certificates)->whereNotNull('replacement_for')->pluck('replacement_for')->merge(DB::table('batch_items')->whereNotIn('id', $items)->whereNotNull('replacement_for')->pluck('replacement_for'))->all();
            $certificates = Certificate::whereIn('id', $certificates)->whereIn('batch_item_id', $items)->whereNotIn('id', $protectedReplacementIds)->pluck('id')->all();
        } while ($previous !== [$items, $certificates]);
        $batches = DB::table('batch_items')->whereIn('id', $items)->distinct()->pluck('issuance_batch_id')->all();
        $participants = DB::table('participants')->whereIn('id', $participants)->whereNotIn('id', DB::table('batch_items')->whereNotIn('id', $items)->pluck('participant_id'))->whereNotIn('activity_id', Certificate::whereNotIn('id', $certificates)->pluck('activity_id'))->pluck('id')->all();
        $activities = DB::table('activities')->whereIn('id', $activities)->whereNotIn('id', DB::table('participants')->whereNotIn('id', $participants)->pluck('activity_id'))->whereNotIn('id', Certificate::whereNotIn('id', $certificates)->pluck('activity_id'))->pluck('id')->all();
        $students = DB::table('students')->whereIn('id', array_keys($expectedStudents))->whereNotIn('id', DB::table('participants')->whereNotIn('id', $participants)->pluck('student_id'))->whereNotIn('id', Certificate::whereNotIn('id', $certificates)->pluck('student_id'))->whereNotIn('id', DB::table('career_student')->whereNotIn('career_id', $careers)->pluck('student_id'))->pluck('id')->all();
        $retainedVersions = Certificate::whereNotIn('id', $certificates)->pluck('template_version_id')->merge(DB::table('batch_items')->whereNotIn('id', $items)->pluck('template_version_id'))->all();
        $deletableTemplates = DB::table('certificate_templates')->whereIn('id', $templates)->whereNotIn('id', DB::table('template_versions')->whereIn('id', $retainedVersions)->pluck('certificate_template_id'))->pluck('id')->all();
        $deletableVersions = DB::table('template_versions')->whereIn('certificate_template_id', $deletableTemplates)->pluck('id')->all();
        $assets = [];
        $background = DB::table('graphic_assets')->where('name', 'Fondo ficticio de demostración')->where('path', 'assets/fondo-demo.png')->whereNull('institutional_key')->first();
        if ($background) {
            $referenced = TemplateVersion::whereNotIn('id', $deletableVersions)->get()->contains(fn ($v) => $this->containsAsset($v->design['objects'], $background->id));
            if (! $referenced) {
                $assets[] = $background->id;
            }
        }
        $chiefs = DB::table('users')->whereIn('career_id', $careers)->where('role', 'chief')->get()->filter(function ($u) {
            return preg_match('/^jefatura(0[1-9])@example\.test$/', $u->email, $match) && $u->name === 'Responsable personal de ejemplo '.(int) $match[1];
        })->pluck('id')->all();
        $safeCareers = DB::table('careers')->whereIn('id', $careers)->whereNotIn('id', DB::table('activities')->whereNotIn('id', $activities)->pluck('career_id'))->whereNotIn('id', DB::table('users')->whereNotIn('id', $chiefs)->whereNotNull('career_id')->pluck('career_id'))->whereNotIn('id', DB::table('career_student')->whereNotIn('student_id', $students)->pluck('career_id'))->pluck('id')->all();

        return ['database' => $database, 'already_retired' => false, 'delete' => ['revocations' => DB::table('revocations')->whereIn('certificate_id', $certificates)->pluck('id')->all(), 'certificates' => $certificates, 'batch_items' => $items, 'issuance_batches' => $batches, 'template_versions' => $deletableVersions, 'certificate_templates' => $deletableTemplates, 'participants' => $participants, 'activities' => $activities, 'students' => $students, 'graphic_assets' => $assets], 'deactivate' => ['users' => $chiefs, 'careers' => $safeCareers, 'certificate_templates' => array_values(array_diff($templates, $deletableTemplates)), 'certificate_types' => $type && ! DB::table('activities')->where('certificate_type_id', $type->id)->whereNotIn('id', $activities)->exists() ? [$type->id] : []], 'preserved_certificates' => Certificate::whereNotIn('id', $certificates)->pluck('id')->all(), 'preserved_students' => DB::table('students')->whereNotIn('id', $students)->pluck('id')->all(), 'preserved_assets' => DB::table('graphic_assets')->whereNotIn('id', $assets)->pluck('id')->all(), 'note' => 'Se preservan la auditoría completa y las cuentas referenciadas; las jefaturas ficticias se desactivan. La única cuenta administradora se conserva para acceso local. No se adivina la procedencia de importaciones ni recursos añadidos.'];
    }

    private function containsAsset(array $objects, int $id): bool
    {
        foreach ($objects as $object) {
            if ((int) ($object['assetId'] ?? 0) === $id || $this->containsAsset($object['objects'] ?? [], $id)) {
                return true;
            }
        }

        return false;
    }

    public function apply(string $backup): array
    {
        if (! is_dir($backup) || ! is_file($backup.'/certificados_qa.dump') || ! is_file($backup.'/private-files.zip')) {
            throw new \RuntimeException('Se requiere el respaldo PostgreSQL completo y private-files.zip antes de retirar datos.');
        }
        $files = [];
        $plan = DB::transaction(function () use ($backup, &$files) {
            DB::statement('LOCK TABLE careers, students, career_student, users, activities, participants, certificate_templates, template_versions, graphic_assets, issuance_batches, batch_items, certificates, revocations, student_imports, jobs IN ACCESS EXCLUSIVE MODE');
            $plan = $this->plan();
            if ($plan['already_retired']) {
                return $plan;
            }
            if (DB::table('jobs')->exists()) {
                throw new \RuntimeException('Hay trabajos en cola. Detenga y concilie la cola antes de retirar datos.');
            }
            $protected = DB::table('certificates')->whereIn('id', $plan['preserved_certificates'])->orderBy('id')->get()->toJson();
            $rows = [];
            foreach ($plan['delete'] as $table => $ids) {
                $rows[$table] = DB::table($table)->whereIn('id', $ids)->get()->all();
            }
            $rows['career_student'] = DB::table('career_student')->whereIn('student_id', $plan['delete']['students'])->get()->all();
            foreach ($plan['deactivate'] as $table => $ids) {
                $rows['deactivate_'.$table] = DB::table($table)->whereIn('id', $ids)->get()->all();
            }
            foreach ($rows['certificates'] as $c) {
                $files[] = $c->pdf_path;
            }
            foreach ($rows['graphic_assets'] as $a) {
                $files[] = $a->path;
            }
            $manifest = ['plan' => $plan, 'records' => $rows, 'files' => [], 'protected_sha256' => hash('sha256', $protected)];
            foreach ($files as $path) {
                if (Storage::disk('local')->exists($path)) {
                    $target = $backup.'/affected-files/'.$path;
                    if (! is_dir(dirname($target))) {
                        mkdir(dirname($target), 0700, true);
                    }
                    if (! copy(Storage::disk('local')->path($path), $target) || hash_file('sha256', $target) !== hash_file('sha256', Storage::disk('local')->path($path))) {
                        throw new \RuntimeException('No se pudo verificar la copia '.$path);
                    }
                    $manifest['files'][$path] = hash_file('sha256', $target);
                }
            }
            if (file_put_contents($backup.'/retirement-manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)) === false) {
                throw new \RuntimeException('No se pudo guardar el inventario recuperable.');
            }
            foreach (['certificates' => 'immutable_certificates', 'template_versions' => 'immutable_versions', 'revocations' => 'immutable_revocations'] as $table => $trigger) {
                DB::statement("ALTER TABLE {$table} DISABLE TRIGGER {$trigger}");
            }
            DB::table('career_student')->whereIn('student_id', $plan['delete']['students'])->delete();
            foreach ($plan['delete'] as $table => $ids) {
                DB::table($table)->whereIn('id', $ids)->delete();
            }
            foreach ($plan['deactivate'] as $table => $ids) {
                DB::table($table)->whereIn('id', $ids)->update(['active' => false]);
            }
            foreach (['certificates' => 'immutable_certificates', 'template_versions' => 'immutable_versions', 'revocations' => 'immutable_revocations'] as $table => $trigger) {
                DB::statement("ALTER TABLE {$table} ENABLE TRIGGER {$trigger}");
            }
            if ($protected !== DB::table('certificates')->whereIn('id', $plan['preserved_certificates'])->orderBy('id')->get()->toJson()) {
                throw new \RuntimeException('La comparación de registros conservados falló.');
            }
            Audit::log(null, 'demo.retired', null, ['counts' => array_map('count', $plan['delete']), 'manifest_sha256' => hash_file('sha256', $backup.'/retirement-manifest.json')]);

            return $plan;
        });
        foreach ($files as $path) {
            Storage::disk('local')->delete($path);
        }

        return $plan;
    }
}
