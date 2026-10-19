<?php

namespace App\Console\Commands;

use App\Models\Activity;
use App\Models\Career;
use App\Models\Certificate;
use App\Models\CertificateTemplate;
use App\Models\CertificateType;
use App\Models\GraphicAsset;
use App\Models\Participant;
use App\Models\Revocation;
use App\Models\User;
use App\Services\Audit;
use App\Services\DemonstrationDesign;
use App\Services\Issuance;
use App\Services\StudentRegistry;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class LoadDemonstration extends Command
{
    protected $signature = 'certificates:demo';

    protected $description = 'Cargar explícitamente datos ficticios solo en un entorno QA aislado';

    public function handle(StudentRegistry $registry, Issuance $service): int
    {
        $db = config('database.connections.pgsql.database');
        if (! config('certificates.demo_allowed') || ! app()->environment(['qa', 'testing']) || ! str_ends_with($db, '_qa')) {
            $this->error('Solo se permite con APP_ENV=qa, DEMO_ALLOWED=true y una base PostgreSQL terminada en _qa.');

            return self::FAILURE;
        }

        $password = 'Demo-UMSA-2026!';
        $admin = User::firstOrCreate(['email' => 'supervision.demo@example.test'], ['name' => 'Lucía Ejemplo · Vicedecanato ficticio', 'password' => $password, 'role' => 'admin', 'active' => true]);
        $type = CertificateType::firstOrCreate(['name' => 'Participación (ejemplo configurable)'], ['text' => 'Por su participación en la actividad de formación que se detalla a continuación.', 'active' => true]);
        $careers = [];
        $activities = [];
        $participants = [];
        $versions = [];
        for ($n = 1; $n <= 9; $n++) {
            $career = Career::firstOrCreate(['code' => 'DEMO-'.str_pad((string) $n, 2, '0', STR_PAD_LEFT)], ['name' => 'Carrera ficticia '.str_pad((string) $n, 2, '0', STR_PAD_LEFT)]);
            $careers[] = $career;
            User::firstOrCreate(['email' => 'jefatura'.str_pad((string) $n, 2, '0', STR_PAD_LEFT).'@example.test'], ['name' => 'Responsable personal de ejemplo '.$n, 'password' => $password, 'role' => 'chief', 'career_id' => $career->id, 'active' => true]);
            $a = Activity::firstOrCreate(['career_id' => $career->id, 'name' => 'Seminario ficticio de actualización '.$n], ['kind' => 'Seminario', 'description' => 'Actividad ficticia para supervisión y QA.', 'starts_on' => '2026-09-10', 'ends_on' => '2026-09-12', 'hours' => 24, 'certificate_type_id' => $type->id]);
            $activities[] = $a;
            $t = CertificateTemplate::firstOrCreate(['career_id' => $career->id, 'name' => 'Diseño institucional de ejemplo '.$n]);
            $portrait = $n % 2 === 0;
            $w = $portrait ? 210 : 297;
            $h = $portrait ? 297 : 210;
            $design = DemonstrationDesign::make($w * 96 / 25.4, $h * 96 / 25.4);
            $versions[] = $t->versions()->firstOrCreate(['number' => 1], ['user_id' => $admin->id, 'width_mm' => $w, 'height_mm' => $h, 'design' => $design, 'checksum' => hash('sha256', json_encode($design))]);
            for ($s = 1; $s <= ($n === 1 ? 30 : 4); $s++) {
                $ci = ($s === 1) ? '0001234-A' : str_pad((string) (100000 * $n + $s), 8, '0', STR_PAD_LEFT);
                $first = $s === 1 ? 'María José' : ($s === 2 ? 'Ángel Sebastián Maximiliano de los Ángeles' : 'Estudiante ficticio '.$s);
                $last = $s === 1 ? 'Muñoz Peña' : ($s === 2 ? 'Ñúñez Villarroel Fernández del Río' : 'Apellido de ejemplo '.$n);
                if ($s === 1) {
                    $last = 'Muñoz Peña';
                }
                [$student] = $registry->register($admin, $career->id, ['ci' => $ci, 'first_names' => $first, 'last_names' => $last]);
                $p = Participant::firstOrCreate(['activity_id' => $a->id, 'student_id' => $student->id], ['condition' => $s === 30 ? null : 'Participó', 'group_name' => $s <= 20 ? 'Grupo seleccionado' : 'Grupo excluido']);
                if ($n === 1) {
                    $participants[] = $p;
                }
            }
        }
        Storage::disk('local')->makeDirectory('fixtures');
        $sheet = new Spreadsheet;
        $s = $sheet->getActiveSheet();
        $s->fromArray([['CI', 'nombres', 'apellidos'], ['0001234-A', 'María José', 'Muñoz Peña'], ['0001234-A', 'Nombre repetido', 'Fila duplicada'], ['00100002', 'Nombre discrepante', 'Revisar manualmente'], ['00999999-B', 'Nueva persona ficticia', 'Álvarez Ñúñez'], ['', 'Fila sin CI', 'Error controlado']]);
        $s->getStyle('A:A')->getNumberFormat()->setFormatCode('@');
        for ($row = 2; $row <= 6; $row++) {
            $s->setCellValueExplicit('A'.$row, (string) $s->getCell('A'.$row)->getValue(), DataType::TYPE_STRING);
        }(new Xlsx($sheet))->save(Storage::disk('local')->path('fixtures/importacion-demo.xlsx'));
        $image = imagecreatetruecolor(1600, 1120);
        $white = imagecolorallocate($image, 248, 251, 251);
        $teal = imagecolorallocate($image, 181, 211, 210);
        imagefill($image, 0, 0, $white);
        imagerectangle($image, 50, 50, 1550, 1070, $teal);
        imagestring($image, 5, 80, 80, 'FONDO FICTICIO PARA DEMOSTRACION', $teal);
        Storage::disk('local')->makeDirectory('assets');
        $assetPath = 'assets/fondo-demo.png';
        imagepng($image, Storage::disk('local')->path($assetPath));
        imagedestroy($image);
        $asset = GraphicAsset::firstOrCreate(['name' => 'Fondo ficticio de demostración'], ['user_id' => $admin->id, 'career_id' => null, 'kind' => 'background', 'path' => $assetPath, 'mime' => 'image/png', 'width' => 1600, 'height' => 1120]);
        $global = CertificateTemplate::firstOrCreate(['name' => 'Diseño desde imagen de fondo (ficticio)', 'career_id' => null]);
        $design = DemonstrationDesign::make();
        array_unshift($design['objects'], ['type' => 'Image', 'left' => 0, 'top' => 0, 'width' => 1600, 'height' => 1120, 'scaleX' => 1122.52 / 1600, 'scaleY' => 793.7 / 1120, 'assetId' => $asset->id, 'src' => route('assets.file', $asset, false), 'lockMovementX' => true, 'lockMovementY' => true]);
        $global->versions()->firstOrCreate(['number' => 1], ['user_id' => $admin->id, 'width_mm' => 297, 'height_mm' => 210, 'design' => $design, 'checksum' => hash('sha256', json_encode($design))]);
        $this->info('Módulos y datos principales cargados. Generando certificados reales de ejemplo…');
        foreach ([['time' => null, 'p' => $participants[0], 'v' => $versions[0]], ['time' => '2020-02-29 10:00:00', 'p' => $participants[1], 'v' => $versions[0]], ['time' => null, 'p' => $participants[2], 'v' => $versions[0]], ['time' => null, 'p' => $activities[1]->participants()->first(), 'v' => $versions[1]], ['time' => null, 'p' => $participants[3], 'v' => $global->latestVersion]] as $index => $fixture) {
            try {
                if ($fixture['time']) {
                    CarbonImmutable::setTestNow(CarbonImmutable::parse($fixture['time'], 'America/La_Paz'));
                }
                $b = $service->draft($admin, sprintf('b0000000-0000-4000-8000-%012d', $index + 1), [['participant_id' => $fixture['p']->id, 'template_version_id' => $fixture['v']->id]]);
                $item = $b->items()->first();
                if (! $b->confirmed_at) {
                    $service->review($admin, $item);
                    config(['queue.default' => 'database']);
                    $service->confirm($admin, $b);
                }$service->issue($item->id);
                $c = Certificate::where('batch_item_id', $item->id)->first();
                if (! $c) {
                    throw new \RuntimeException('El PDF de ejemplo no pudo emitirse. Revise el lote '.$b->id);
                }
                if ($index === 2) {
                    Revocation::firstOrCreate(['certificate_id' => $c->id], ['user_id' => $admin->id, 'reason' => 'Anulación ficticia para comprobar estado y trazabilidad.']);
                }
            } finally {
                CarbonImmutable::setTestNow();
            }
        }
        $draft = $service->draft($admin, 'b0000000-0000-4000-8000-000000000020', array_map(fn ($p) => ['participant_id' => $p->id, 'template_version_id' => $versions[0]->id], array_slice($participants, 0, 20)));
        $failure = $service->draft($admin, 'b0000000-0000-4000-8000-000000000021', [['participant_id' => $participants[29]->id, 'template_version_id' => $versions[0]->id]]);
        $review = $service->review($admin, $failure->items()->first());
        $failure->items()->first()->update(['status' => 'failed', 'error' => 'Fallo controlado de demostración: condición acreditada ausente. Corregir participante y volver a revisar.']);
        Audit::log($admin, 'demo.loaded', null, ['careers' => 9, 'draft_twenty_of_thirty' => $draft->id]);
        $this->info('Demostración lista. 9 carreras ficticias, 10 cuentas personales, certificados reales vigentes/vencidos/anulados, lote de 20 entre 30 y error controlado.');
        $this->line('Cuenta QA: supervision.demo@example.test · contraseña documentada en docs/QA.md. Nunca usar estas credenciales en producción.');

        return self::SUCCESS;
    }
}
