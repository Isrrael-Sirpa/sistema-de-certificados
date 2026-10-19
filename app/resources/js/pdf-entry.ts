import { StaticCanvas, FabricObject, FabricImage, Textbox } from "fabric";
type Obj = FabricObject & {
    field?: string;
    boxHeight?: number;
    minFontSize?: number;
    autoFit?: boolean;
    missing?: boolean;
    pixelWidth?: number;
    pixelHeight?: number;
    text?: string;
    fontSize?: number;
    initDimensions?: () => void;
    resourceSlot?: string;
    requiredResource?: boolean;
    resourceMissing?: boolean;
    optionalEmpty?: boolean;
};
FabricObject.customProperties = [
    "field",
    "boxHeight",
    "minFontSize",
    "autoFit",
    "missing",
    "pixelWidth",
    "pixelHeight",
    "assetId",
    "name",
    "resourceSlot", "requiredResource", "resourceMissing", "optionalEmpty",
];
FabricObject.ownDefaults.originX = "left";
FabricObject.ownDefaults.originY = "top";
export async function render(payload: {
    design: object;
    widthMm: number;
    heightMm: number;
}) {
    await document.fonts.ready;
    const width = (payload.widthMm * 96) / 25.4,
        height = (payload.heightMm * 96) / 25.4;
    const canvas = new StaticCanvas(document.createElement("canvas"), {
        width,
        height,
        renderOnAddRemove: false,
        enableRetinaScaling: false,
    });
    await canvas.loadFromJSON(payload.design);
    const issues: { level: string; message: string }[] = [];
    let qrCount = 0;
    const seen = new Set<string>();
    const walk = (objects: FabricObject[], nested = false, hidden = false) => {
        for (const raw of objects) {
            const o = raw as Obj;
            if (o.resourceSlot && o.requiredResource && (o.resourceMissing || hidden || o.visible === false || o.opacity < .8)) {
                issues.push({level: "error", message: "Falta un recurso obligatorio visible: " + (o.resourceSlot === "signature" ? "firma autorizada" : "sello autorizado")});
            }
            if ("getObjects" in o) {
                walk(
                    (
                        o as unknown as { getObjects: () => FabricObject[] }
                    ).getObjects(),
                    true,
                    hidden || o.visible === false || o.opacity < 1,
                );
            }
            if (o.field) {
                seen.add(o.field);
                if (!o.optionalEmpty && (hidden || o.visible === false || o.opacity < 0.8))
                    issues.push({
                        level: "error",
                        message:
                            "Un campo automático no puede estar oculto o ser transparente: " +
                            o.field,
                    });
            }
            if (o.missing && o.field !== "hours" && !o.optionalEmpty)
                issues.push({
                    level: "error",
                    message: "Falta el dato obligatorio: " + o.field,
                });
            if (o.type.toLowerCase() === "textbox" && o.boxHeight) {
                if (o.autoFit) {
                    while (
                        o.height > o.boxHeight &&
                        (o.fontSize ?? 0) > (o.minFontSize ?? 12)
                    ) {
                        o.set(
                            "fontSize" as never,
                            ((o.fontSize ?? 12) - 0.5) as never,
                        );
                        (o as Textbox).initDimensions();
                    }
                }
                if (o.height > o.boxHeight + 1)
                    issues.push({
                        level: "error",
                        message:
                            "Texto desbordado: " +
                            (o.field ?? o.text?.slice(0, 30)),
                    });
            }
            o.setCoords();
            const b = o.getBoundingRect();
            if (
                b.left < -1 ||
                b.top < -1 ||
                b.left + b.width > width + 1 ||
                b.top + b.height > height + 1
            )
                issues.push({
                    level: "error",
                    message:
                        "Elemento fuera de la página: " + (o.field ?? o.type),
                });
            if (o.field === "qr") {
                qrCount++;
                const side = (Math.min(b.width, b.height) * 25.4) / 96;
                if (
                    nested ||
                    side < 25 ||
                    Math.abs(b.width - b.height) > 1 ||
                    o.angle !== 0 ||
                    o.opacity !== 1 ||
                    o.visible === false ||
                    o.flipX ||
                    o.flipY
                )
                    issues.push({
                        level: "error",
                        message:
                            "QR: mínimo 25 mm, cuadrado, visible, sin agrupar, giro, reflejo ni transparencia.",
                    });
                const topIndex = canvas.getObjects().indexOf(o);
                if (topIndex >= 0)
                    for (const later of canvas
                        .getObjects()
                        .slice(topIndex + 1)) {
                        const lb = later.getBoundingRect();
                        if (
                            later.visible &&
                            lb.left < b.left + b.width &&
                            lb.left + lb.width > b.left &&
                            lb.top < b.top + b.height &&
                            lb.top + lb.height > b.top
                        )
                            issues.push({
                                level: "error",
                                message:
                                    "Otro elemento cubre el QR. Colóquelo en la capa superior.",
                            });
                    }
            } else if (o.type.toLowerCase() === "image" && o.pixelWidth) {
                const dpi = Math.min(
                    o.pixelWidth / (b.width / 96),
                    (o.pixelHeight ?? o.pixelWidth) / (b.height / 96),
                );
                if (dpi < 150)
                    issues.push({
                        level: dpi < 72 ? "error" : "warning",
                        message:
                            "Imagen con resolución de " +
                            Math.round(dpi) +
                            " ppp; se recomiendan 150 o más.",
                    });
            }
        }
    };
    walk(canvas.getObjects());
    for (const field of [
        "full_name",
        "activity",
        "career",
        "certificate_type",
        "issuer",
        "identifier",
        "issued_at",
        "expires_at",
    ])
        if (!seen.has(field))
            issues.push({
                level: "error",
                message: "Falta el campo automático obligatorio: " + field,
            });
    if (qrCount !== 1)
        issues.push({
            level: "error",
            message: "El diseño debe incluir exactamente un QR automático.",
        });
    const svg = canvas.toSVG();
    canvas.dispose();
    return { svg, issues };
}
(window as unknown as { renderCertificate: typeof render }).renderCertificate =
    render;
