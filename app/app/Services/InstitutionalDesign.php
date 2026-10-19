<?php

namespace App\Services;

use App\Models\GraphicAsset;

class InstitutionalDesign
{
    public static function make(string $career, GraphicAsset $university, GraphicAsset $faculty, int $variation = 0): array
    {
        $text = fn (string $value, float $x, float $y, float $width, float $font, float $box, ?string $field = null, string $weight = '400') => array_filter([
            'type' => 'Textbox', 'left' => $x, 'top' => $y, 'width' => $width, 'text' => $value, 'fontFamily' => 'Noto Sans', 'fontSize' => $font, 'fontWeight' => $weight, 'textAlign' => 'center', 'fill' => '#024966', 'lineHeight' => 1.12, 'boxHeight' => $box, 'autoFit' => true, 'minFontSize' => max(12, $font * .65), 'field' => $field, 'name' => $field ?? $value,
        ], fn ($v) => $v !== null);
        $image = fn (GraphicAsset $asset, float $left, float $top, float $height) => ['type' => 'Image', 'left' => $left, 'top' => $top, 'width' => $asset->width, 'height' => $asset->height, 'scaleX' => $height / $asset->height, 'scaleY' => $height / $asset->height, 'assetId' => $asset->id, 'src' => route('assets.file', $asset, false), 'name' => $asset->name];
        $rect = fn (float $x, float $y, float $w, float $h, string $color) => ['type' => 'Rect', 'left' => $x, 'top' => $y, 'width' => $w, 'height' => $h, 'fill' => $color, 'strokeWidth' => 0];
        $objects = [
            [...$rect(29, 29, 1064, 735, '#ffffff'), 'stroke' => '#cedce3', 'strokeWidth' => 1],
            $rect(29, 29, 1064, 7, '#024966'), $rect(29, 36, 130 + $variation * 13, 3, '#bb2026'),
            $image($university, 63, 56, 111), $image($faculty, 953, 69, 74),
            $text('Universidad Mayor de San Andrés — Facultad de Tecnología', 208, 63, 705, 22, 62, 'issuer', '700'),
            $text($career, 210, 139, 700, 17, 45, 'career'),
            $text('CERTIFICADO', 112, 201, 900, 37, 62, 'certificate_type', '700'),
            $text('Se confiere el presente certificado a', 200, 263, 722, 14, 25),
            $text('Nombre completo del destinatario', 95, 306, 932, 34, 79, 'full_name', '600'),
            $rect(367, 394, 388, 1, '#bb2026'),
            $text('Texto del certificado según el tipo seleccionado', 125, 414, 872, 16, 47, 'certificate_text'),
            $text('Condición acreditada según el registro', 125, 468, 872, 16, 33, 'condition', '600'),
            $text('Nombre de la actividad', 115, 509, 892, 23, 57, 'activity', '600'),
            $text('Fechas de la actividad', 165, 576, 520, 12, 23, 'activity_dates'),
            [...$text('Carga horaria', 700, 576, 250, 12, 23, 'hours'), 'fieldPrefix' => 'Carga horaria: ', 'fieldSuffix' => ' horas', 'hideIfEmpty' => true],
            [...$text('FIRMA AUTORIZADA\nPendiente de configurar', 167, 622, 250, 12, 45), 'resourceSlot' => 'signature', 'requiredResource' => true, 'name' => 'Firma autorizada pendiente', 'fill' => '#526672'],
            [...$text('SELLO AUTORIZADO\nPendiente de configurar', 548, 622, 250, 12, 45), 'resourceSlot' => 'stamp', 'requiredResource' => true, 'name' => 'Sello autorizado pendiente', 'fill' => '#526672'],
            $rect(180, 680, 224, 1, '#829aa8'), $rect(561, 680, 224, 1, '#829aa8'),
            $text('Identificador', 65, 710, 370, 11, 20),
            $text('PENDIENTE DE EMISIÓN', 65, 731, 370, 12, 23, 'identifier'),
            $text('Emisión', 451, 710, 200, 11, 20),
            $text('PENDIENTE DE EMISIÓN', 451, 731, 200, 12, 23, 'issued_at'),
            $text('Vencimiento', 665, 710, 200, 11, 20),
            $text('PENDIENTE DE EMISIÓN', 665, 731, 200, 12, 23, 'expires_at'),
            $text('Verificar certificado', 919, 735, 126, 10, 18),
            [...$rect(925, 614, 114, 114, '#ffffff'), 'field' => 'qr', 'name' => 'QR automático · 30 mm'],
        ];

        return ['version' => '7.4.0', 'background' => '#ffffff', 'objects' => array_map(fn ($o) => ['originX' => 'left', 'originY' => 'top', ...$o], $objects)];
    }

    public static function previewData(string $career = 'Nombre de la carrera'): array
    {
        return ['issuer' => config('certificates.issuer'), 'full_name' => 'Nombre completo del destinatario', 'activity' => 'Nombre de la actividad', 'certificate_type' => 'CERTIFICADO', 'certificate_text' => 'Texto del certificado según el tipo seleccionado', 'condition' => 'Condición acreditada según el registro', 'career' => $career, 'hours' => '', 'activity_dates' => 'Fechas de la actividad', 'identifier' => 'PENDIENTE DE EMISIÓN', 'issued_at' => 'PENDIENTE DE EMISIÓN', 'expires_at' => 'PENDIENTE DE EMISIÓN', 'verification_url' => rtrim(config('certificates.public_url'), '/').'/verificar/'.str_repeat('0', 64)];
    }
}
