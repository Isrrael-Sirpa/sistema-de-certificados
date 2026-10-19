<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Participant;
use App\Models\Student;
use App\Services\Access;
use App\Services\Audit;
use App\Services\Context;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    public function index(Request $r): Response
    {
        return Inertia::render('Activities', [...Context::choices($r->user()), 'activities' => Activity::visibleTo($r->user())->with('career', 'certificateType')->withCount('participants')->latest('id')->paginate(20)]);
    }

    public function save(Request $r, ?Activity $activity = null): RedirectResponse
    {
        if ($activity?->exists) {
            Access::record($r->user(), $activity);
        }
        $d = $r->validate(['career_id' => 'required|exists:careers,id', 'name' => 'required|string|max:255', 'kind' => 'required|string|max:80', 'description' => 'nullable|string|max:5000', 'starts_on' => 'required|date', 'ends_on' => 'required|date|after_or_equal:starts_on', 'hours' => 'nullable|numeric|min:0|max:100000', 'certificate_type_id' => 'required|exists:certificate_types,id']);
        Access::career($r->user(), $d['career_id']);
        if ($activity?->exists) {
            abort_unless((int) $activity->career_id === (int) $d['career_id'], 422, 'La carrera de una actividad no puede reasignarse.');
        }
        DB::transaction(function () use ($r, $activity, $d) {
            $activity?->exists ? $activity->update($d) : $activity = Activity::create($d);
            Audit::log($r->user(), 'activity.saved', $activity);
        });

        return back()->with('success', 'Actividad guardada.');
    }

    public function show(Request $r, Activity $activity): Response
    {
        Access::record($r->user(), $activity);

        return Inertia::render('ActivityDetail', ['activity' => $activity->load('career', 'certificateType'), 'participants' => $activity->participants()->with('student')->orderBy('id')->get(), 'students' => Student::visibleTo($r->user())->whereHas('careers', fn ($q) => $q->where('careers.id', $activity->career_id))->when($r->filled('q'), fn ($q) => $q->where(fn ($q) => $q->where('ci', 'ilike', '%'.$r->input('q').'%')->orWhereRaw("concat(first_names,' ',last_names) ILIKE ?", ['%'.$r->input('q').'%'])))->orderBy('last_names')->limit(100)->get(), 'q' => $r->input('q', '')]);
    }

    public function participant(Request $r, Activity $activity): RedirectResponse
    {
        Access::record($r->user(), $activity);
        $d = $r->validate(['student_ids' => 'required|array|min:1|max:5000', 'student_ids.*' => 'required|integer|distinct', 'condition' => 'nullable|string|max:255', 'group_name' => 'nullable|string|max:100']);
        DB::transaction(function () use ($r, $activity, $d) {
            foreach ($d['student_ids'] as $id) {
                $s = Student::visibleTo($r->user())->whereHas('careers', fn ($q) => $q->where('careers.id', $activity->career_id))->findOrFail($id);
                Participant::updateOrCreate(['activity_id' => $activity->id, 'student_id' => $s->id], ['condition' => $d['condition'] ?? null, 'group_name' => $d['group_name'] ?? null]);
            }
            Audit::log($r->user(), 'activity.participants', $activity, ['count' => count($d['student_ids'])]);
        });

        return back()->with('success', 'Participantes y condición registrados. La emisión requiere selección posterior.');
    }

    public function remove(Request $r, Activity $activity, Participant $participant): RedirectResponse
    {
        Access::record($r->user(), $activity);
        abort_unless($participant->activity_id === $activity->id, 404);
        abort_if($participant->newQuery()->whereKey($participant->id)->whereExists(fn ($q) => $q->selectRaw('1')->from('batch_items')->whereColumn('batch_items.participant_id', 'participants.id'))->exists(), 422, 'Este participante tiene una operación de emisión registrada; conserve su trazabilidad.');
        DB::transaction(function () use ($r, $activity, $participant) {
            $participant->delete();
            Audit::log($r->user(), 'activity.participant_removed', $activity);
        });

        return back()->with('success', 'Participante excluido.');
    }
}
