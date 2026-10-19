<?php

namespace App\Http\Controllers;

use App\Jobs\IssueCertificate;
use App\Models\Activity;
use App\Models\BatchItem;
use App\Models\CertificateTemplate;
use App\Models\IssuanceBatch;
use App\Services\Access;
use App\Services\Audit;
use App\Services\Context;
use App\Services\Issuance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IssuanceController extends Controller
{
    private function authorizeBatch(Request $r, IssuanceBatch $batch): void
    {
        abort_unless(IssuanceBatch::visibleTo($r->user())->whereKey($batch->id)->exists(), 404);
    }

    public function index(Request $r): Response
    {
        return Inertia::render('Batches', ['batches' => IssuanceBatch::visibleTo($r->user())->withCount(['items', 'items as completed_count' => fn ($q) => $q->where('status', 'completed'), 'items as failed_count' => fn ($q) => $q->where('status', 'failed')])->latest('id')->paginate(20)]);
    }

    public function create(Request $r): Response
    {
        return Inertia::render('Issue', [...Context::choices($r->user()), 'activities' => Activity::visibleTo($r->user())->whereHas('career', fn ($q) => $q->where('active', true))->with('career', 'participants.student', 'certificateType')->get(), 'templates' => CertificateTemplate::visibleTo($r->user())->where('active', true)->with('latestVersion')->get(), 'activityId' => $r->integer('activity_id') ?: null, 'templateId' => $r->integer('template_id') ?: null, 'replacementFor' => $r->integer('replacement_for') ?: null]);
    }

    public function store(Request $r, Issuance $service): RedirectResponse
    {
        $d = $r->validate(['operation_key' => 'required|uuid', 'items' => 'required|array|min:1|max:500', 'items.*.participant_id' => 'required|integer|distinct|exists:participants,id', 'items.*.template_version_id' => 'required|integer|exists:template_versions,id', 'items.*.replacement_for' => 'nullable|integer|exists:certificates,id', 'issued_at' => 'prohibited', 'expires_at' => 'prohibited', 'identifier' => 'prohibited']);
        $batch = $service->draft($r->user(), $d['operation_key'], $d['items']);

        return redirect()->route('batches.show', $batch);
    }

    public function show(Request $r, IssuanceBatch $batch): Response
    {
        $this->authorizeBatch($r, $batch);

        return Inertia::render('BatchDetail', ['batch' => $batch->load('items.participant.student', 'items.participant.activity', 'items.certificate', 'items.version.template')]);
    }

    public function review(Request $r, IssuanceBatch $batch, BatchItem $item, Issuance $service): JsonResponse
    {
        $this->authorizeBatch($r, $batch);
        abort_unless($item->issuance_batch_id === $batch->id, 404);

        return response()->json($service->review($r->user(), $item));
    }

    public function confirm(Request $r, IssuanceBatch $batch, Issuance $service): RedirectResponse
    {
        $this->authorizeBatch($r, $batch);
        $r->validate(['issued_at' => 'prohibited', 'expires_at' => 'prohibited']);
        $service->confirm($r->user(), $batch);

        return back()->with('success', 'Emisión confirmada. La cola procesará únicamente los destinatarios del lote.');
    }

    public function retry(Request $r, IssuanceBatch $batch): RedirectResponse
    {
        $this->authorizeBatch($r, $batch);
        abort_unless($batch->confirmed_at, 422);
        foreach ($batch->items()->whereIn('status', ['pending', 'failed'])->get() as $item) {
            Access::record($r->user(), $item);
            IssueCertificate::dispatch($item->id);
        }
        Audit::log($r->user(), 'batch.retried', null, ['batch_id' => $batch->id]);

        return back()->with('success', 'Se reenviaron únicamente elementos pendientes y fallidos.');
    }
}
