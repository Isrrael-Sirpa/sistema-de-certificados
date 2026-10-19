<?php

namespace App\Services;

use App\Jobs\IssueCertificate;
use App\Models\BatchItem;
use App\Models\Certificate;
use App\Models\IssuanceBatch;
use App\Models\Participant;
use App\Models\TemplateVersion;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Issuance
{
    public function snapshot(Participant $p): array
    {
        $p->load('student', 'activity.career', 'activity.certificateType');
        $a = $p->activity;
        abort_unless($a->career->active && $a->certificateType->active, 422, 'La carrera o el tipo de certificado están desactivados para nuevas emisiones.');

        return ['issuer' => config('certificates.issuer'), 'full_name' => $p->student->full_name, 'activity' => $a->name, 'career' => $a->career->name, 'certificate_type' => $a->certificateType->name, 'certificate_text' => $a->certificateType->text, 'hours' => $a->hours === null ? '' : (string) $a->hours, 'activity_dates' => CarbonImmutable::parse($a->starts_on)->format('d/m/Y').' — '.CarbonImmutable::parse($a->ends_on)->format('d/m/Y'), 'condition' => $p->condition ?? '', 'student_id' => $p->student_id, 'activity_id' => $a->id, 'career_id' => $a->career_id, 'certificate_type_id' => $a->certificate_type_id];
    }

    public function provisional(array $snapshot): array
    {
        return [...$snapshot, 'identifier' => 'PENDIENTE DE EMISIÓN', 'issued_at' => 'PENDIENTE DE EMISIÓN', 'expires_at' => 'PENDIENTE DE EMISIÓN', 'verification_url' => rtrim(config('certificates.public_url'), '/').'/verificar/'.str_repeat('0', 64)];
    }

    public function draft(User $actor, string $operation, array $items): IssuanceBatch
    {
        usort($items, fn ($a, $b) => (int) $a['participant_id'] <=> (int) $b['participant_id']);
        $hash = hash('sha256', json_encode($items));

        return DB::transaction(function () use ($actor, $operation, $items, $hash) {
            DB::table('issuance_batches')->insertOrIgnore(['user_id' => $actor->id, 'operation_key' => $operation, 'request_hash' => $hash, 'status' => 'draft', 'created_at' => now(), 'updated_at' => now()]);
            $batch = IssuanceBatch::where('user_id', $actor->id)->where('operation_key', $operation)->lockForUpdate()->firstOrFail();
            if ($batch->request_hash !== $hash) {
                throw ValidationException::withMessages(['items' => 'La clave de operación ya se usó con otros destinatarios.']);
            }
            if ($batch->items()->exists()) {
                return $batch;
            }
            foreach ($items as $item) {
                $p = Participant::with('activity')->findOrFail($item['participant_id']);
                Access::record($actor, $p->activity);
                $v = TemplateVersion::with('template')->findOrFail($item['template_version_id']);
                Access::record($actor, $v->template, true);
                abort_unless($v->template->active && ($v->template->career_id === null || (int) $v->template->career_id === (int) $p->activity->career_id), 422, 'Plantilla incompatible con la carrera.');
                if (! empty($item['replacement_for'])) {
                    $old = Certificate::visibleTo($actor)->findOrFail($item['replacement_for']);
                    abort_unless($old->student_id === $p->student_id && $old->career_id === $p->activity->career_id && $old->revocation()->exists(), 422, 'El reemplazo debe corresponder a un certificado anulado del mismo estudiante y carrera.');
                }
                $batch->items()->create(['career_id' => $p->activity->career_id, 'participant_id' => $p->id, 'template_version_id' => $v->id, 'replacement_for' => $item['replacement_for'] ?? null]);
            }
            Audit::log($actor, 'batch.drafted', null, ['batch_id' => $batch->id, 'count' => count($items)]);

            return $batch;
        });
    }

    public function review(User $actor, BatchItem $item): array
    {
        Access::record($actor, $item);
        abort_unless($item->batch->status === 'draft', 422, 'El lote ya fue confirmado.');
        $snapshot = $this->snapshot($item->participant);
        $result = app(PdfRenderer::class)->render($item->version, $this->provisional($snapshot));
        if (empty($snapshot['condition'])) {
            $result['issues'][] = ['level' => 'error', 'message' => 'Debe registrar la condición acreditada del participante.'];
        }
        $result['snapshot_hash'] = hash('sha256', json_encode($snapshot));
        $item->update(['review' => ['issues' => $result['issues'], 'snapshot_hash' => $result['snapshot_hash']]]);

        return $result;
    }

    public function confirm(User $actor, IssuanceBatch $batch): void
    {
        $publicUrl = config('certificates.public_url');
        abort_unless(filter_var($publicUrl, FILTER_VALIDATE_URL) && in_array(parse_url($publicUrl, PHP_URL_SCHEME), ['http', 'https']), 422, 'Configure una URL pública válida antes de emitir.');
        if (app()->environment('production')) {
            abort_unless(parse_url($publicUrl, PHP_URL_SCHEME) === 'https' && ! in_array(parse_url($publicUrl, PHP_URL_HOST), ['localhost', '127.0.0.1', '::1']), 422, 'Producción requiere una URL pública HTTPS definitiva.');
        }
        DB::transaction(function () use ($actor, $batch) {
            $batch = IssuanceBatch::lockForUpdate()->findOrFail($batch->id);
            if ($batch->confirmed_at) {
                return;
            }
            foreach ($batch->items()->with('participant.activity', 'version.template')->lockForUpdate()->get() as $item) {
                Access::record($actor, $item);
                abort_unless($item->version->template->active, 422, 'La plantilla está desactivada.');
                $snapshot = $this->snapshot($item->participant);
                abort_unless($item->review && ($item->review['snapshot_hash'] ?? '') === hash('sha256', json_encode($snapshot)), 422, 'Revise todos los destinatarios; los datos pudieron cambiar.');
                abort_if(collect($item->review['issues'])->contains(fn ($i) => $i['level'] === 'error'), 422, 'Corrija los errores de revisión antes de emitir.');
                $item->update(['snapshot' => $snapshot]);
            }
            $batch->update(['confirmed_at' => now(), 'status' => 'queued']);
            Audit::log($actor, 'batch.confirmed', null, ['batch_id' => $batch->id]);
            foreach ($batch->items as $item) {
                IssueCertificate::dispatch($item->id)->afterCommit();
            }
        });
    }

    public function issue(int $itemId): void
    {
        $pdfPath = null;
        try {
            DB::transaction(function () use ($itemId, &$pdfPath) {
                $item = BatchItem::with('batch.user', 'version.template', 'participant.activity')->lockForUpdate()->findOrFail($itemId);
                if ($item->status === 'completed' || $item->certificate()->exists()) {
                    return;
                }
                abort_unless($item->batch->confirmed_at, 422, 'El borrador aún no fue confirmado.');
                $actor = $item->batch->user;
                Access::career($actor, $item->career_id);
                abort_unless($item->participant->activity->career_id === $item->career_id, 403);
                Access::record($actor, $item->version->template, true);
                abort_unless($item->version->template->active, 422, 'La plantilla está desactivada.');
                $activity = $item->participant->activity->load('career', 'certificateType');
                abort_unless($activity->career->active && $activity->certificateType->active, 422, 'La carrera o el tipo de certificado están desactivados.');
                $item->update(['status' => 'processing', 'attempts' => $item->attempts + 1, 'error' => null]);
                $issued = CarbonImmutable::now('America/La_Paz');
                $expires = $issued->addYearsNoOverflow(3);
                $token = bin2hex(random_bytes(32));
                $identifier = 'FT-'.$issued->format('Y').'-'.Str::upper(Str::random(12));
                $snapshot = [...$item->snapshot, 'identifier' => $identifier, 'issued_at' => $issued->format('d/m/Y H:i'), 'expires_at' => $expires->format('d/m/Y H:i'), 'verification_url' => rtrim(config('certificates.public_url'), '/').'/verificar/'.$token];
                $pdfPath = 'certificates/'.$token.'.pdf';
                Storage::disk('local')->makeDirectory('certificates');
                $result = app(PdfRenderer::class)->render($item->version, $snapshot, Storage::disk('local')->path($pdfPath));
                if (collect($result['issues'])->contains(fn ($i) => $i['level'] === 'error') || ! Storage::disk('local')->exists($pdfPath)) {
                    throw new \RuntimeException(implode(' ', array_column($result['issues'], 'message')) ?: 'No se generó el PDF.');
                }
                $cert = Certificate::create(['career_id' => $item->career_id, 'student_id' => $snapshot['student_id'], 'activity_id' => $snapshot['activity_id'], 'certificate_type_id' => $snapshot['certificate_type_id'], 'template_version_id' => $item->template_version_id, 'batch_item_id' => $item->id, 'user_id' => $actor->id, 'identifier' => $identifier, 'public_token' => $token, 'delivery_token' => bin2hex(random_bytes(32)), 'snapshot' => $snapshot, 'issued_at' => $issued, 'expires_at' => $expires, 'pdf_path' => $pdfPath, 'pdf_sha256' => hash_file('sha256', Storage::disk('local')->path($pdfPath)), 'replacement_for' => $item->replacement_for]);
                $item->update(['status' => 'completed', 'error' => null]);
                Audit::log($actor, 'certificate.issued', $cert, ['batch_id' => $item->issuance_batch_id, 'sha256' => $cert->pdf_sha256]);
            }, 1);
        } catch (\Throwable $e) {
            if ($pdfPath && ! Certificate::where('pdf_path', $pdfPath)->exists()) {
                Storage::disk('local')->delete($pdfPath);
            }
            BatchItem::whereKey($itemId)->where('status', '<>', 'completed')->update(['status' => 'failed', 'attempts' => DB::raw('attempts + 1'), 'error' => 'La emisión no pudo completarse. '.mb_substr($e->getMessage(), 0, 1000)]);
            $failedItem = BatchItem::with('batch.user')->findOrFail($itemId);
            Audit::log($failedItem->batch->user, 'certificate.failed', $failedItem, ['batch_id' => $failedItem->issuance_batch_id, 'message' => mb_substr($e->getMessage(), 0, 500)]);
            report($e);
        } finally {
            $this->refreshBatch(BatchItem::findOrFail($itemId)->issuance_batch_id);
        }
    }

    public function refreshBatch(int $id): void
    {
        DB::transaction(function () use ($id) {
            $b = IssuanceBatch::lockForUpdate()->findOrFail($id);
            if (! $b->confirmed_at) {
                return;
            }
            $pending = $b->items()->whereIn('status', ['pending', 'processing'])->exists();
            $failed = $b->items()->where('status', 'failed')->exists();
            $b->update(['status' => $pending ? 'processing' : ($failed ? 'partial' : 'completed')]);
        });
    }
}
