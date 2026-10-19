<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Certificate;
use App\Models\Revocation;
use App\Services\Access;
use App\Services\Audit;
use App\Services\Context;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\Process\Process;

class CertificateController extends Controller
{
    public function index(Request $r): Response
    {
        $q = Certificate::visibleTo($r->user())->withStatus($r->input('status'))->when($r->filled('career_id'), fn ($q) => $q->where('career_id', $r->integer('career_id')))->when($r->filled('activity_id'), fn ($q) => $q->where('activity_id', $r->integer('activity_id')))->when($r->filled('from'), fn ($q) => $q->whereDate('issued_at', '>=', $r->input('from')))->when($r->filled('to'), fn ($q) => $q->whereDate('issued_at', '<=', $r->input('to')))->when($r->filled('q'), fn ($q) => $q->where(fn ($q) => $q->where('identifier', 'ilike', '%'.$r->input('q').'%')->orWhereRaw("snapshot->>'full_name' ILIKE ?", ['%'.$r->input('q').'%'])));

        return Inertia::render('Certificates', [...Context::choices($r->user()), 'activities' => Activity::visibleTo($r->user())->get(['id', 'name']), 'certificates' => $q->latest('issued_at')->paginate(20)->withQueryString(), 'filters' => $r->only('status', 'career_id', 'activity_id', 'from', 'to', 'q')]);
    }

    public function show(Request $r, Certificate $certificate): Response
    {
        Access::record($r->user(), $certificate);

        return Inertia::render('CertificateDetail', ['certificate' => $certificate->load('revocation'), 'deliveryUrl' => route('delivery', $certificate->delivery_token), 'verificationUrl' => $certificate->snapshot['verification_url']]);
    }

    private function path(Certificate $c): string
    {
        $path = Storage::disk('local')->path($c->getRawOriginal('pdf_path'));
        abort_unless(is_file($path), 404, 'Documento no disponible.');
        abort_unless(hash_equals($c->pdf_sha256, hash_file('sha256', $path)), 409, 'El documento no supera la comprobación de integridad. Contacte a Vicedecanato.');

        return $path;
    }

    public function download(Request $r, Certificate $certificate): BinaryFileResponse
    {
        Access::record($r->user(), $certificate);
        Audit::log($r->user(), 'certificate.downloaded', $certificate);

        return response()->download($this->path($certificate), $certificate->identifier.'.pdf', ['Cache-Control' => 'private, no-store']);
    }

    public function revoke(Request $r, Certificate $certificate): RedirectResponse
    {
        Access::admin($r->user());
        $d = $r->validate(['reason' => 'required|string|min:10|max:3000']);
        DB::transaction(function () use ($r, $certificate, $d) {
            Certificate::lockForUpdate()->findOrFail($certificate->id);
            abort_if($certificate->revocation()->exists(), 422, 'El certificado ya está anulado.');
            Revocation::create(['certificate_id' => $certificate->id, 'user_id' => $r->user()->id, 'reason' => $d['reason']]);
            Audit::log($r->user(), 'certificate.revoked', $certificate, ['reason' => $d['reason']]);
        });

        return back()->with('success', 'Certificado anulado. Su verificación permanece disponible.');
    }

    public function bundle(Request $r): BinaryFileResponse
    {
        $d = $r->validate(['ids' => 'required|array|min:1|max:200', 'ids.*' => 'required|integer|distinct', 'format' => 'required|in:zip,pdf']);
        $certs = Certificate::visibleTo($r->user())->whereIn('id', $d['ids'])->get();
        abort_unless($certs->count() === count($d['ids']), 403);
        Storage::disk('local')->makeDirectory('exports');
        $target = Storage::disk('local')->path('exports/'.Str::uuid().'.'.$d['format']);
        $paths = [];
        foreach ($certs as $c) {
            $paths[] = $this->path($c);
        }
        if ($d['format'] === 'zip') {
            $zip = new \ZipArchive;
            $zip->open($target, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
            foreach ($certs as $i => $c) {
                $zip->addFile($paths[$i], $c->identifier.'.pdf');
            } $zip->close();
        } else {
            $p = new Process([config('certificates.node'), base_path('scripts/combine-pdf.mjs')], base_path());
            $p->setInput(json_encode(['paths' => $paths, 'output' => $target]));
            $p->setTimeout(90);
            $p->mustRun();
        }
        Audit::log($r->user(), 'certificates.exported', null, ['ids' => $d['ids'], 'format' => $d['format']]);

        return response()->download($target, 'certificados.'.$d['format'])->deleteFileAfterSend(true);
    }

    public function verify(?string $token = null): Response
    {
        if (! $token) {
            return Inertia::render('Verify', ['certificate' => null]);
        }
        abort_unless(preg_match('/^[a-f0-9]{64}$/D', $token), 404);
        $c = Certificate::where('public_token', $token)->firstOrFail();

        return Inertia::render('Verify', ['certificate' => ['issuer' => $c->snapshot['issuer'], 'recipient' => $c->snapshot['full_name'], 'activity' => $c->snapshot['activity'], 'type' => $c->snapshot['certificate_type'], 'career' => $c->snapshot['career'], 'identifier' => $c->identifier, 'issued_at' => $c->issued_at->toIso8601String(), 'expires_at' => $c->expires_at->toIso8601String(), 'status' => $c->status]]);
    }

    public function delivery(string $token): BinaryFileResponse
    {
        abort_unless(preg_match('/^[a-f0-9]{64}$/D', $token), 404);
        $c = Certificate::where('delivery_token', $token)->firstOrFail();

        return response()->download($this->path($c), $c->identifier.'.pdf', ['Cache-Control' => 'private, no-store', 'Referrer-Policy' => 'no-referrer']);
    }
}
