<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentImport;
use App\Services\Access;
use App\Services\Audit;
use App\Services\Context;
use App\Services\StudentRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    public function index(Request $r): Response
    {
        $q = trim((string) $r->input('q'));

        return Inertia::render('Students', [...Context::choices($r->user()), 'filters' => ['q' => $q], 'students' => Student::visibleTo($r->user())->when($q, fn ($b) => $b->where(fn ($b) => $b->where('normalized_ci', 'ilike', '%'.StudentRegistry::normalizeCi($q).'%')->orWhereRaw("concat(first_names, ' ', last_names) ILIKE ?", ['%'.$q.'%'])))->orderBy('last_names')->paginate(20)->withQueryString()]);
    }

    public function show(Request $r, Student $student): Response
    {
        abort_unless(Student::visibleTo($r->user())->whereKey($student->id)->exists(), 404);

        return Inertia::render('StudentDetail', ['student' => $student->load(['careers' => fn ($q) => $q->when(! $r->user()->isAdmin(), fn ($q) => $q->where('careers.id', $r->user()->career_id))]), 'editable' => $r->user()->isAdmin() || $student->careers()->count() === 1, 'filters' => $r->only('status'), 'certificates' => $student->certificates()->visibleTo($r->user())->withStatus($r->input('status'))->latest('issued_at')->paginate(20)->withQueryString(), 'total' => $student->certificates()->visibleTo($r->user())->count()]);
    }

    public function store(Request $r, StudentRegistry $registry): RedirectResponse
    {
        $d = $r->validate(['ci' => 'required|string|max:60', 'first_names' => 'required|string|max:255', 'last_names' => 'required|string|max:255', 'career_id' => 'required|exists:careers,id']);
        [$student,$created] = $registry->register($r->user(), (int) $d['career_id'], $d);

        return redirect()->route('students.show', $student)->with('success', $created ? 'Estudiante registrado.' : 'Estudiante existente reutilizado sin sobrescribir sus datos.');
    }

    public function update(Request $r, Student $student): RedirectResponse
    {
        abort_unless(Student::visibleTo($r->user())->whereKey($student->id)->exists(), 404);
        abort_unless($r->user()->isAdmin() || $student->careers()->count() === 1, 403, 'La identidad compartida debe corregirse desde Vicedecanato.');
        $d = $r->validate(['ci' => 'required|string|max:60', 'first_names' => 'required|string|max:255', 'last_names' => 'required|string|max:255']);
        $d['normalized_ci'] = StudentRegistry::normalizeCi($d['ci']);
        Validator::make($d, ['normalized_ci' => [Rule::unique('students')->ignore($student->id)]])->validate();
        DB::transaction(function () use ($r, $student, $d) {
            $student->update($d);
            Audit::log($r->user(), 'student.updated', $student);
        });

        return back()->with('success', 'Datos actualizados. Los certificados emitidos conservan sus datos originales.');
    }

    public function excelTemplate(): StreamedResponse
    {
        $sheet = new Spreadsheet;
        $s = $sheet->getActiveSheet();
        $s->fromArray([['CI', 'nombres', 'apellidos']]);
        $s->getStyle('A:A')->getNumberFormat()->setFormatCode('@');
        foreach (['A', 'B', 'C'] as $col) {
            $s->getColumnDimension($col)->setWidth(30);
        } $s->getStyle('A1:C1')->getFont()->setBold(true);
        $s->getComment('A1')->getText()->createTextRun('Texto obligatorio. Conservar ceros iniciales, complementos y guiones. Una fila por persona; máximo 5000.');
        $s->freezePane('A2');

        return response()->streamDownload(function () use ($sheet) {
            (new Xlsx($sheet))->save('php://output');
        }, 'plantilla-estudiantes.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    public function importPreview(Request $r, StudentRegistry $registry): RedirectResponse
    {
        $d = $r->validate(['career_id' => 'required|exists:careers,id', 'file' => 'required|file|mimes:xlsx|max:5120']);
        Access::career($r->user(), $d['career_id']);
        $path = $r->file('file')->getRealPath();
        $zip = new \ZipArchive;
        abort_unless($zip->open($path) === true, 422, 'Archivo Excel no válido.');
        $size = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $size += $stat['size'];
        } $zip->close();
        abort_if($size > 50 * 1024 * 1024, 422, 'El archivo descomprimido excede el límite permitido.');
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(false);
        $info = $reader->listWorksheetInfo($path);
        abort_if(($info[0]['totalRows'] ?? 0) > 5001, 422, 'Máximo 5000 estudiantes.');
        $s = $reader->load($path)->getSheet(0);
        abort_unless(array_map(fn ($v) => mb_strtolower(trim((string) $v)), $s->rangeToArray('A1:C1')[0]) === ['ci', 'nombres', 'apellidos'], 422, 'Encabezados requeridos: CI, nombres, apellidos.');
        $rows = [];
        $seen = [];
        for ($n = 2; $n <= $s->getHighestDataRow(); $n++) {
            $values = [];
            $error = null;
            foreach (['A', 'B', 'C'] as $col) {
                $cell = $s->getCell($col.$n);
                if ($cell->getDataType() === DataType::TYPE_FORMULA) {
                    $error = 'No se permiten fórmulas.';
                } $values[] = trim((string) $cell->getFormattedValue());
            }
            if (implode('', $values) === '') {
                continue;
            }
            $row = ['ci' => $values[0], 'first_names' => $values[1], 'last_names' => $values[2]];
            $v = Validator::make($row, ['ci' => 'required|string|max:60', 'first_names' => 'required|string|max:255', 'last_names' => 'required|string|max:255']);
            $normalized = StudentRegistry::normalizeCi($row['ci']);
            if ($v->fails()) {
                $error = implode(' ', $v->errors()->all());
            }
            if (isset($seen[$normalized])) {
                $status = ['status' => 'duplicate', 'message' => 'CI repetido dentro del archivo; se omitirá esta fila.'];
            } elseif ($error) {
                $status = ['status' => 'error', 'message' => $error];
            } else {
                $status = $registry->inspect($r->user(), $row);
            }
            $seen[$normalized] = true;
            $rows[] = [...$row, 'row' => $n, ...$status];
        }
        $import = StudentImport::create(['user_id' => $r->user()->id, 'career_id' => $d['career_id'], 'rows' => $rows]);
        Audit::log($r->user(), 'import.preview', $import, ['rows' => count($rows)]);

        return redirect()->route('imports.show', $import);
    }

    public function importShow(Request $r, StudentImport $import): Response
    {
        Access::record($r->user(), $import);
        abort_unless($r->user()->isAdmin() || $import->user_id === $r->user()->id, 403);

        return Inertia::render('ImportReview', ['import' => $import]);
    }

    public function importConfirm(Request $r, StudentImport $import, StudentRegistry $registry): RedirectResponse
    {
        Access::record($r->user(), $import);
        abort_unless($r->user()->isAdmin() || $import->user_id === $r->user()->id, 403);
        DB::transaction(function () use ($r, $import, $registry) {
            $import = StudentImport::lockForUpdate()->findOrFail($import->id);
            if ($import->confirmed_at) {
                return;
            }
            $result = ['new' => 0, 'existing' => 0, 'skipped' => 0, 'errors' => 0, 'rows' => []];
            foreach ($import->rows as $row) {
                if (! in_array($row['status'], ['new', 'existing'])) {
                    $result[$row['status'] === 'duplicate' ? 'skipped' : 'errors']++;
                    $result['rows'][] = $row;

                    continue;
                }
                try {
                    [$s,$created] = $registry->register($r->user(), $import->career_id, $row);
                    $result[$created ? 'new' : 'existing']++;
                    $result['rows'][] = [...$row, 'status' => $created ? 'new' : 'existing', 'message' => 'Importado correctamente.'];
                } catch (ValidationException $e) {
                    $result['errors']++;
                    $result['rows'][] = [...$row, 'status' => 'error', 'message' => implode(' ', array_merge(...array_values($e->errors())))];
                }
            }
            $import->update(['confirmed_at' => now(), 'result' => $result]);
            Audit::log($r->user(), 'import.confirmed', $import, Arr::except($result, 'rows'));
        });

        return back()->with('success', 'Importación confirmada. No se emitieron certificados.');
    }
}
