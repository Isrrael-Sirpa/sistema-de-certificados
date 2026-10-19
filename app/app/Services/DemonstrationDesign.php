<?php

namespace App\Services;

class DemonstrationDesign
{
    public static function make(float $width = 1122.52, float $height = 793.7): array
    {
        $text = fn (string $value, float $x, float $y, float $w, float $font = 16, ?string $field = null, float $box = 70) => array_filter(['type' => 'Textbox', 'left' => $x, 'top' => $y, 'width' => $w, 'text' => $value, 'fontFamily' => 'Noto Sans', 'fontSize' => $font, 'fontWeight' => '400', 'textAlign' => 'center', 'fill' => '#173e55', 'boxHeight' => $box, 'autoFit' => true, 'minFontSize' => 10, 'field' => $field], fn ($v) => $v !== null);
        $o = [
            ['type' => 'Rect', 'left' => 30, 'top' => 30, 'width' => $width - 60, 'height' => $height - 60, 'fill' => 'transparent', 'stroke' => '#327a83', 'strokeWidth' => 2],
            $text('Universidad Mayor de San Andrés — Facultad de Tecnología', 70, 65, $width - 140, 17, 'issuer'),
            $text('Tipo de certificado', 70, $height * .19, $width - 140, 40, 'certificate_type', 80),
            $text('Se confiere el presente certificado a', 70, $height * .31, $width - 140, 16),
            $text('Nombre completo del destinatario', 70, $height * .37, $width - 140, 36, 'full_name', 110),
            $text('Texto que acredita la condición', 80, $height * .53, $width - 160, 16, 'certificate_text', 70),
            $text('Nombre de la actividad', 80, $height * .63, $width - 160, 24, 'activity', 80),
            $text('Carrera responsable', 65, $height - 205, $width - 260, 13, 'career', 40),
            $text('Fechas de realización', 65, $height - 171, $width - 260, 12, 'activity_dates', 35),
            $text('PENDIENTE DE EMISIÓN', 65, $height - 130, $width - 260, 11, 'identifier', 30),
            $text('Emisión', 65, $height - 97, 200, 10),
            $text('PENDIENTE DE EMISIÓN', 65, $height - 78, 200, 10, 'issued_at', 25),
            $text('Vencimiento', 280, $height - 97, 200, 10),
            $text('PENDIENTE DE EMISIÓN', 280, $height - 78, 200, 10, 'expires_at', 25),
            ['type' => 'Rect', 'field' => 'qr', 'left' => $width - 170, 'top' => $height - 170, 'width' => 110, 'height' => 110, 'fill' => '#ffffff', 'strokeWidth' => 0],
        ];

        return ['version' => '7.4.0', 'objects' => array_map(fn ($object) => ['originX' => 'left', 'originY' => 'top', ...$object],$o), 'background' => '#ffffff'];
    }
}
