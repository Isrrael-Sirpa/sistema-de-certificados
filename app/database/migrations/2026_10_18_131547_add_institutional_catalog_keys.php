<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach (['careers', 'certificate_templates', 'graphic_assets'] as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->string('institutional_key', 80)->nullable()->unique());
        }
        Schema::table('graphic_assets', fn (Blueprint $t) => $t->boolean('active')->default(true));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['careers', 'certificate_templates', 'graphic_assets'] as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn('institutional_key'));
        }
        Schema::table('graphic_assets', fn (Blueprint $t) => $t->dropColumn('active'));
    }
};
