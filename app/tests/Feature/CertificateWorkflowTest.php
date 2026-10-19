<?php

namespace Tests\Feature;

use App\Jobs\IssueCertificate;
use App\Models\Activity;
use App\Models\Career;
use App\Models\Certificate;
use App\Models\CertificateTemplate;
use App\Models\CertificateType;
use App\Models\IssuanceBatch;
use App\Models\Participant;
use App\Models\Student;
use App\Models\StudentImport;
use App\Models\TemplateVersion;
use App\Models\User;
use App\Services\DemonstrationDesign;
use App\Services\Issuance;
use App\Services\PdfRenderer;
use App\Services\StudentRegistry;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class CertificateWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $chief;

    private User $other;

    private Career $career;

    private Career $second;

    private Activity $activity;

    private Participant $participant;

    private TemplateVersion $version;

    protected function beforeRefreshingDatabase(): void
    {
        if (config('database.default') !== 'pgsql' || ! str_ends_with(config('database.connections.pgsql.database'), '_test')) {
            throw new \RuntimeException('Interrumpido: las pruebas solo pueden migrar una base PostgreSQL terminada en _test.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        if (config('database.default') !== 'pgsql' || ! str_ends_with(config('database.connections.pgsql.database'), '_test')) {
            throw new \RuntimeException('Las pruebas requieren una base PostgreSQL exclusiva terminada en _test.');
        }
        Storage::fake('local');
        Queue::fake();
        $this->career = Career::create(['name' => 'Carrera ficticia A', 'code' => 'TEST-A']);
        $this->second = Career::create(['name' => 'Carrera ficticia B', 'code' => 'TEST-B']);
        $this->admin = User::factory()->create(['role' => 'admin', 'career_id' => null, 'active' => true]);
        $this->chief = User::factory()->create(['role' => 'chief', 'career_id' => $this->career->id, 'active' => true]);
        $this->other = User::factory()->create(['role' => 'chief', 'career_id' => $this->second->id, 'active' => true]);
        $type = CertificateType::create(['name' => 'Participación de prueba', 'text' => 'Por su participación en la actividad de prueba.', 'active' => true]);
        $this->activity = Activity::create(['career_id' => $this->career->id, 'name' => 'Actividad ficticia de prueba', 'kind' => 'Curso', 'starts_on' => '2026-01-01', 'ends_on' => '2026-01-10', 'hours' => 40, 'certificate_type_id' => $type->id]);
        [$s] = app(StudentRegistry::class)->register($this->admin, $this->career->id, ['ci' => '000123-A', 'first_names' => 'María José', 'last_names' => 'Muñoz Peña']);
        $this->participant = Participant::create(['activity_id' => $this->activity->id, 'student_id' => $s->id, 'condition' => 'Participó']);
        $t = CertificateTemplate::create(['name' => 'Plantilla prueba', 'career_id' => $this->career->id]);
        $design = DemonstrationDesign::make();
        $this->version = $t->versions()->create(['number' => 1, 'user_id' => $this->admin->id, 'width_mm' => 297, 'height_mm' => 210, 'design' => $design, 'checksum' => hash('sha256', json_encode($design))]);
    }

    private function draft(?User $actor = null, ?string $key = null): IssuanceBatch
    {
        return app(Issuance::class)->draft($actor ?? $this->chief, $key ?? (string) Str::uuid(), [['participant_id' => $this->participant->id, 'template_version_id' => $this->version->id]]);
    }

    private function approved(IssuanceBatch $batch): void
    {
        foreach ($batch->items as $item) {
            $snapshot = app(Issuance::class)->snapshot($item->participant);
            $item->update(['review' => ['issues' => [], 'snapshot_hash' => hash('sha256', json_encode($snapshot))]]);
        }
        app(Issuance::class)->confirm($batch->user, $batch);
    }

    private function certificateFixture(?string $time = null): Certificate
    {
        if ($time) {
            CarbonImmutable::setTestNow(CarbonImmutable::parse($time, 'America/La_Paz'));
        }
        try {
            $batch = $this->draft();
            $this->approved($batch);
            $item = $batch->items()->first();
            $token = bin2hex(random_bytes(32));
            $issued = CarbonImmutable::now('America/La_Paz');
            $snapshot = [...$item->fresh()->snapshot, 'identifier' => 'FIXTURE-'.Str::random(12), 'issued_at' => $issued->format('d/m/Y H:i'), 'expires_at' => $issued->addYearsNoOverflow(3)->format('d/m/Y H:i'), 'verification_url' => url('/verificar/'.$token)];
            $path = 'fixtures/'.$token.'.pdf';
            Storage::disk('local')->put($path, '%PDF-1.7 test fixture');

            return Certificate::create(['career_id' => $this->career->id, 'student_id' => $this->participant->student_id, 'activity_id' => $this->activity->id, 'certificate_type_id' => $this->activity->certificate_type_id, 'template_version_id' => $this->version->id, 'batch_item_id' => $item->id, 'user_id' => $this->chief->id, 'identifier' => $snapshot['identifier'], 'public_token' => $token, 'delivery_token' => bin2hex(random_bytes(32)), 'snapshot' => $snapshot, 'issued_at' => $issued, 'expires_at' => $issued->addYearsNoOverflow(3), 'pdf_path' => $path, 'pdf_sha256' => hash('sha256', '%PDF-1.7 test fixture')]);
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    public function test_authentication_and_disabled_accounts(): void
    {
        $this->get('/dashboard')->assertRedirect('/ingresar');
        $this->post('/ingresar', ['email' => $this->chief->email, 'password' => 'incorrecta'])->assertSessionHasErrors('email');
        $this->chief->update(['active' => false]);
        $this->actingAs($this->chief)->get('/dashboard')->assertRedirect('/ingresar');
    }

    public function test_career_scope_blocks_records_files_templates_and_administration(): void
    {
        $c = $this->certificateFixture();
        $this->actingAs($this->other)->get('/actividades/'.$this->activity->id)->assertForbidden();
        $this->get('/plantillas/'.$this->version->certificate_template_id.'/editor')->assertForbidden();
        $this->get('/estudiantes/'.$this->participant->student_id)->assertNotFound();
        $this->get('/certificados/'.$c->id.'/pdf')->assertForbidden();
        $this->post('/certificados/exportar', ['ids' => [$c->id], 'format' => 'zip'])->assertForbidden();
        $this->get('/administracion')->assertForbidden();
        $this->post('/lotes', ['operation_key' => (string) Str::uuid(), 'items' => [['participant_id' => $this->participant->id, 'template_version_id' => $this->version->id]]])->assertForbidden();
        $this->actingAs($this->chief)->get('/estudiantes')->assertInertia(fn (Assert $p) => $p->component('Students')->has('students.data', 1));
    }

    public function test_ci_normalization_global_uniqueness_and_no_automatic_overwrite(): void
    {
        $this->assertSame('000123-A', StudentRegistry::normalizeCi(' ０００１２３-a '));
        [$existing,$created] = app(StudentRegistry::class)->register($this->other, $this->second->id, ['ci' => '000123-a', 'first_names' => 'María José', 'last_names' => 'Muñoz Peña']);
        $this->assertFalse($created);
        $this->assertSame($this->participant->student_id, $existing->id);
        $this->assertDatabaseCount('students', 1);
        $inspection = app(StudentRegistry::class)->inspect($this->other, ['ci' => '000123-A', 'first_names' => 'Otra identidad', 'last_names' => 'Prueba']);
        $this->assertSame('discrepancy', $inspection['status']);
        $this->actingAs($this->other)->post('/estudiantes', ['career_id' => $this->second->id, 'ci' => '000123-A', 'first_names' => 'Diferente', 'last_names' => 'Nombre'])->assertSessionHasErrors('ci');
        $this->assertDatabaseHas('students', ['id' => $existing->id, 'first_names' => 'María José']);
        try {
            DB::transaction(fn () => DB::table('students')->insert(['ci' => '000123-A', 'normalized_ci' => '000123-A', 'first_names' => 'Duplicado', 'last_names' => 'Prueba']));
            $this->fail('PostgreSQL permitió un CI duplicado.');
        } catch (QueryException $e) {
            $this->assertStringContainsString('23505', $e->getMessage());
        }
    }

    public function test_hidden_ci_discrepancy_does_not_disclose_other_career_data(): void
    {
        $r = $this->actingAs($this->other)->post('/estudiantes', ['career_id' => $this->second->id, 'ci' => '000123-A', 'first_names' => 'Nombre ajeno', 'last_names' => 'Otra persona']);
        $r->assertSessionHasErrors('ci');
        $this->assertStringNotContainsString('María', session('errors')->first('ci'));
        $this->assertFalse(Student::visibleTo($this->other)->whereKey($this->participant->student_id)->exists());
    }

    public function test_excel_preview_confirmation_counts_and_no_certificates(): void
    {
        $sheet = new Spreadsheet;
        $s = $sheet->getActiveSheet();
        $s->fromArray([['CI', 'nombres', 'apellidos'], ['000123-A', 'María José', 'Muñoz Peña'], ['000123-a', 'Duplicado', 'Archivo'], ['000999-B', 'Nueva María', 'Álvarez'], ['000123-A', 'Discrepante', 'Ignorar'], ['', 'Falta CI', 'Error']]);
        $s->getStyle('A:A')->getNumberFormat()->setFormatCode('@');
        $tmp = tempnam(sys_get_temp_dir(), 'cert-test-');
        (new Xlsx($sheet))->save($tmp);
        $file = new UploadedFile($tmp, 'importacion.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
        $this->actingAs($this->chief)->post('/importaciones', ['career_id' => $this->career->id, 'file' => $file])->assertRedirect();
        $import = StudentImport::firstOrFail();
        $this->assertSame('duplicate', $import->rows[1]['status']);
        $this->assertSame('new', $import->rows[2]['status']);
        $this->post('/importaciones/'.$import->id.'/confirmar')->assertRedirect();
        $this->post('/importaciones/'.$import->id.'/confirmar')->assertRedirect();
        $this->assertDatabaseCount('students', 2);
        $this->assertDatabaseCount('certificates', 0);
        $this->assertSame(1, $import->fresh()->result['new']);
        $this->assertSame(1, $import->fresh()->result['existing']);
        $download = $this->get('/estudiantes/plantilla-excel');
        $download->assertDownload('plantilla-estudiantes.xlsx');
        @unlink($tmp);
    }

    public function test_only_twenty_selected_recipients_out_of_thirty_are_enqueued(): void
    {
        $ids = [$this->participant->id];
        for ($n = 2; $n <= 30; $n++) {
            [$s] = app(StudentRegistry::class)->register($this->admin, $this->career->id, ['ci' => 'TEST-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT), 'first_names' => 'Estudiante '.$n, 'last_names' => 'Ficticio']);
            $ids[] = Participant::create(['activity_id' => $this->activity->id, 'student_id' => $s->id, 'condition' => 'Participó'])->id;
        }
        $batch = app(Issuance::class)->draft($this->chief, (string) Str::uuid(), array_map(fn ($id) => ['participant_id' => $id, 'template_version_id' => $this->version->id], array_slice($ids, 0, 20)));
        $this->approved($batch);
        $this->assertSame(20, $batch->items()->count());
        Queue::assertPushed(IssueCertificate::class, 20);
        $this->assertSame(30, $this->activity->participants()->count());
    }

    public function test_admin_can_create_a_single_operation_across_multiple_careers(): void
    {
        [$s] = app(StudentRegistry::class)->register($this->admin, $this->second->id, ['ci' => '000123-A', 'first_names' => 'María José', 'last_names' => 'Muñoz Peña']);
        $otherActivity = $this->activity->replicate();
        $otherActivity->career_id = $this->second->id;
        $otherActivity->save();
        $p = Participant::create(['activity_id' => $otherActivity->id, 'student_id' => $s->id, 'condition' => 'Participó']);
        $t = CertificateTemplate::create(['name' => 'Global', 'career_id' => null]);
        $v = $this->version->replicate();
        $v->certificate_template_id = $t->id;
        $v->save();
        $b = app(Issuance::class)->draft($this->admin, (string) Str::uuid(), [['participant_id' => $this->participant->id, 'template_version_id' => $v->id], ['participant_id' => $p->id, 'template_version_id' => $v->id]]);
        $this->approved($b);
        $this->assertSame(2, $b->items()->distinct('career_id')->count('career_id'));
        Queue::assertPushed(IssueCertificate::class, 2);
    }

    public function test_idempotency_protected_dates_and_explicit_review(): void
    {
        $key = (string) Str::uuid();
        $a = $this->draft($this->chief, $key);
        $b = $this->draft($this->chief, $key);
        $this->assertSame($a->id, $b->id);
        $this->assertDatabaseCount('batch_items', 1);
        $this->actingAs($this->chief)->post('/lotes/'.$a->id.'/confirmar')->assertStatus(422);
        $this->post('/lotes/'.$a->id.'/confirmar', ['issued_at' => '2000-01-01', 'expires_at' => '2099-01-01'])->assertSessionHasErrors(['issued_at', 'expires_at']);
        $this->approved($a);
        app(Issuance::class)->confirm($this->chief, $a);
        Queue::assertPushed(IssueCertificate::class, 1);
    }

    public function test_inactive_worker_actor_cannot_issue_even_after_confirmation(): void
    {
        $b = $this->draft();
        $this->approved($b);
        $this->chief->update(['active' => false]);
        app(Issuance::class)->issue($b->items()->first()->id);
        $this->assertDatabaseCount('certificates', 0);
        $this->assertSame('failed', $b->items()->first()->status);
    }

    public function test_revocation_is_admin_only_and_has_priority_over_expiration(): void
    {
        $c = $this->certificateFixture('2020-02-29 10:00:00');
        $this->assertSame('2023-02-28 10:00', $c->expires_at->format('Y-m-d H:i'));
        $this->assertSame('vencido', $c->status);
        $this->actingAs($this->chief)->post('/certificados/'.$c->id.'/anular', ['reason' => 'Prueba de anulación'])->assertForbidden();
        $this->actingAs($this->admin)->post('/certificados/'.$c->id.'/anular', ['reason' => 'Motivo ficticio suficientemente detallado.'])->assertRedirect();
        $this->assertSame('anulado', $c->fresh()->status);
        $this->assertSame(0, Certificate::withStatus('vencido')->count());
        $this->assertSame(1, Certificate::withStatus('anulado')->count());
        $this->get('/dashboard')->assertInertia(fn (Assert $p) => $p->where('stats.anulado', 1)->where('stats.vencido', 0)->where('stats.vigente', 0));
    }

    public function test_issued_snapshot_dates_pdf_and_versions_are_immutable(): void
    {
        $c = $this->certificateFixture();
        $snapshot = $c->snapshot;
        $this->participant->student->update(['first_names' => 'Nombre corregido']);
        $this->activity->update(['name' => 'Actividad corregida']);
        $this->assertEquals($snapshot, $c->fresh()->snapshot);
        foreach ([['certificates', ['issued_at' => now()->subYear()]], ['template_versions', ['number' => 99]]] as [$table,$data]) {
            try {
                DB::transaction(fn () => DB::table($table)->update($data));
                $this->fail('Se permitió modificar un registro inmutable.');
            } catch (QueryException $e) {
                $this->assertStringContainsString('inmutable', $e->getMessage());
            }
        }
        $this->actingAs($this->chief)->get('/certificados/'.$c->id.'/pdf')->assertDownload($c->identifier.'.pdf');
    }

    public function test_public_verification_excludes_internal_personal_data_and_history(): void
    {
        $c = $this->certificateFixture();
        $this->get('/verificar/'.$c->public_token)->assertInertia(fn (Assert $p) => $p->component('Verify')->where('certificate.recipient', 'María José Muñoz Peña')->missing('certificate.student_id')->missing('certificate.snapshot')->missing('certificate.ci')->missing('certificate.user_id')->where('auth.user', null));
        $this->get('/entrega/'.$c->delivery_token)->assertDownload($c->identifier.'.pdf');
        $this->get('/verificar/'.str_repeat('f', 64))->assertNotFound();
    }

    public function test_template_save_preserves_bindings_and_rejects_remote_images(): void
    {
        $t = $this->version->template;
        $design = $this->version->design;
        $design['objects'][1]['fontSize'] = 18;
        $this->actingAs($this->chief)->postJson('/plantillas/'.$t->id.'/guardar', ['expected_version' => 1, 'width_mm' => 297, 'height_mm' => 210, 'design' => $design])->assertOk()->assertJsonPath('version.number', 2);
        $latest = $t->fresh()->latestVersion;
        $this->assertSame('issuer', $latest->design['objects'][1]['field']);
        $this->postJson('/plantillas/'.$t->id.'/guardar', ['expected_version' => 1, 'width_mm' => 297, 'height_mm' => 210, 'design' => $design])->assertStatus(409);
        $design['objects'][] = ['type' => 'Image', 'src' => 'http://169.254.169.254/latest/meta-data', 'width' => 200, 'height' => 100];
        $this->postJson('/plantillas/'.$t->id.'/guardar', ['expected_version' => 2, 'width_mm' => 297, 'height_mm' => 210, 'design' => $design])->assertNotFound();
    }

    public function test_real_pdf_qr_preflight_zip_and_retry_idempotence(): void
    {
        $b = $this->draft();
        $item = $b->items()->first();
        $review = app(Issuance::class)->review($this->chief, $item);
        $this->assertSame([], array_values(array_filter($review['issues'], fn ($i) => $i['level'] === 'error')), json_encode($review['issues']));
        app(Issuance::class)->confirm($this->chief, $b);
        app(Issuance::class)->issue($item->id);
        $c = Certificate::where('batch_item_id', $item->id)->first();
        $this->assertNotNull($c, $item->fresh()->error ?? 'Sin certificado');
        $path = Storage::disk('local')->path($c->getRawOriginal('pdf_path'));
        $this->assertStringStartsWith('%PDF-', file_get_contents($path));
        $this->assertGreaterThan(10000, filesize($path));
        app(Issuance::class)->issue($item->id);
        $this->assertDatabaseCount('certificates', 1);
        $this->assertSame($c->pdf_sha256, hash_file('sha256', $path));
        $this->actingAs($this->chief)->post('/certificados/exportar', ['ids' => [$c->id], 'format' => 'zip'])->assertDownload('certificados.zip');
        $response = $this->post('/certificados/exportar', ['ids' => [$c->id], 'format' => 'pdf']);
        $response->assertDownload('certificados.pdf');
    }

    public function test_preflight_rejects_missing_qr_out_of_page_and_long_text(): void
    {
        $design = $this->version->design;
        array_pop($design['objects']);
        $design['objects'][4]['left'] = -50;
        $design['objects'][4]['autoFit'] = false;
        $design['objects'][4]['boxHeight'] = 5;
        $v = $this->version->replicate();
        $v->number = 2;
        $v->design = $design;
        $v->save();
        $data = app(Issuance::class)->provisional(app(Issuance::class)->snapshot($this->participant));
        $result = app(PdfRenderer::class)->render($v, $data);
        $messages = implode(' ', array_column($result['issues'], 'message'));
        $this->assertStringContainsString('QR', $messages);
        $this->assertStringContainsString('fuera de la página', $messages);
        $this->assertStringContainsString('desbordado', $messages);
    }

    public function test_demo_loader_refuses_production_and_wrong_database(): void
    {
        $this->artisan('certificates:demo')->assertFailed();
    }

    public function test_deactivated_catalog_blocks_new_emissions(): void
    {
        $batch = $this->draft();
        $item = $batch->items()->firstOrFail();
        $this->activity->certificateType->update(['active' => false]);
        $this->actingAs($this->chief)->postJson('/lotes/'.$batch->id.'/elementos/'.$item->id.'/revisar', [])->assertUnprocessable();
        $this->activity->certificateType->update(['active' => true]);
        $this->career->update(['active' => false]);
        $this->postJson('/lotes/'.$batch->id.'/elementos/'.$item->id.'/revisar', [])->assertUnprocessable();
        $this->assertDatabaseCount('certificates', 0);
    }
}
