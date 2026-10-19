<?php

namespace App\Services;

use App\Models\GraphicAsset;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class TemplateDesign
{
    const FIELDS = ['full_name', 'activity', 'certificate_type', 'certificate_text', 'career', 'hours', 'activity_dates', 'condition', 'identifier', 'issued_at', 'expires_at', 'qr', 'issuer'];

    const NUMBERS = ['left', 'top', 'width', 'height', 'scaleX', 'scaleY', 'angle', 'opacity', 'fontSize', 'charSpacing', 'lineHeight', 'strokeWidth', 'rx', 'ry', 'radius', 'x1', 'x2', 'y1', 'y2', 'boxHeight', 'minFontSize'];

    const STRINGS = ['fill', 'stroke', 'text', 'fontFamily', 'fontWeight', 'fontStyle', 'textAlign', 'originX', 'originY', 'name', 'fieldPrefix', 'fieldSuffix'];

    public function clean(array $design, User $actor, ?int $careerId): array
    {
        $count = 0;
        $clean = function (array $o) use (&$clean, &$count, $actor, $careerId) {
            if (++$count > 250) {
                throw ValidationException::withMessages(['design' => 'Máximo 250 elementos por plantilla.']);
            }
            $type = strtolower((string) ($o['type'] ?? ''));
            if (! in_array($type, ['textbox', 'i-text', 'text', 'rect', 'circle', 'line', 'group', 'image', 'triangle'])) {
                throw ValidationException::withMessages(['design' => 'Tipo de elemento no permitido.']);
            }
            $out = ['type' => $o['type'], 'version' => '7.4.0', 'originX' => 'left', 'originY' => 'top'];
            foreach (self::NUMBERS as $key) {
                if (isset($o[$key])) {
                    if (! is_numeric($o[$key]) || ! is_finite((float) $o[$key]) || abs((float) $o[$key]) > 20000) {
                        throw ValidationException::withMessages(['design' => 'Propiedad numérica inválida.']);
                    } $out[$key] = (float) $o[$key];
                }
            }
            foreach (self::STRINGS as $key) {
                if (isset($o[$key])) {
                    $value = (string) $o[$key];
                    if (mb_strlen($value) > 10000 || preg_match('/url\s*\(|<script|javascript:/i', $value)) {
                        throw ValidationException::withMessages(['design' => 'Contenido no permitido.']);
                    } $out[$key] = $value;
                }
            }
            foreach (['underline', 'linethrough', 'visible', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'selectable', 'evented', 'autoFit', 'flipX', 'flipY', 'requiredResource'] as $key) {
                if (isset($o[$key])) {
                    $out[$key] = (bool) $o[$key];
                }
            }
            if (isset($o['field'])) {
                if (! in_array($o['field'], self::FIELDS) || ($o['field'] !== 'qr' && ! in_array($type, ['textbox', 'text', 'i-text'])) || ($o['field'] === 'qr' && $type !== 'rect')) {
                    throw ValidationException::withMessages(['design' => 'Campo automático o tipo de elemento inválido.']);
                } $out['field'] = $o['field'];
                $out['hideIfEmpty'] = in_array($o['field'], ['hours', 'activity_dates']) && (bool) ($o['hideIfEmpty'] ?? false);
            }
            if (isset($o['resourceSlot'])) {
                if (! in_array($o['resourceSlot'], ['signature', 'stamp']) || ! in_array($type, ['image', 'textbox', 'rect'])) {
                    throw ValidationException::withMessages(['design' => 'Área de firma o sello inválida.']);
                }
                $out['resourceSlot'] = $o['resourceSlot'];
            }
            if ($type === 'image') {
                $asset = GraphicAsset::findOrFail($o['assetId'] ?? 0);
                Access::record($actor, $asset, true);
                if (isset($out['resourceSlot']) && $asset->kind !== $out['resourceSlot']) {
                    throw ValidationException::withMessages(['design' => 'Seleccione un archivo del tipo de firma o sello correspondiente.']);
                }
                if ($asset->career_id !== null && (int) $asset->career_id !== (int) $careerId) {
                    throw ValidationException::withMessages(['design' => 'Un diseño solo puede usar recursos globales o de su carrera.']);
                }
                $out['assetId'] = $asset->id;
                $out['src'] = route('assets.file', $asset, false);
                $out['crossOrigin'] = 'anonymous';
            }
            if ($type === 'group') {
                $out['objects'] = array_map($clean, $o['objects'] ?? []);
            }
            if (isset($out['fontFamily']) && ! in_array($out['fontFamily'], ['Noto Sans', 'serif', 'sans-serif'])) {
                $out['fontFamily'] = 'Noto Sans';
            }

            return $out;
        };

        return ['version' => '7.0.0', 'objects' => array_map($clean, $design['objects'] ?? []), 'background' => '#ffffff'];
    }
}
