<?php

namespace App\Services;

use App\Models\Career;
use App\Models\CertificateTemplate;
use App\Models\GraphicAsset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class InstitutionalSetup
{
    public const CAREERS = ['AER' => 'Aeronáutica', 'CCV' => 'Construcciones Civiles', 'ELI' => 'Electricidad Industrial', 'EMC' => 'Electromecánica', 'ELT' => 'Electrónica y Telecomunicaciones', 'GEO' => 'Geodesia, Topografía y Geomática', 'MAU' => 'Mecánica Automotriz', 'MIN' => 'Mecánica Industrial', 'QUI' => 'Química Industrial'];

    public function install(): array
    {
        return DB::transaction(function () {
            DB::select("SELECT pg_advisory_xact_lock(hashtext('institutional-setup-v1'))");
            $assets = [];
            foreach (['umsa' => ['umsa.png', 'Escudo UMSA · fuente oficial'], 'faculty' => ['facultad-official-original.png', 'Emblema Facultad de Tecnología · fuente oficial']] as $key => [$file, $name]) {
                $asset = GraphicAsset::where('institutional_key', 'institution-v1:'.$key)->first();
                if (! $asset) {
                    $source = public_path('institutional/'.$file);
                    if (! is_file($source)) {
                        throw new \RuntimeException('Falta el recurso institucional verificado: '.$file);
                    }
                    [$width, $height] = getimagesize($source);
                    $path = 'assets/institutional/'.hash_file('sha256', $source).'.png';
                    Storage::disk('local')->put($path, file_get_contents($source));
                    $asset = GraphicAsset::create(['institutional_key' => 'institution-v1:'.$key, 'user_id' => null, 'career_id' => null, 'name' => $name, 'kind' => 'logo', 'path' => $path, 'mime' => 'image/png', 'width' => $width, 'height' => $height]);
                }
                $assets[$key] = $asset;
            }
            $result = [];
            foreach (self::CAREERS as $code => $name) {
                $key = 'institution-v1:'.$code;
                $career = Career::where('institutional_key', $key)->first();
                if (! $career) {
                    $career = Career::where('name', $name)->first();
                    $codeMatch = Career::where('code', $code)->first();
                    if ($codeMatch && $codeMatch->id !== $career?->id) {
                        throw new \RuntimeException('El código '.$code.' pertenece a otro registro. Se requiere conciliación exacta.');
                    }
                    $career ??= Career::create(['name' => $name, 'code' => $code]);
                    $career->update(['institutional_key' => $key]);
                }
                $template = CertificateTemplate::where('institutional_key', $key)->first();
                if (! $template) {
                    $template = CertificateTemplate::where('career_id', $career->id)->where('name', 'Certificado institucional — '.$name)->first();
                    if ($template && ! $template->latestVersion) {
                        throw new \RuntimeException('La plantilla existente no tiene versión. Revise '.$template->name);
                    }
                    if (! $template) {
                        $template = CertificateTemplate::create(['career_id' => $career->id, 'name' => 'Certificado institucional — '.$name, 'institutional_key' => $key, 'active' => true]);
                        $design = InstitutionalDesign::make($career->name, $assets['umsa'], $assets['faculty'], count($result));
                        $template->versions()->create(['number' => 1, 'user_id' => null, 'width_mm' => 297, 'height_mm' => 210, 'design' => $design, 'checksum' => hash('sha256', json_encode([$design, 297, 210]))]);
                    } else {
                        $template->update(['institutional_key' => $key]);
                    }
                }
                $result[] = ['career_id' => $career->id, 'career' => $career->name, 'template_id' => $template->id, 'version_id' => $template->latestVersion->id];
            }
            Audit::log(null, 'institution.configured', null, ['catalog' => 'institution-v1', 'associations' => $result]);

            return $result;
        });
    }
}
