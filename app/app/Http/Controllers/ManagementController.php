<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\AuditEvent;
use App\Models\Career;
use App\Models\Certificate;
use App\Models\CertificateType;
use App\Models\Student;
use App\Models\User;
use App\Services\Access;
use App\Services\Audit;
use App\Services\Context;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ManagementController extends Controller
{
    public function dashboard(Request $r): Response
    {
        $q = Certificate::visibleTo($r->user())->when($r->filled('career_id'), fn ($q) => $q->where('career_id', $r->integer('career_id')))->when($r->filled('activity_id'), fn ($q) => $q->where('activity_id', $r->integer('activity_id')))->when($r->filled('from'), fn ($q) => $q->whereDate('issued_at', '>=', $r->input('from')))->when($r->filled('to'), fn ($q) => $q->whereDate('issued_at', '<=', $r->input('to')));

        return Inertia::render('Dashboard', [...Context::choices($r->user()), 'activities' => Activity::visibleTo($r->user())->get(['id', 'name']), 'filters' => $r->only('career_id', 'activity_id', 'from', 'to'), 'stats' => ['total' => (clone $q)->count(), 'vigente' => (clone $q)->withStatus('vigente')->count(), 'vencido' => (clone $q)->withStatus('vencido')->count(), 'anulado' => (clone $q)->withStatus('anulado')->count(), 'students' => Student::visibleTo($r->user())->count(), 'activities' => Activity::visibleTo($r->user())->count()], 'recent' => (clone $q)->latest('issued_at')->limit(6)->get()]);
    }

    public function index(Request $r): Response
    {
        Access::admin($r->user());

        return Inertia::render('Administration', ['careers' => Career::orderBy('id')->get(), 'users' => User::with('career')->orderBy('name')->get(), 'types' => CertificateType::orderBy('name')->get(), 'audit' => AuditEvent::with('user:id,name')->latest('id')->paginate(25)->withQueryString()]);
    }

    public function career(Request $r, ?Career $career = null): RedirectResponse
    {
        Access::admin($r->user());
        $d = $r->validate(['name' => ['required', 'string', 'max:255', Rule::unique('careers')->ignore($career?->id)], 'code' => ['required', 'string', 'max:30', Rule::unique('careers')->ignore($career?->id)], 'active' => 'required|boolean']);

        return DB::transaction(function () use ($r, $career, $d) {
            $career?->exists ? $career->update($d) : $career = Career::create($d);
            Audit::log($r->user(), 'career.saved', $career);

            return back()->with('success', 'Carrera guardada.');
        });
    }

    public function user(Request $r, ?User $user = null): RedirectResponse
    {
        Access::admin($r->user());
        $d = $r->validate(['name' => 'required|string|max:255', 'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user?->id)], 'password' => [$user?->exists ? 'nullable' : 'required', 'string', 'min:12', 'max:255'], 'role' => 'required|in:admin,chief', 'career_id' => 'nullable|exists:careers,id', 'active' => 'required|boolean']);
        if ($d['role'] === 'chief' && empty($d['career_id'])) {
            throw ValidationException::withMessages(['career_id' => 'Seleccione la carrera del jefe.']);
        }
        if ($d['role'] === 'admin') {
            $d['career_id'] = null;
        }
        if (empty($d['password'])) {
            unset($d['password']);
        }

        return DB::transaction(function () use ($r, $user, $d) {
            $admins = User::where('role', 'admin')->where('active', true)->lockForUpdate()->get();
            if ($user?->exists && $user->isAdmin() && $user->active && ($d['role'] !== 'admin' || ! $d['active']) && $admins->count() <= 1) {
                throw ValidationException::withMessages(['role' => 'Debe permanecer al menos un administrador activo.']);
            }
            if ($user?->id === $r->user()->id && ! $d['active']) {
                throw ValidationException::withMessages(['active' => 'No puede desactivar su propia sesión.']);
            }
            $user?->exists ? $user->update($d) : $user = User::create($d);
            Audit::log($r->user(), 'user.saved', $user, ['role' => $d['role'], 'active' => $d['active']]);

            return back()->with('success', 'Cuenta personal guardada.');
        });
    }

    public function type(Request $r, ?CertificateType $type = null): RedirectResponse
    {
        Access::admin($r->user());
        $d = $r->validate(['name' => ['required', 'string', 'max:255', Rule::unique('certificate_types')->ignore($type?->id)], 'text' => 'required|string|max:3000', 'active' => 'required|boolean']);

        return DB::transaction(function () use ($r, $type, $d) {
            $type?->exists ? $type->update($d) : $type = CertificateType::create($d);
            Audit::log($r->user(), 'certificate_type.saved', $type);

            return back()->with('success', 'Tipo de certificado guardado.');
        });
    }
}
