<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException('Esta aplicación requiere PostgreSQL.');
        }
        Schema::create('careers', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->string('code', 30)->unique();
            $t->boolean('active')->default(true);
            $t->timestampsTz();
        });
        Schema::table('users', function (Blueprint $t) {
            $t->string('role', 20)->default('chief');
            $t->foreignId('career_id')->nullable()->constrained()->restrictOnDelete();
            $t->boolean('active')->default(true);
        });
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK ((role = 'admin' AND career_id IS NULL) OR (role = 'chief' AND career_id IS NOT NULL))");
        Schema::create('students', function (Blueprint $t) {
            $t->id();
            $t->string('ci', 60);
            $t->string('normalized_ci', 60)->unique();
            $t->string('first_names');
            $t->string('last_names');
            $t->timestampsTz();
            $t->index(['last_names', 'first_names']);
        });
        Schema::create('career_student', function (Blueprint $t) {
            $t->foreignId('career_id')->constrained()->restrictOnDelete();
            $t->foreignId('student_id')->constrained()->restrictOnDelete();
            $t->timestampsTz();
            $t->primary(['career_id', 'student_id']);
        });
        Schema::create('certificate_types', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->text('text');
            $t->boolean('active')->default(true);
            $t->timestampsTz();
        });
        Schema::create('activities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('career_id')->constrained()->restrictOnDelete();
            $t->string('name');
            $t->string('kind', 80);
            $t->text('description')->nullable();
            $t->date('starts_on');
            $t->date('ends_on');
            $t->decimal('hours', 8, 2)->nullable();
            $t->foreignId('certificate_type_id')->constrained()->restrictOnDelete();
            $t->timestampsTz();
            $t->index(['career_id', 'starts_on']);
        });
        DB::statement('ALTER TABLE activities ADD CONSTRAINT activities_dates_check CHECK (ends_on >= starts_on AND (hours IS NULL OR hours >= 0))');
        Schema::create('participants', function (Blueprint $t) {
            $t->id();
            $t->foreignId('activity_id')->constrained()->restrictOnDelete();
            $t->foreignId('student_id')->constrained()->restrictOnDelete();
            $t->string('condition')->nullable();
            $t->string('group_name', 100)->nullable();
            $t->timestampsTz();
            $t->unique(['activity_id', 'student_id']);
        });
        Schema::create('graphic_assets', function (Blueprint $t) {
            $t->id();
            $t->foreignId('career_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->string('name');
            $t->string('kind', 30);
            $t->string('path');
            $t->string('mime', 80);
            $t->unsignedInteger('width');
            $t->unsignedInteger('height');
            $t->timestampsTz();
        });
        Schema::create('certificate_templates', function (Blueprint $t) {
            $t->id();
            $t->foreignId('career_id')->nullable()->constrained()->restrictOnDelete();
            $t->string('name');
            $t->boolean('active')->default(true);
            $t->timestampsTz();
        });
        Schema::create('template_versions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('certificate_template_id')->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->unsignedInteger('number');
            $t->decimal('width_mm', 8, 2);
            $t->decimal('height_mm', 8, 2);
            $t->jsonb('design');
            $t->string('checksum', 64);
            $t->timestampTz('created_at')->useCurrent();
            $t->unique(['certificate_template_id', 'number']);
        });
        Schema::create('issuance_batches', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->uuid('operation_key');
            $t->string('request_hash', 64);
            $t->string('status', 25)->default('draft');
            $t->timestampTz('confirmed_at')->nullable();
            $t->timestampsTz();
            $t->unique(['user_id', 'operation_key']);
        });
        Schema::create('batch_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('issuance_batch_id')->constrained()->restrictOnDelete();
            $t->foreignId('career_id')->constrained()->restrictOnDelete();
            $t->foreignId('participant_id')->constrained()->restrictOnDelete();
            $t->foreignId('template_version_id')->constrained()->restrictOnDelete();
            $t->string('status', 25)->default('pending');
            $t->jsonb('snapshot')->nullable();
            $t->jsonb('review')->nullable();
            $t->text('error')->nullable();
            $t->unsignedInteger('attempts')->default(0);
            $t->unsignedBigInteger('replacement_for')->nullable();
            $t->timestampsTz();
            $t->unique(['issuance_batch_id', 'participant_id']);
            $t->index(['career_id', 'status']);
        });
        Schema::create('certificates', function (Blueprint $t) {
            $t->id();
            $t->foreignId('career_id')->constrained()->restrictOnDelete();
            $t->foreignId('student_id')->constrained()->restrictOnDelete();
            $t->foreignId('activity_id')->constrained()->restrictOnDelete();
            $t->foreignId('certificate_type_id')->constrained()->restrictOnDelete();
            $t->foreignId('template_version_id')->constrained()->restrictOnDelete();
            $t->foreignId('batch_item_id')->unique()->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->string('identifier', 80)->unique();
            $t->string('public_token', 64)->unique();
            $t->string('delivery_token', 64)->unique();
            $t->jsonb('snapshot');
            $t->timestampTz('issued_at');
            $t->timestampTz('expires_at');
            $t->string('pdf_path');
            $t->string('pdf_sha256', 64);
            $t->foreignId('replacement_for')->nullable()->constrained('certificates')->restrictOnDelete();
            $t->timestampTz('created_at')->useCurrent();
            $t->index(['career_id', 'issued_at']);
        });
        Schema::table('batch_items', fn (Blueprint $t) => $t->foreign('replacement_for')->references('id')->on('certificates')->restrictOnDelete());
        Schema::create('revocations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('certificate_id')->unique()->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->text('reason');
            $t->timestampTz('created_at')->useCurrent();
        });
        Schema::create('audit_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('career_id')->nullable()->constrained()->restrictOnDelete();
            $t->string('action', 100);
            $t->string('subject_type')->nullable();
            $t->unsignedBigInteger('subject_id')->nullable();
            $t->jsonb('details');
            $t->string('ip', 45)->nullable();
            $t->timestampTz('created_at')->useCurrent();
            $t->index(['career_id', 'created_at']);
        });
        Schema::create('student_imports', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('career_id')->constrained()->restrictOnDelete();
            $t->jsonb('rows');
            $t->jsonb('result')->nullable();
            $t->timestampTz('confirmed_at')->nullable();
            $t->timestampsTz();
        });
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION protect_immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Este registro es inmutable; anule y emita un reemplazo.'; END $$;
CREATE TRIGGER immutable_certificates BEFORE UPDATE OR DELETE ON certificates FOR EACH ROW EXECUTE FUNCTION protect_immutable_record();
CREATE TRIGGER immutable_versions BEFORE UPDATE OR DELETE ON template_versions FOR EACH ROW EXECUTE FUNCTION protect_immutable_record();
CREATE TRIGGER immutable_revocations BEFORE UPDATE OR DELETE ON revocations FOR EACH ROW EXECUTE FUNCTION protect_immutable_record();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION protect_immutable_record();
ALTER TABLE certificates ADD CONSTRAINT certificate_validity CHECK (expires_at > issued_at);
SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS student_imports, audit_events, revocations, certificates, batch_items, issuance_batches, template_versions, certificate_templates, graphic_assets, participants, activities, certificate_types, career_student, students CASCADE');
        Schema::table('users', function (Blueprint $t) {
            $t->dropForeign(['career_id']);
            $t->dropColumn(['career_id', 'role', 'active']);
        });
        Schema::dropIfExists('careers');
        DB::statement('DROP FUNCTION IF EXISTS protect_immutable_record() CASCADE');
    }
};
