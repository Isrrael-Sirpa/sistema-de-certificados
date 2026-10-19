<?php

namespace App\Services;

use App\Models\GraphicAsset;
use App\Models\TemplateVersion;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class PdfRenderer
{
    public function render(TemplateVersion $version, array $data, ?string $output = null): array
    {
        $design = $version->design;
        $qr = (new PngWriter)->write(new QrCode(data: $data['verification_url'], errorCorrectionLevel: ErrorCorrectionLevel::Medium, size: 1000, margin: 100))->getDataUri();
        $walk = function (array $o) use (&$walk, $data, $qr, $output) {
            if (strtolower($o['type']) === 'group') {
                $o['objects'] = array_map($walk, $o['objects'] ?? []);
            }
            if (isset($o['assetId'])) {
                $a = GraphicAsset::findOrFail($o['assetId']);
                $o['src'] = 'data:'.$a->mime.';base64,'.base64_encode(Storage::disk('local')->get($a->getRawOriginal('path')));
                $o['pixelWidth'] = $a->width;
                $o['pixelHeight'] = $a->height;
            }
            if (isset($o['resourceSlot'])) {
                $o['resourceMissing'] = ! isset($a) || $a->kind !== $o['resourceSlot'] || strtolower($o['type']) !== 'image';
                if ($o['resourceMissing'] && $output !== null && ! ($o['requiredResource'] ?? false)) {
                    $o['visible'] = false;
                }
            }
            if (($o['field'] ?? null) === 'qr') {
                $width = $o['width'] ?? 100;
                $height = $o['height'] ?? 100;
                $o = [...$o, 'type' => 'Image', 'src' => $qr, 'width' => 1200, 'height' => 1200, 'scaleX' => ($width * ($o['scaleX'] ?? 1)) / 1200, 'scaleY' => ($height * ($o['scaleY'] ?? 1)) / 1200, 'strokeWidth' => 0];
            } elseif (isset($o['field'])) {
                $value = (string) ($data[$o['field']] ?? '');
                $o['text'] = $value === '' ? '' : ($o['fieldPrefix'] ?? '').$value.($o['fieldSuffix'] ?? '');
                $o['missing'] = ($value === '');
                $o['optionalEmpty'] = $value === '' && in_array($o['field'], ['hours', 'activity_dates']) && ($o['hideIfEmpty'] ?? false);
                if ($o['optionalEmpty']) {
                    $o['visible'] = false;
                }
            }

            return $o;
        };
        $design['objects'] = array_map($walk, $design['objects']);
        $payload = ['design' => $design, 'widthMm' => (float) $version->width_mm, 'heightMm' => (float) $version->height_mm, 'output' => $output];
        $process = new Process([config('certificates.node'), base_path('scripts/render-pdf.mjs')], base_path(), ['PDF_CHROME_BINARY' => config('certificates.chrome') ?? '']);
        $process->setInput(json_encode($payload, JSON_THROW_ON_ERROR));
        $process->setTimeout(90);
        $process->mustRun();
        $result = json_decode($process->getOutput(), true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($result)) {
            throw new \RuntimeException('El motor de PDF devolvió una respuesta inválida.');
        }

        return $result;
    }
}
