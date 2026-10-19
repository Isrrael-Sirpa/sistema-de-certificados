<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Career;
use App\Models\Certificate;
use App\Models\CertificateTemplate;
use App\Models\CertificateType;
use App\Models\GraphicAsset;
use App\Models\Participant;
use App\Models\Student;
use App\Models\User;
use App\Services\Audit;
use App\Services\DemonstrationDesign;
use App\Services\DemonstrationRetirement;
use App\Services\InstitutionalSetup;
use App\Services\Issuance;
use App\Services\StudentRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class InstitutionalRedesignTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase(): void
    {
        if (config('database.default') !== 'pgsql' || ! str_ends_with(config('database.connections.pgsql.database'), '_test')) {
            throw new \RuntimeException('Estas pruebas solo pueden usar PostgreSQL exclusivo _test.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('local');
        Queue::fake();
    }

    public function test_catalog_installation_is_exact_idempotent_and_preserves_edits_without_creating_people(): void
    {
        $career = Career::create(['name' => 'Aeronáutica', 'code' => 'EXISTENTE']);
        $first = app(InstitutionalSetup::class)->install();
        $this->assertSame($career->id, $first[0]['career_id']);
        $this->assertDatabaseCount('careers', 9);
        $this->assertDatabaseCount('certificate_templates', 9);
        $this->assertDatabaseCount('template_versions', 9);
        $this->assertDatabaseCount('graphic_assets', 2);
        foreach (['users', 'students', 'activities', 'certificates', 'certificate_types'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
        $template = CertificateTemplate::findOrFail($first[0]['template_id']);
        $version = $template->latestVersion;
        $design = $version->design;
        $design['objects'][3]['left'] = 91;
        $template->versions()->create(['number' => 2, 'user_id' => null, 'width_mm' => 297, 'height_mm' => 210, 'design' => $design, 'checksum' => hash('sha256', json_encode($design))]);
        $template->update(['name' => 'Nombre editado por administración', 'active' => false]);
        $career->update(['name' => 'Nombre institucional revisado']);
        $second = app(InstitutionalSetup::class)->install();
        $this->assertSame($first[0]['template_id'], $second[0]['template_id']);
        $this->assertSame($design, $template->fresh()->latestVersion->design);
        $this->assertDatabaseHas('certificate_templates', ['id' => $template->id, 'name' => 'Nombre editado por administración', 'active' => false]);
        $this->assertDatabaseCount('careers', 9);
        $this->assertDatabaseCount('certificate_templates', 9);
        $this->assertDatabaseCount('template_versions', 10);
    }

    public function test_template_library_editor_versions_and_resources_respect_both_roles(): void
    {
        $catalog = app(InstitutionalSetup::class)->install();
        $admin = User::factory()->create(['role' => 'admin', 'career_id' => null]);
        $chief = User::factory()->create(['role' => 'chief', 'career_id' => $catalog[0]['career_id']]);
        $other = User::factory()->create(['role' => 'chief', 'career_id' => $catalog[1]['career_id']]);
        $this->actingAs($admin)->get('/plantillas')->assertInertia(fn (Assert $p) => $p->has('templates.data', 9));
        $this->actingAs($chief)->get('/plantillas')->assertInertia(fn (Assert $p) => $p->has('templates.data', 1)->where('auth.user.career.name', 'Aeronáutica'));
        $this->get('/plantillas/'.$catalog[1]['template_id'].'/editor')->assertForbidden();
        $this->get('/plantillas/'.$catalog[1]['template_id'].'/previsualizar')->assertForbidden();
        $template = CertificateTemplate::findOrFail($catalog[0]['template_id']);
        $version = $template->latestVersion;
        $this->get('/plantillas/'.$template->id.'/editor')->assertOk();
        $this->postJson('/plantillas/'.$template->id.'/guardar', ['expected_version' => 1, 'width_mm' => 297, 'height_mm' => 210, 'design' => $version->design])->assertOk();
        $saved = $template->fresh()->latestVersion;
        $this->assertSame(['signature', 'stamp'], array_values(array_filter(array_column($saved->design['objects'], 'resourceSlot'))));
        $this->assertContains('qr', array_column($saved->design['objects'], 'field'));
        $this->post('/plantillas/'.$template->id.'/duplicar')->assertRedirect();
        $this->assertDatabaseCount('certificate_templates', 10);
        $this->assertEquals($saved->design, CertificateTemplate::latest('id')->first()->latestVersion->design);
        $asset = GraphicAsset::first();
        $this->get('/recursos/'.$asset->id.'/archivo')->assertOk();
        Storage::disk('local')->put('private-signature.png', 'test');
        $signature = GraphicAsset::create(['name' => 'Archivo autorizado de otra carrera', 'kind' => 'signature', 'career_id' => $other->career_id, 'user_id' => $other->id, 'path' => 'private-signature.png', 'mime' => 'image/png', 'width' => 100, 'height' => 50]);
        $this->get('/recursos/'.$signature->id.'/archivo')->assertForbidden();
        $this->postJson('/plantillas/'.$template->id.'/guardar', ['expected_version' => $saved->number, 'width_mm' => 297, 'height_mm' => 210, 'design' => ['objects' => [['type' => 'Image', 'assetId' => $signature->id]]]])->assertForbidden();
    }

    public function test_nine_templates_render_real_pdf_and_qr_with_long_names_and_required_resource_guards(): void
    {
        $catalog = app(InstitutionalSetup::class)->install();
        $admin = User::factory()->create(['role' => 'admin', 'career_id' => null]);
        $type = CertificateType::create(['name' => 'CERTIFICADO', 'text' => 'Se reconoce la condición registrada en la siguiente actividad académica.']);
        $service = app(Issuance::class);
        $inventory = [];
        $output = base_path('../.runtime/redesign-validation');
        if (! is_dir($output)) {
            mkdir($output, 0700, true);
        }
        foreach ($catalog as $index => $entry) {
            $a = Activity::create(['career_id' => $entry['career_id'], 'name' => 'Actualización tecnológica e investigación aplicada: instrumentación, innovación y gestión de proyectos para el desarrollo sostenible', 'kind' => 'Prueba técnica aislada', 'starts_on' => '2026-10-01', 'ends_on' => '2026-10-18', 'hours' => $index % 2 === 0 ? null : 40, 'certificate_type_id' => $type->id]);
            [$s] = app(StudentRegistry::class)->register($admin, $entry['career_id'], ['ci' => 'TEST-REDESIGN-'.$index, 'first_names' => 'María José Ángeles Sebastián Maximiliano', 'last_names' => 'Muñoz Ñúñez Villarroel Fernández del Río']);
            $p = Participant::create(['activity_id' => $a->id, 'student_id' => $s->id, 'condition' => 'Condición consignada para la prueba técnica']);
            $template = CertificateTemplate::findOrFail($entry['template_id']);
            $original = $template->latestVersion;
            if ($index === 0) {
                $blocked = $service->draft($admin, (string) Str::uuid(), [['participant_id' => $p->id, 'template_version_id' => $original->id]]);
                $review = $service->review($admin, $blocked->items()->first());
                $this->assertCount(2, array_filter($review['issues'], fn ($i) => str_contains($i['message'], 'recurso obligatorio')));
                try {
                    $service->confirm($admin, $blocked->fresh());
                    $this->fail('Permitió emitir sin recursos obligatorios.');
                } catch (HttpException $e) {
                    $this->assertSame(422, $e->getStatusCode());
                }
                $this->assertDatabaseCount('certificates', 0);
            }
            $design = $original->design;
            foreach ($design['objects'] as &$object) {
                if (isset($object['resourceSlot'])) {
                    $object['requiredResource'] = false;
                }
            }
            unset($object);
            array_splice($design['objects'], 2, 0, [['type' => 'Textbox', 'originX' => 'left', 'originY' => 'top', 'left' => 310, 'top' => 40, 'width' => 520, 'fontFamily' => 'Noto Sans', 'fontSize' => 12, 'textAlign' => 'center', 'fill' => '#bb2026', 'text' => 'PRUEBA TÉCNICA AISLADA · SIN VALIDEZ']]);
            $version = $template->versions()->create(['number' => 2, 'user_id' => $admin->id, 'width_mm' => 297, 'height_mm' => 210, 'design' => $design, 'checksum' => hash('sha256', json_encode($design))]);
            $batch = $service->draft($admin, (string) Str::uuid(), [['participant_id' => $p->id, 'template_version_id' => $version->id]]);
            $item = $batch->items()->first();
            $review = $service->review($admin, $item);
            $this->assertEmpty(array_filter($review['issues'], fn ($i) => $i['level'] === 'error'), json_encode($review['issues']));
            $service->confirm($admin, $batch->fresh());
            $service->issue($item->id);
            $service->issue($item->id);
            $certificate = Certificate::where('batch_item_id', $item->id)->first();
            $this->assertNotNull($certificate, $item->fresh()->error ?? 'Sin certificado');
            $this->assertDatabaseCount('certificates', $index + 1);
            $this->assertSame($certificate->pdf_sha256, hash_file('sha256', Storage::disk('local')->path($certificate->pdf_path)));
            $path = $output.'/'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT).'.pdf';
            copy(Storage::disk('local')->path($certificate->pdf_path), $path);
            $inventory[] = ['path' => str_replace('\\', '/', $path), 'recipient' => $s->full_name, 'verification_url' => $certificate->snapshot['verification_url'], 'career' => $entry['career']];
        }
        file_put_contents($output.'/inventory.json', json_encode($inventory, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    public function test_retirement_preserves_uncertain_records_real_certificates_files_and_audit_and_is_repeatable(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'career_id' => null]);
        $career = Career::create(['name' => 'Carrera ficticia 01', 'code' => 'DEMO-01']);
        $type = CertificateType::create(['name' => 'Participación (ejemplo configurable)', 'text' => 'Por su participación en la actividad de formación que se detalla a continuación.']);
        $activity = Activity::create(['career_id' => $career->id, 'name' => 'Seminario ficticio de actualización 1', 'description' => 'Actividad ficticia para supervisión y QA.', 'kind' => 'Seminario', 'starts_on' => '2026-09-10', 'ends_on' => '2026-09-12', 'certificate_type_id' => $type->id]);
        $template = CertificateTemplate::create(['career_id' => $career->id, 'name' => 'Diseño institucional de ejemplo 1']);
        $design = DemonstrationDesign::make();
        $version = $template->versions()->create(['number' => 1, 'user_id' => $admin->id, 'width_mm' => 297, 'height_mm' => 210, 'design' => $design, 'checksum' => 'original']);
        $student = Student::create(['ci' => '00100003', 'normalized_ci' => '00100003', 'first_names' => 'Estudiante ficticio 3', 'last_names' => 'Apellido de ejemplo 1']);
        $unknown = Student::create(['ci' => 'REAL-123', 'normalized_ci' => 'REAL-123', 'first_names' => 'Persona', 'last_names' => 'Conservar íntegra']);
        $certificates = [];
        foreach ([$student, $unknown] as $person) {
            $p = Participant::create(['student_id' => $person->id, 'activity_id' => $activity->id, 'condition' => 'Condición registrada']);
            $batch = app(Issuance::class)->draft($admin, (string) Str::uuid(), [['participant_id' => $p->id, 'template_version_id' => $version->id]]);
            $path = 'certificates/'.$person->id.'.pdf';
            Storage::disk('local')->put($path, '%PDF-1.7 immutable fixture '.$person->id);
            $certificates[] = Certificate::create(['career_id' => $career->id, 'activity_id' => $activity->id, 'student_id' => $person->id, 'certificate_type_id' => $type->id, 'template_version_id' => $version->id, 'batch_item_id' => $batch->items()->first()->id, 'user_id' => $admin->id, 'identifier' => 'RECORD-'.$person->id, 'public_token' => bin2hex(random_bytes(32)), 'delivery_token' => bin2hex(random_bytes(32)), 'issued_at' => now(), 'expires_at' => now()->addYears(3), 'snapshot' => ['full_name' => $person->full_name, 'activity' => $activity->name, 'career' => $career->name], 'pdf_path' => $path, 'pdf_sha256' => hash('sha256', Storage::disk('local')->get($path))]);
        }
        Audit::log($admin, 'demo.loaded', null, ['fixture' => true]);
        $retirement = app(DemonstrationRetirement::class);
        $plan = $retirement->plan();
        $this->assertSame([$certificates[0]->id], $plan['delete']['certificates']);
        $this->assertSame([$certificates[1]->id], $plan['preserved_certificates']);
        $this->assertEmpty($plan['delete']['template_versions']);
        $backup = Storage::disk('local')->path('retirement-backup');
        mkdir($backup, 0700, true);
        file_put_contents($backup.'/certificados_qa.dump', 'test fixture for backup prerequisite');
        file_put_contents($backup.'/private-files.zip', 'test fixture for backup prerequisite');
        $before = $certificates[1]->getRawOriginal();
        $retirement->apply($backup);
        $this->assertDatabaseMissing('certificates', ['id' => $certificates[0]->id]);
        $this->assertSame($before, $certificates[1]->fresh()->getRawOriginal());
        $this->assertSame($certificates[1]->pdf_sha256, hash('sha256', Storage::disk('local')->get($certificates[1]->pdf_path)));
        $this->assertDatabaseHas('students', ['id' => $unknown->id]);
        $this->assertDatabaseHas('template_versions', ['id' => $version->id, 'checksum' => 'original']);
        $this->assertDatabaseHas('certificate_templates', ['id' => $template->id, 'active' => false]);
        $this->assertDatabaseHas('audit_events', ['action' => 'demo.loaded']);
        $this->assertTrue($retirement->apply($backup)['already_retired']);
        $this->assertFileExists($backup.'/retirement-manifest.json');
        $this->assertFileExists($backup.'/affected-files/'.$certificates[0]->pdf_path);
        $this->assertSame('O', DB::selectOne("SELECT tgenabled FROM pg_trigger WHERE tgname = 'immutable_certificates'")->tgenabled);
    }
}
