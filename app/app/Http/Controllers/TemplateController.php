<?php

namespace App\Http\Controllers;

use App\Models\Career;
use App\Models\CertificateTemplate;
use App\Models\GraphicAsset;
use App\Models\TemplateVersion;
use App\Services\Access;
use App\Services\Audit;
use App\Services\Context;
use App\Services\InstitutionalDesign;
use App\Services\PdfRenderer;
use App\Services\TemplateDesign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TemplateController extends Controller
{
    public function index(Request $r): Response
    {
        $filters = $r->validate(['q' => 'nullable|string|max:255', 'career_id' => 'nullable|integer', 'state' => 'nullable|in:active,inactive,all']);
        $templates = CertificateTemplate::visibleTo($r->user())->with('latestVersion')
            ->when($r->filled('q'), fn ($q) => $q->where('name', 'ilike', '%'.$r->string('q').'%'))
            ->when($r->integer('career_id'), fn ($q) => $q->where('career_id', $r->integer('career_id')))
            ->when($r->input('state', 'active') !== 'all', fn ($q) => $q->where('active', $r->input('state', 'active') === 'active'));

        return Inertia::render('Templates', [...Context::choices($r->user()), 'templates' => $templates->orderBy('name')->paginate(18)->withQueryString(), 'filters' => $filters]);
    }

    public function preview(Request $r, CertificateTemplate $template, TemplateDesign $designer, PdfRenderer $renderer): JsonResponse
    {
        Access::record($r->user(), $template, true);
        $version = $template->latestVersion;
        if ($r->isMethod('post')) {
            $d = $r->validate(['width_mm' => 'required|numeric|min:100|max:600', 'height_mm' => 'required|numeric|min:100|max:600', 'design' => 'required|array', 'design.objects' => 'present|array|max:250']);
            $version = new TemplateVersion(['width_mm' => $d['width_mm'], 'height_mm' => $d['height_mm'], 'design' => $designer->clean($d['design'], $r->user(), $template->career_id)]);
        }

        return response()->json($renderer->render($version, InstitutionalDesign::previewData(Career::find($template->career_id)?->name ?? 'Nombre de la carrera')));
    }

    public function store(Request $r): RedirectResponse
    {
        $d = $r->validate(['name' => 'required|string|max:255', 'career_id' => 'nullable|exists:careers,id', 'width_mm' => 'required|numeric|min:100|max:600', 'height_mm' => 'required|numeric|min:100|max:600']);
        Access::career($r->user(), $d['career_id'] ?? null);
        $t = DB::transaction(function () use ($r, $d) {
            $t = CertificateTemplate::create(['name' => $d['name'], 'career_id' => $d['career_id'] ?? null]);
            $design = ['version' => '7.0.0', 'objects' => [], 'background' => '#ffffff'];
            $t->versions()->create(['user_id' => $r->user()->id, 'number' => 1, 'width_mm' => $d['width_mm'], 'height_mm' => $d['height_mm'], 'design' => $design, 'checksum' => hash('sha256', json_encode($design))]);
            Audit::log($r->user(), 'template.created', $t);

            return $t;
        });

        return redirect()->route('templates.edit', $t);
    }

    public function edit(Request $r, CertificateTemplate $template): Response
    {
        Access::record($r->user(), $template, true);

        return Inertia::render('Editor', ['template' => $template, 'version' => $template->latestVersion, 'versions' => $template->versions()->latest('number')->get(['id', 'number', 'created_at']), 'assets' => GraphicAsset::visibleTo($r->user())->where(fn ($q) => $q->whereNull('career_id')->orWhere('career_id', $template->career_id))->get(), 'fields' => TemplateDesign::FIELDS, 'editable' => $r->user()->isAdmin() || (int) $template->career_id === (int) $r->user()->career_id]);
    }

    public function save(Request $r, CertificateTemplate $template, TemplateDesign $designer): JsonResponse
    {
        Access::record($r->user(), $template);
        $d = $r->validate(['expected_version' => 'required|integer', 'width_mm' => 'required|numeric|min:100|max:600', 'height_mm' => 'required|numeric|min:100|max:600', 'design' => 'required|array', 'design.objects' => 'present|array|max:250', 'name' => 'nullable|string|max:255', 'active' => 'sometimes|boolean']);
        $clean = $designer->clean($d['design'], $r->user(), $template->career_id);

        return DB::transaction(function () use ($r, $template, $d, $clean) {
            CertificateTemplate::lockForUpdate()->findOrFail($template->id);
            $latest = $template->versions()->max('number');
            abort_unless((int) $d['expected_version'] === (int) $latest, 409, 'La plantilla cambió en otra ventana. Recargue antes de guardar.');
            if (! empty($d['name'])) {
                $template->update(['name' => $d['name']]);
            }
            if (array_key_exists('active', $d)) {
                $template->update(['active' => $d['active']]);
            }
            if ($template->wasChanged()) {
                Audit::log($r->user(), 'template.metadata_saved', $template);
            }
            $checksum = hash('sha256', json_encode([$clean, $d['width_mm'], $d['height_mm']]));
            if ($template->latestVersion?->checksum === $checksum) {
                return response()->json(['version' => $template->latestVersion]);
            }
            $v = $template->versions()->create(['user_id' => $r->user()->id, 'number' => $latest + 1, 'width_mm' => $d['width_mm'], 'height_mm' => $d['height_mm'], 'design' => $clean, 'checksum' => $checksum]);
            Audit::log($r->user(), 'template.version_saved', $template, ['version' => $v->number]);

            return response()->json(['version' => $v]);
        });
    }

    public function version(Request $r, CertificateTemplate $template, TemplateVersion $version): JsonResponse
    {
        Access::record($r->user(), $template, true);
        abort_unless($version->certificate_template_id === $template->id, 404);

        return response()->json($version);
    }

    public function duplicate(Request $r, CertificateTemplate $template): RedirectResponse
    {
        Access::record($r->user(), $template, true);
        $copy = DB::transaction(function () use ($r, $template) {
            $copy = CertificateTemplate::create(['name' => $template->name.' · copia', 'career_id' => $r->user()->isAdmin() ? $template->career_id : $r->user()->career_id]);
            $v = $template->latestVersion;
            $copy->versions()->create(['number' => 1, 'user_id' => $r->user()->id, 'width_mm' => $v->width_mm, 'height_mm' => $v->height_mm, 'design' => $v->design, 'checksum' => $v->checksum]);
            Audit::log($r->user(), 'template.duplicated', $copy);

            return $copy;
        });

        return redirect()->route('templates.edit', $copy);
    }
}
