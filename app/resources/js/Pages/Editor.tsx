import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Head } from "@inertiajs/react";
import {
    Canvas,
    FabricObject,
    FabricImage,
    Textbox,
    Rect,
    Circle,
    Line,
    Group,
    ActiveSelection,
    Point,
} from "fabric";
import {
    ArrowLeft,
    Type,
    Square,
    Circle as CircleIcon,
    Image as ImageIcon,
    QrCode,
    Undo2,
    Redo2,
    Save,
    Copy,
    Trash2,
    LockKeyhole,
    UnlockKeyhole,
    Group as GroupIcon,
    Ungroup,
    ArrowUp,
    ArrowDown,
    AlignHorizontalJustifyCenter,
    AlignVerticalJustifyCenter,
    ZoomIn,
    ZoomOut,
    Maximize,
    Layers,
    History,
    MousePointer2,
    GripVertical,
    Check,
    LoaderCircle,
} from "lucide-react";
import { api } from "../lib";
import { Button, Field, Modal } from "../components/UI";
import type { Template, Version, Asset } from "../types";
type DesignObject = FabricObject & {
    field?: string;
    assetId?: number;
    boxHeight?: number;
    minFontSize?: number;
    autoFit?: boolean;
    name?: string;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    fontStyle?: string;
    textAlign?: string;
    charSpacing?: number;
    lineHeight?: number;
    underline?: boolean;
    editable?: boolean;
    resourceSlot?: "signature" | "stamp";
    requiredResource?: boolean;
    fieldPrefix?: string;
    fieldSuffix?: string;
    hideIfEmpty?: boolean;
};
FabricObject.customProperties = [
    "field",
    "assetId",
    "boxHeight",
    "minFontSize",
    "autoFit",
    "name",
    "resourceSlot", "requiredResource", "fieldPrefix", "fieldSuffix", "hideIfEmpty",
];
FabricObject.ownDefaults.originX = "left";
FabricObject.ownDefaults.originY = "top";
const fieldNames: Record<string, string> = {
    full_name: "Nombre completo",
    activity: "Nombre de actividad",
    certificate_type: "Tipo de certificado",
    certificate_text: "Texto del certificado",
    career: "Carrera",
    hours: "Carga horaria",
    activity_dates: "Fechas de actividad",
    condition: "Condición acreditada",
    identifier: "Identificador automático",
    issued_at: "Fecha de emisión",
    expires_at: "Fecha de vencimiento",
    qr: "QR de verificación",
    issuer: "Entidad emisora",
};
const samples: Record<string, string> = {
    full_name: "Nombre completo del destinatario",
    activity: "Nombre de la actividad",
    certificate_type: "Tipo de certificado",
    certificate_text: "Texto que acredita la condición",
    career: "Carrera responsable",
    hours: "Carga horaria",
    activity_dates: "Fechas de realización",
    condition: "Condición acreditada",
    identifier: "PENDIENTE DE EMISIÓN",
    issued_at: "PENDIENTE DE EMISIÓN",
    expires_at: "PENDIENTE DE EMISIÓN",
    issuer: "Universidad Mayor de San Andrés — Facultad de Tecnología",
};
const px = (mm: number) => (mm * 96) / 25.4;
export default function Editor({
    template,
    version,
    versions,
    assets,
    fields,
    editable,
}: {
    template: Template;
    version: Version;
    versions: Version[];
    assets: Asset[];
    fields: string[];
    editable: boolean;
}) {
    const element = useRef<HTMLCanvasElement>(null),
        workspace = useRef<HTMLDivElement>(null),
        canvas = useRef<Canvas | null>(null),
        saving = useRef(false),
        currentVersion = useRef(version.number),
        size = useRef({
            w: Number(version.width_mm),
            h: Number(version.height_mm),
        }),
        history = useRef<string[]>([]),
        historyIndex = useRef(-1),
        suppress = useRef(false),
        snap = useRef(true),
        lastSaved = useRef(""),
        changeCounter = useRef(0);
    const meta = useRef({ name: template.name, active: !!template.active });
    const [templateName, setTemplateName] = useState(template.name),
        [templateActive, setTemplateActive] = useState(!!template.active);
    const [mobilePanel, setMobilePanel] = useState<"canvas" | "layers" | "properties">("canvas");
    const [validation, setValidation] = useState<{svg: string; issues: {level: string; message: string}[]} | null>(null), [validating, setValidating] = useState(false);
    const [ready, setReady] = useState(false),
        [tick, setTick] = useState(0),
        [change, setChange] = useState(0),
        [selected, setSelected] = useState<DesignObject | null>(null),
        [sizeState, setSize] = useState(size.current),
        [zoom, setZoom] = useState(0.65),
        [status, setStatus] = useState("Guardado"),
        [error, setError] = useState(""),
        [panel, setPanel] = useState<"layers" | "assets" | "history">("layers"),
        [resourceOpen, setResourceOpen] = useState(false),
        [margin, setMargin] = useState(10),
        [guides, setGuides] = useState(true),
        [restore, setRestore] = useState<Version | null>(null),
        [recovery, setRecovery] = useState<string | null>(null),
        [versionList, setVersionList] = useState(versions),
        [backgroundNotice, setBackgroundNotice] = useState(false);
    const selection = () => {
        setSelected(
            (canvas.current?.getActiveObject() as DesignObject) ?? null,
        );
        setTick((t) => t + 1);
    };
    const serialize = () =>
        JSON.stringify({
            design: canvas.current?.toJSON(),
            width_mm: size.current.w,
            height_mm: size.current.h,
            name: meta.current.name,
            active: meta.current.active,
        });
    const changed = () => {
        if (suppress.current || !editable) return;
        const state = serialize();
        if (history.current[historyIndex.current] !== state) {
            history.current = history.current.slice(
                0,
                historyIndex.current + 1,
            );
            history.current.push(state);
            if (history.current.length > 80) history.current.shift();
            historyIndex.current = history.current.length - 1;
        }
        changeCounter.current++;
        setChange(changeCounter.current);
        setStatus("Cambios sin guardar");
        setTick((t) => t + 1);
    };
    function resize(w: number, h: number, z = zoom) {
        size.current = { w, h };
        setSize({ w, h });
        const c = canvas.current;
        if (c) {
            c.setDimensions({ width: px(w) * z, height: px(h) * z });
            c.setViewportTransform([z, 0, 0, z, 0, 0]);
            c.requestRenderAll();
        }
        setZoom(z);
    }
    function fit() {
        const w = workspace.current?.clientWidth ?? 1000,
            h = workspace.current?.clientHeight ?? 700;
        resize(
            size.current.w,
            size.current.h,
            Math.min(
                (w - 80) / px(size.current.w),
                (h - 80) / px(size.current.h),
                1.25,
            ),
        );
    }
    const save = useCallback(async () => {
        const c = canvas.current;
        if (!c || saving.current || !editable) return;
        const raw = serialize();
        if (raw === lastSaved.current) return;
        saving.current = true;
        setStatus("Guardando…");
        setError("");
        try {
            const payload = JSON.parse(raw);
            const r = await api<{ version: Version }>(
                "/plantillas/" + template.id + "/guardar",
                { ...payload, expected_version: currentVersion.current },
            );
            currentVersion.current = r.version.number;
            lastSaved.current = raw;
            setStatus("Guardado · v" + r.version.number);
            setVersionList((list) =>
                list.some((v) => v.id === r.version.id)
                    ? list
                    : [r.version, ...list],
            );
            localStorage.removeItem("certificate-template-" + template.id);
        } catch (e) {
            setError((e as Error).message);
            setStatus("No se pudo guardar");
            localStorage.setItem(
                "certificate-template-" + template.id,
                JSON.stringify({
                    baseVersion: currentVersion.current,
                    payload: raw,
                }),
            );
        } finally {
            saving.current = false;
        }
    }, [editable, template.id]);
    useEffect(() => {
        const c = new Canvas(element.current!, {
            preserveObjectStacking: true,
            selection: editable,
            backgroundColor: "#fff",
        });
        canvas.current = c;
        c.on("selection:created", selection);
        c.on("selection:updated", selection);
        c.on("selection:cleared", selection);
        c.on("object:modified", () => {
            changed();
            selection();
        });
        c.on("object:added", changed);
        c.on("object:removed", changed);
        c.on("text:changed", changed);
        c.on("object:moving", (e) => {
            if (!snap.current || !e.target) return;
            const o = e.target,
                w = px(size.current.w),
                h = px(size.current.h);
            const box = o.getBoundingRect();
            for (const x of [
                px(10),
                w / 2 - box.width / 2,
                w - px(10) - box.width,
            ])
                if (Math.abs((o.left ?? 0) - x) < 5) o.set("left", x);
            for (const y of [
                px(10),
                h / 2 - box.height / 2,
                h - px(10) - box.height,
            ])
                if (Math.abs((o.top ?? 0) - y) < 5) o.set("top", y);
        });
        (async () => {
            suppress.current = true;
            await document.fonts.ready;
            await c.loadFromJSON(version.design);
            if (!editable)
                c.getObjects().forEach((o) =>
                    o.set({ selectable: false, evented: false }),
                );
            suppress.current = false;
            fit();
            history.current = [serialize()];
            historyIndex.current = 0;
            lastSaved.current = serialize();
            setReady(true);
            const recovered = localStorage.getItem(
                "certificate-template-" + template.id,
            );
            if (recovered) setRecovery(recovered);
        })();
        return () => {
            void c.dispose();
            canvas.current = null;
        };
    }, []);
    useEffect(() => {
        if (!ready || !editable) return;
        const timer = setTimeout(() => {
            if (serialize() === lastSaved.current) return;
            localStorage.setItem(
                "certificate-template-" + template.id,
                JSON.stringify({
                    baseVersion: currentVersion.current,
                    payload: serialize(),
                }),
            );
            void save();
        }, 1800);
        return () => clearTimeout(timer);
    }, [change, ready, save]);
    useEffect(() => {
        const before = (e: BeforeUnloadEvent) => {
            if (canvas.current && serialize() !== lastSaved.current) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", before);
        return () => window.removeEventListener("beforeunload", before);
    }, []);
    useEffect(() => {
        function key(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement).tagName;
            if (
                ["INPUT", "TEXTAREA", "SELECT"].includes(tag) ||
                (canvas.current?.getActiveObject() as Textbox)?.isEditing
            )
                return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                void undo(e.shiftKey ? 1 : -1);
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                void save();
            }
            if ((e.key === "Delete" || e.key === "Backspace") && editable) {
                e.preventDefault();
                remove();
            }
        }
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    });
    async function loadState(raw: string) {
        const state = JSON.parse(raw);
        suppress.current = true;
        await canvas.current?.loadFromJSON(state.design);
        resize(Number(state.width_mm), Number(state.height_mm));
        suppress.current = false;
        selection();
        changed();
    }
    async function undo(direction: number) {
        const index = historyIndex.current + direction;
        if (index < 0 || index >= history.current.length) return;
        historyIndex.current = index;
        const raw = history.current[index];
        suppress.current = true;
        const state = JSON.parse(raw);
        await canvas.current?.loadFromJSON(state.design);
        resize(state.width_mm, state.height_mm);
        suppress.current = false;
        selection();
        changeCounter.current++;
        setChange(changeCounter.current);
        setStatus("Cambios sin guardar");
    }
    function add(o: FabricObject) {
        if (!editable) return;
        canvas.current?.add(o);
        canvas.current?.setActiveObject(o);
        canvas.current?.requestRenderAll();
        selection();
    }
    function text(field?: string) {
        if (field === "qr") {
            const qr = new Rect({
                left: 70,
                top: 70,
                width: 110,
                height: 110,
                fill: "#ffffff",
                stroke: "#122c45",
                strokeWidth: 2,
            }) as DesignObject;
            qr.field = "qr";
            qr.name = "QR automático";
            add(qr);
            return;
        }
        const t = new Textbox(
            field ? (samples[field] ?? field) : "Escribe tu texto",
            {
                left: 70,
                top: 90,
                width: 500,
                fontFamily: "Noto Sans",
                fontSize: field === "full_name" ? 30 : 18,
                fill: "#193c53",
                textAlign: "center",
                editable: !field,
            },
        ) as DesignObject;
        t.field = field;
        t.boxHeight = field === "issuer" ? 65 : 90;
        t.autoFit = true;
        t.minFontSize = 12;
        t.name = field ? fieldNames[field] : "Texto";
        add(t);
    }
    function setProp(key: string, value: unknown) {
        const o = canvas.current?.getActiveObject();
        if (!o || !editable) return;
        o.set(key as never, value as never);
        o.setCoords();
        canvas.current?.requestRenderAll();
        changed();
        selection();
    }
    function dimension(axis: "x" | "y", value: number) {
        if (!selected) return;
        if (axis === "x") {
            setProp("scaleX", Math.max(0.01, value / selected.width));
            if (selected.field === "qr")
                setProp("scaleY", Math.max(0.01, value / selected.height));
        } else {
            setProp("scaleY", Math.max(0.01, value / selected.height));
            if (selected.field === "qr")
                setProp("scaleX", Math.max(0.01, value / selected.width));
        }
    }
    async function addAsset(asset: Asset, background = false) {
        try {
            const img = await FabricImage.fromURL(
                "/recursos/" + asset.id + "/archivo",
            );
            const o = img as DesignObject;
            o.assetId = asset.id;
            o.name = asset.name;
            const slot = canvas.current?.getActiveObject() as DesignObject | undefined;
            if (slot?.resourceSlot && !background) {
                if (asset.kind !== slot.resourceSlot) { setError("Selecciona un recurso del tipo " + (slot.resourceSlot === "signature" ? "Imagen de firma" : "Sello") + "."); return; }
                if (slot.group) { setError("Desagrupa el área antes de asignar un recurso."); return; }
                const scale = Math.min(slot.getScaledWidth() / img.width, (slot.boxHeight ?? slot.getScaledHeight()) / img.height);
                o.set({left: slot.left, top: slot.top, scaleX: scale, scaleY: scale, angle: slot.angle});
                o.resourceSlot = slot.resourceSlot; o.requiredResource = slot.requiredResource;
                const index = canvas.current!.getObjects().indexOf(slot);
                canvas.current!.remove(slot); canvas.current!.insertAt(index, o); canvas.current!.setActiveObject(o); selection();
            } else if (background) {
                o.set({
                    left: 0,
                    top: 0,
                    scaleX: px(size.current.w) / img.width,
                    scaleY: px(size.current.h) / img.height,
                    lockMovementX: true,
                    lockMovementY: true,
                    lockScalingX: true,
                    lockScalingY: true,
                    lockRotation: true,
                });
                add(o);
                canvas.current?.sendObjectToBack(o);
                setBackgroundNotice(true);
            } else {
                o.set({ left: 70, top: 70 });
                o.scaleToWidth(Math.min(220, px(size.current.w) / 3));
                add(o);
            }
            canvas.current?.requestRenderAll();
            changed();
            setResourceOpen(false);
        } catch {
            setError("No se pudo cargar la imagen. Comprueba tus permisos.");
        }
    }
    function remove() {
        const c = canvas.current;
        if (!c || !editable) return;
        c.getActiveObjects().forEach((o) => c.remove(o));
        c.discardActiveObject();
        c.requestRenderAll();
        selection();
    }
    async function duplicate() {
        const c = canvas.current,
            o = c?.getActiveObject();
        if (!c || !o) return;
        const cloned = await o.clone();
        cloned.set({ left: o.left + 15, top: o.top + 15 });
        c.discardActiveObject();
        add(cloned);
    }
    function lock() {
        const value = !selected?.lockMovementX;
        for (const key of [
            "lockMovementX",
            "lockMovementY",
            "lockScalingX",
            "lockScalingY",
            "lockRotation",
        ])
            setProp(key, value);
    }
    function group() {
        const c = canvas.current,
            o = c?.getActiveObject();
        if (!c || !o) return;
        if (o instanceof ActiveSelection) {
            const objects = o.getObjects();
            c.discardActiveObject();
            suppress.current = true;
            objects.forEach((x) => c.remove(x));
            const g = new Group(objects);
            c.add(g);
            c.setActiveObject(g);
            suppress.current = false;
            changed();
            selection();
        } else if (o instanceof Group) {
            suppress.current = true;
            const objects = o.removeAll();
            c.remove(o);
            objects.forEach((x) => c.add(x));
            suppress.current = false;
            changed();
            selection();
        }
        c.requestRenderAll();
    }
    function align(axis: "x" | "y") {
        const c = canvas.current;
        if (!c || !selected) return;
        const b = selected.getBoundingRect();
        setProp(
            axis === "x" ? "left" : "top",
            axis === "x"
                ? (px(size.current.w) - b.width) / 2
                : (px(size.current.h) - b.height) / 2,
        );
    }
    const objects = (canvas.current?.getObjects() ?? []) as DesignObject[];
    const out = objects.filter((o) => {
        const b = o.getBoundingRect();
        return (
            b.left < 0 ||
            b.top < 0 ||
            b.left + b.width > px(sizeState.w) + 1 ||
            b.top + b.height > px(sizeState.h) + 1
        );
    });
    const objectText = selected?.type.toLowerCase() === "textbox";
    return (
        <div className="editor-shell">
            <Head title={"Editor · " + template.name} />
            <header className="editor-header">
                <Link
                    href="/plantillas"
                    className="icon-button"
                    aria-label="Volver a plantillas"
                >
                    <ArrowLeft size={18} />
                </Link>
                <div>
                    <h1>
                        {editable ? (
                            <input
                                className="editor-title-input"
                                aria-label="Nombre de la plantilla"
                                value={templateName}
                                onChange={(e) => {
                                    setTemplateName(e.target.value);
                                    meta.current.name = e.target.value;
                                    changed();
                                }}
                            />
                        ) : (
                            template.name
                        )}
                    </h1>
                    <small>
                        Editor de certificados ·{" "}
                        {editable
                            ? "Diseño editable"
                            : "Plantilla institucional de consulta"}
                    </small>
                </div>
                <span
                    className={
                        "save-state " + (status.startsWith("No") ? "error" : "")
                    }
                >
                    {status === "Guardando…" ? (
                        <LoaderCircle size={13} className="spin" />
                    ) : (
                        <Check size={13} />
                    )}{" "}
                    {status}
                </span>
                <Button secondary onClick={() => {setPanel("history"); setMobilePanel("layers");}}>
                    <History size={15} />
                    Versiones
                </Button>
                <Button secondary disabled={validating || !ready} onClick={async () => {setValidating(true); setError(""); try {setValidation(await api("/plantillas/" + template.id + "/previsualizar", JSON.parse(serialize())));} catch(e) {setError((e as Error).message);} finally {setValidating(false);}}}>{validating ? "Validando…" : "Validar diseño"}</Button>
                {editable && (
                    <Button onClick={() => void save()}>
                        <Save size={15} />
                        Guardar
                    </Button>
                )}
            </header>
            {error && (
                <div className="editor-alert" role="alert">
                    {error}
                </div>
            )}
            {out.length > 0 && (
                <div className="editor-alert warning">
                    {out.length} elemento(s) fuera de la página. Reorganízalos
                    antes de emitir.
                </div>
            )}
            {backgroundNotice && (
                <div className="editor-alert info">
                    La imagen de fondo es un solo elemento. Sus textos y logos
                    internos no se convierten en objetos editables.
                    <button
                        onClick={() => setBackgroundNotice(false)}
                        aria-label="Cerrar aviso"
                    >
                        ×
                    </button>
                </div>
            )}
            <div className="editor-toolbar">
                <div className="tool-group">
                    <button
                        title="Deshacer (Ctrl+Z)"
                        disabled={!editable || historyIndex.current <= 0}
                        onClick={() => void undo(-1)}
                    >
                        <Undo2 size={17} />
                    </button>
                    <button
                        title="Rehacer (Ctrl+Shift+Z)"
                        disabled={
                            !editable ||
                            historyIndex.current >= history.current.length - 1
                        }
                        onClick={() => void undo(1)}
                    >
                        <Redo2 size={17} />
                    </button>
                </div>
                <div className="tool-group">
                    <button disabled={!editable} onClick={() => text()}>
                        <Type size={17} />
                        Texto
                    </button>
                    <select
                        aria-label="Insertar campo automático"
                        disabled={!editable}
                        value=""
                        onChange={(e) => text(e.target.value)}
                    >
                        <option value="">+ Campo automático</option>
                        {fields
                            .filter((f) => f !== "qr")
                            .map((f) => (
                                <option key={f} value={f}>
                                    {fieldNames[f] ?? f}
                                </option>
                            ))}
                    </select>
                    <button disabled={!editable} onClick={() => text("qr")}>
                        <QrCode size={17} />
                        QR
                    </button>
                    <button
                        disabled={!editable}
                        onClick={() => setResourceOpen(true)}
                    >
                        <ImageIcon size={17} />
                        Imagen
                    </button>
                </div>
                <div className="tool-group">
                    <button
                        disabled={!editable}
                        title="Rectángulo"
                        onClick={() =>
                            add(
                                new Rect({
                                    left: 60,
                                    top: 60,
                                    width: 220,
                                    height: 110,
                                    fill: "transparent",
                                    stroke: "#1b5670",
                                    strokeWidth: 2,
                                }),
                            )
                        }
                    >
                        <Square size={17} />
                    </button>
                    <button
                        disabled={!editable}
                        title="Círculo"
                        onClick={() =>
                            add(
                                new Circle({
                                    left: 70,
                                    top: 70,
                                    radius: 45,
                                    fill: "transparent",
                                    stroke: "#1b5670",
                                    strokeWidth: 2,
                                }),
                            )
                        }
                    >
                        <CircleIcon size={17} />
                    </button>
                    <button
                        disabled={!editable}
                        title="Línea"
                        onClick={() =>
                            add(
                                new Line([0, 0, 220, 0], {
                                    left: 60,
                                    top: 60,
                                    stroke: "#1b5670",
                                    strokeWidth: 2,
                                }),
                            )
                        }
                    >
                        ╱
                    </button>
                </div>
                <div className="tool-group">
                    <button
                        disabled={!editable || !selected}
                        title="Duplicar elemento"
                        onClick={() => void duplicate()}
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        disabled={!editable || !selected}
                        title={
                            selected instanceof Group
                                ? "Desagrupar"
                                : "Agrupar selección múltiple"
                        }
                        onClick={group}
                    >
                        {selected instanceof Group ? (
                            <Ungroup size={17} />
                        ) : (
                            <GroupIcon size={17} />
                        )}
                    </button>
                    <button
                        disabled={!editable || !selected}
                        title="Bloquear o desbloquear"
                        onClick={lock}
                    >
                        {selected?.lockMovementX ? (
                            <LockKeyhole size={16} />
                        ) : (
                            <UnlockKeyhole size={16} />
                        )}
                    </button>
                    <button
                        disabled={!editable || !selected}
                        title="Eliminar"
                        onClick={remove}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className="tool-group">
                    <button
                        disabled={!editable || !selected}
                        title="Centrar horizontalmente"
                        onClick={() => align("x")}
                    >
                        <AlignHorizontalJustifyCenter size={17} />
                    </button>
                    <button
                        disabled={!editable || !selected}
                        title="Centrar verticalmente"
                        onClick={() => align("y")}
                    >
                        <AlignVerticalJustifyCenter size={17} />
                    </button>
                </div>
                <label className="check-label">
                    <input
                        type="checkbox"
                        checked={guides}
                        onChange={(e) => {
                            setGuides(e.target.checked);
                            snap.current = e.target.checked;
                        }}
                    />
                    Guías
                </label>
            </div>
            <div className="editor-mobile-tabs" role="group" aria-label="Paneles del editor">{([["canvas", "Diseño"], ["layers", "Capas y recursos"], ["properties", "Propiedades"]] as const).map(([key, label]) => <button key={key} className={mobilePanel === key ? "active" : ""} onClick={() => { setMobilePanel(key); if (key === "canvas") requestAnimationFrame(fit); }}>{label}</button>)}</div>
            <div className="editor-body" data-mobile-panel={mobilePanel}>
                <aside className="editor-left">
                    <div className="editor-side-tabs">
                        {[
                            ["layers", Layers],
                            ["assets", ImageIcon],
                            ["history", History],
                        ].map(([key, I]) => {
                            const Icon = I as typeof Layers;
                            return (
                                <button
                                    key={key as string}
                                    title={
                                        {
                                            layers: "Capas",
                                            assets: "Recursos",
                                            history: "Versiones",
                                        }[key as string]
                                    }
                                    className={panel === key ? "active" : ""}
                                    onClick={() =>
                                        setPanel(key as typeof panel)
                                    }
                                >
                                    <Icon size={17} />
                                </button>
                            );
                        })}
                    </div>
                    {panel === "layers" ? (
                        <>
                            <div className="editor-panel-heading">
                                <h2>Capas</h2>
                                <small>{objects.length} elementos</small>
                            </div>
                            {objects.length ? (
                                <div className="layer-list">
                                    {[...objects].reverse().map((o, i) => (
                                        <button
                                            key={i}
                                            className={
                                                selected === o ? "active" : ""
                                            }
                                            onClick={() => {
                                                canvas.current?.setActiveObject(
                                                    o,
                                                );
                                                canvas.current?.requestRenderAll();
                                                selection();
                                            }}
                                        >
                                            <GripVertical size={13} />
                                            {o.field === "qr" ? (
                                                <QrCode size={15} />
                                            ) : o instanceof FabricImage ? (
                                                <ImageIcon size={15} />
                                            ) : o instanceof Textbox ? (
                                                <Type size={15} />
                                            ) : (
                                                <Square size={15} />
                                            )}
                                            <span>
                                                {o.name ??
                                                    (o.field
                                                        ? fieldNames[o.field]
                                                        : (o.text?.slice(
                                                              0,
                                                              23,
                                                          ) ?? o.type))}
                                            </span>
                                            {o.lockMovementX && (
                                                <LockKeyhole size={12} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="editor-help">
                                    Tu hoja está en blanco. Inserta texto,
                                    campos automáticos, imágenes o formas desde
                                    la barra.
                                </div>
                            )}
                            <div className="editor-help">
                                Selecciona varios elementos con Shift para
                                agruparlos. Los campos automáticos reciben sus
                                valores del servidor.
                            </div>
                        </>
                    ) : panel === "assets" ? (
                        <>
                            <div className="editor-panel-heading">
                                <h2>Recursos</h2>
                                <Link href="/recursos" className="text-link">
                                    Gestionar →
                                </Link>
                            </div>
                            <div className="editor-assets">
                                {assets.map((a) => (
                                    <button
                                        disabled={!editable}
                                        key={a.id}
                                        onClick={() => void addAsset(a)}
                                    >
                                        <img
                                            src={
                                                "/recursos/" + a.id + "/archivo"
                                            }
                                            alt={a.name}
                                        />
                                        <span>{a.name}</span>
                                    </button>
                                ))}
                            </div>
                            {!assets.length && (
                                <div className="editor-help">
                                    Sube logos, firmas, sellos o fondos en
                                    Recursos gráficos.
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="editor-panel-heading">
                                <h2>Versiones</h2>
                            </div>
                            <div className="version-list">
                                {versionList.map((v) => (
                                    <button
                                        key={v.id}
                                        disabled={!editable}
                                        onClick={() => setRestore(v)}
                                    >
                                        <History size={15} />
                                        <span>
                                            Versión {v.number}
                                            <small>
                                                {new Date(
                                                    v.created_at,
                                                ).toLocaleString("es-BO", {timeZone: "America/La_Paz"})}
                                            </small>
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <div className="editor-help">
                                Recuperar crea una nueva versión al guardar. Los
                                documentos emitidos mantienen su diseño
                                original.
                            </div>
                        </>
                    )}
                </aside>
                <div className="editor-workspace" ref={workspace}>
                    <div
                        className="canvas-paper"
                        style={{
                            width: px(sizeState.w) * zoom,
                            height: px(sizeState.h) * zoom,
                        }}
                    >
                        <canvas ref={element} />
                        {guides && (
                            <div
                                className="margin-guide"
                                style={{ inset: px(margin) * zoom }}
                            />
                        )}
                    </div>
                    {!ready && (
                        <div className="canvas-loading">Abriendo diseño…</div>
                    )}
                </div>
                <aside className="editor-properties">
                    <div className="editor-panel-heading">
                        <h2>{selected ? "Propiedades" : "Página"}</h2>
                        {selected && (
                            <span className="badge">
                                {selected.field ? "Automático" : selected.type}
                            </span>
                        )}
                    </div>
                    {selected ? (
                        <div className="properties-form">
                            {selected.resourceSlot && <div className="resource-slot-controls"><strong>{selected.resourceSlot === "signature" ? "Firma autorizada" : "Sello autorizado"}</strong><label className="check-label"><input type="checkbox" checked={!!selected.requiredResource} disabled={!editable} onChange={e => setProp("requiredResource", e.target.checked)} />Obligatorio para emitir</label><Button secondary disabled={!editable} onClick={() => setResourceOpen(true)}>{selected.assetId ? "Sustituir archivo" : "Asignar archivo autorizado"}</Button><small className="help-text">Sube el archivo en Recursos gráficos. Un área opcional sin archivo no se imprime.</small></div>}
                            {selected.field === "hours" && <><Field label="Texto anterior al valor"><input value={selected.fieldPrefix ?? ""} onChange={e => setProp("fieldPrefix", e.target.value)} disabled={!editable}/></Field><Field label="Texto posterior al valor"><input value={selected.fieldSuffix ?? ""} onChange={e => setProp("fieldSuffix", e.target.value)} disabled={!editable}/></Field><label className="check-label"><input type="checkbox" checked={!!selected.hideIfEmpty} onChange={e => setProp("hideIfEmpty", e.target.checked)} disabled={!editable} />Ocultar si no hay carga horaria</label></>}
                            <div className="property-grid">
                                <Field label="X (px)">
                                    <input
                                        type="number"
                                        step=".5"
                                        value={
                                            Math.round(selected.left * 10) / 10
                                        }
                                        disabled={!editable}
                                        onChange={(e) =>
                                            setProp(
                                                "left",
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Y (px)">
                                    <input
                                        type="number"
                                        step=".5"
                                        value={
                                            Math.round(selected.top * 10) / 10
                                        }
                                        disabled={!editable}
                                        onChange={(e) =>
                                            setProp(
                                                "top",
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Ancho (px)">
                                    <input
                                        type="number"
                                        min="1"
                                        value={Math.round(
                                            selected.getScaledWidth(),
                                        )}
                                        disabled={!editable}
                                        onChange={(e) =>
                                            dimension(
                                                "x",
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Alto (px)">
                                    <input
                                        type="number"
                                        min="1"
                                        value={Math.round(
                                            selected.getScaledHeight(),
                                        )}
                                        disabled={!editable}
                                        onChange={(e) =>
                                            dimension(
                                                "y",
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Giro (°)">
                                    <input
                                        type="number"
                                        value={Math.round(selected.angle)}
                                        disabled={!editable}
                                        onChange={(e) =>
                                            setProp(
                                                "angle",
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Opacidad (%)">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={Math.round(
                                            selected.opacity * 100,
                                        )}
                                        disabled={!editable}
                                        onChange={(e) =>
                                            setProp(
                                                "opacity",
                                                Math.max(
                                                    0,
                                                    Math.min(
                                                        1,
                                                        Number(e.target.value) /
                                                            100,
                                                    ),
                                                ),
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                            {objectText && (
                                <>
                                    {selected.field ? (
                                        <div className="editor-field-note">
                                            <strong>
                                                {fieldNames[selected.field]}
                                            </strong>
                                            <p>
                                                Valor automático procedente de
                                                los registros. No se introduce
                                                manualmente.
                                            </p>
                                        </div>
                                    ) : (
                                        <Field label="Contenido">
                                            <textarea
                                                value={selected.text ?? ""}
                                                disabled={!editable}
                                                onChange={(e) =>
                                                    setProp(
                                                        "text",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                    )}
                                    <Field label="Tipografía">
                                        <select
                                            value={selected.fontFamily}
                                            disabled={!editable}
                                            onChange={(e) =>
                                                setProp(
                                                    "fontFamily",
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option>Noto Sans</option>
                                            <option value="serif">
                                                Serif del servidor
                                            </option>
                                            <option value="sans-serif">
                                                Sans serif del servidor
                                            </option>
                                        </select>
                                    </Field>
                                    <div className="property-grid">
                                        <Field label="Tamaño (px)">
                                            <input
                                                type="number"
                                                min="6"
                                                max="200"
                                                value={selected.fontSize ?? 18}
                                                onChange={(e) =>
                                                    setProp(
                                                        "fontSize",
                                                        Number(e.target.value),
                                                    )
                                                }
                                            />
                                        </Field>
                                        <Field label="Peso">
                                            <select
                                                value={selected.fontWeight}
                                                onChange={(e) =>
                                                    setProp(
                                                        "fontWeight",
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="400">
                                                    Regular
                                                </option>
                                                <option value="700">
                                                    Negrita
                                                </option>
                                            </select>
                                        </Field>
                                        <Field label="Estilo">
                                            <select
                                                value={
                                                    selected.fontStyle ??
                                                    "normal"
                                                }
                                                onChange={(e) =>
                                                    setProp(
                                                        "fontStyle",
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="normal">
                                                    Normal
                                                </option>
                                                <option value="italic">
                                                    Cursiva
                                                </option>
                                            </select>
                                        </Field>
                                        <Field label="Alineación">
                                            <select
                                                value={
                                                    selected.textAlign ?? "left"
                                                }
                                                onChange={(e) =>
                                                    setProp(
                                                        "textAlign",
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="left">
                                                    Izquierda
                                                </option>
                                                <option value="center">
                                                    Centro
                                                </option>
                                                <option value="right">
                                                    Derecha
                                                </option>
                                                <option value="justify">
                                                    Justificar
                                                </option>
                                            </select>
                                        </Field>
                                        <Field label="Interlineado">
                                            <input
                                                type="number"
                                                min=".5"
                                                max="4"
                                                step=".1"
                                                value={
                                                    selected.lineHeight ?? 1.16
                                                }
                                                onChange={(e) =>
                                                    setProp(
                                                        "lineHeight",
                                                        Number(e.target.value),
                                                    )
                                                }
                                            />
                                        </Field>
                                        <Field label="Espaciado (‰)">
                                            <input
                                                type="number"
                                                value={
                                                    selected.charSpacing ?? 0
                                                }
                                                onChange={(e) =>
                                                    setProp(
                                                        "charSpacing",
                                                        Number(e.target.value),
                                                    )
                                                }
                                            />
                                        </Field>
                                    </div>
                                    <label className="check-label">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selected.underline ?? false
                                            }
                                            onChange={(e) =>
                                                setProp(
                                                    "underline",
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                        Subrayado
                                    </label>
                                    <Field label="Altura del área de texto (px)">
                                        <input
                                            type="number"
                                            min="10"
                                            value={selected.boxHeight ?? 90}
                                            onChange={(e) =>
                                                setProp(
                                                    "boxHeight",
                                                    Number(e.target.value),
                                                )
                                            }
                                        />
                                    </Field>
                                    <label className="check-label">
                                        <input
                                            type="checkbox"
                                            checked={selected.autoFit ?? false}
                                            onChange={(e) =>
                                                setProp(
                                                    "autoFit",
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                        Reducir para ajustar al área
                                    </label>
                                    <Field label="Tamaño mínimo de ajuste (px)">
                                        <input
                                            type="number"
                                            min="8"
                                            value={selected.minFontSize ?? 12}
                                            onChange={(e) =>
                                                setProp(
                                                    "minFontSize",
                                                    Number(e.target.value),
                                                )
                                            }
                                        />
                                    </Field>
                                </>
                            )}
                            {!(selected instanceof FabricImage) &&
                                selected.field !== "qr" && (
                                    <div className="property-grid">
                                        <Field
                                            label={
                                                objectText
                                                    ? "Color del texto"
                                                    : "Relleno"
                                            }
                                        >
                                            <input
                                                type="color"
                                                value={
                                                    typeof selected.fill ===
                                                        "string" &&
                                                    selected.fill.startsWith(
                                                        "#",
                                                    )
                                                        ? selected.fill
                                                        : "#ffffff"
                                                }
                                                onChange={(e) =>
                                                    setProp(
                                                        "fill",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                        <Field label="Borde">
                                            <input
                                                type="color"
                                                value={
                                                    typeof selected.stroke ===
                                                        "string" &&
                                                    selected.stroke.startsWith(
                                                        "#",
                                                    )
                                                        ? selected.stroke
                                                        : "#193c53"
                                                }
                                                onChange={(e) =>
                                                    setProp(
                                                        "stroke",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                        <Field label="Grosor del borde">
                                            <input
                                                type="number"
                                                min="0"
                                                max="30"
                                                step=".5"
                                                value={selected.strokeWidth}
                                                onChange={(e) =>
                                                    setProp(
                                                        "strokeWidth",
                                                        Number(e.target.value),
                                                    )
                                                }
                                            />
                                        </Field>
                                        <Button
                                            secondary
                                            onClick={() =>
                                                setProp("fill", "transparent")
                                            }
                                        >
                                            Sin relleno
                                        </Button>
                                    </div>
                                )}
                            {selected.field === "qr" && (
                                <div className="editor-field-note">
                                    Marcador de QR. El servidor lo reemplazará
                                    por el código real en blanco y negro con
                                    margen. Mínimo 25 × 25 mm; ubicar en la capa
                                    superior.
                                </div>
                            )}
                            <div className="inline">
                                <Button
                                    secondary
                                    disabled={!editable}
                                    onClick={() => {
                                        canvas.current?.bringObjectForward(
                                            selected,
                                        );
                                        changed();
                                        canvas.current?.requestRenderAll();
                                    }}
                                >
                                    <ArrowUp size={14} />
                                    Delante
                                </Button>
                                <Button
                                    secondary
                                    disabled={!editable}
                                    onClick={() => {
                                        canvas.current?.sendObjectBackwards(
                                            selected,
                                        );
                                        changed();
                                        canvas.current?.requestRenderAll();
                                    }}
                                >
                                    <ArrowDown size={14} />
                                    Atrás
                                </Button>
                            </div>
                            <Button
                                secondary
                                onClick={() => {
                                    canvas.current?.discardActiveObject();
                                    canvas.current?.requestRenderAll();
                                    selection();
                                }}
                            >
                                Ver propiedades de página
                            </Button>
                        </div>
                    ) : (
                        <div className="properties-form">
                            <label className="check-label">
                                <input
                                    type="checkbox"
                                    disabled={!editable}
                                    checked={templateActive}
                                    onChange={(e) => {
                                        setTemplateActive(e.target.checked);
                                        meta.current.active = e.target.checked;
                                        changed();
                                    }}
                                />
                                Plantilla activa para emisión
                            </label>
                            <Field label="Formato de página">
                                <select
                                    disabled={!editable}
                                    value=""
                                    onChange={(e) => {
                                        const [w, h] = e.target.value
                                            .split("x")
                                            .map(Number);
                                        resize(w, h);
                                        changed();
                                    }}
                                >
                                    <option value="">
                                        Personalizado / seleccionar
                                    </option>
                                    <option value="297x210">
                                        A4 horizontal
                                    </option>
                                    <option value="210x297">A4 vertical</option>
                                    <option value="279.4x215.9">
                                        Carta horizontal
                                    </option>
                                    <option value="215.9x279.4">
                                        Carta vertical
                                    </option>
                                    <option value="420x297">
                                        A3 horizontal
                                    </option>
                                    <option value="297x420">A3 vertical</option>
                                </select>
                            </Field>
                            <div className="property-grid">
                                <Field label="Ancho (mm)">
                                    <input
                                        type="number"
                                        min="100"
                                        max="600"
                                        step=".1"
                                        disabled={!editable}
                                        value={sizeState.w}
                                        onChange={(e) => {
                                            resize(
                                                Number(e.target.value),
                                                sizeState.h,
                                            );
                                            changed();
                                        }}
                                    />
                                </Field>
                                <Field label="Alto (mm)">
                                    <input
                                        type="number"
                                        min="100"
                                        max="600"
                                        step=".1"
                                        disabled={!editable}
                                        value={sizeState.h}
                                        onChange={(e) => {
                                            resize(
                                                sizeState.w,
                                                Number(e.target.value),
                                            );
                                            changed();
                                        }}
                                    />
                                </Field>
                            </div>
                            <Button
                                secondary
                                disabled={!editable}
                                onClick={() => {
                                    resize(sizeState.h, sizeState.w);
                                    fit();
                                    changed();
                                }}
                            >
                                Cambiar orientación
                            </Button>
                            <p className="help-text">
                                Cambiar las dimensiones conserva las posiciones.
                                Reorganiza los elementos que queden fuera de la
                                página.
                            </p>
                            <Field label="Guía de margen (mm)">
                                <input
                                    type="number"
                                    min="0"
                                    max="40"
                                    value={margin}
                                    onChange={(e) =>
                                        setMargin(Number(e.target.value))
                                    }
                                />
                            </Field>
                            <Button
                                secondary
                                disabled={!editable}
                                onClick={() => setResourceOpen(true)}
                            >
                                <ImageIcon size={14} />
                                Insertar imagen o fondo
                            </Button>
                            <div className="editor-field-note">
                                Las fechas de emisión y vencimiento, el
                                identificador y el QR se generan al emitir. Un
                                borrador no es un certificado válido.
                            </div>
                        </div>
                    )}
                </aside>
            </div>
            <footer className="editor-footer">
                <span>
                    <MousePointer2 size={13} /> {objects.length} elementos ·{" "}
                    {sizeState.w} × {sizeState.h} mm
                </span>
                <span>Diseño editable · Guardado automático</span>
                <div>
                    <button
                        title="Alejar"
                        onClick={() =>
                            resize(
                                sizeState.w,
                                sizeState.h,
                                Math.max(0.15, zoom - 0.1),
                            )
                        }
                    >
                        <ZoomOut size={16} />
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                        title="Acercar"
                        onClick={() =>
                            resize(
                                sizeState.w,
                                sizeState.h,
                                Math.min(2.5, zoom + 0.1),
                            )
                        }
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button title="Ajustar al área" onClick={fit}>
                        <Maximize size={16} />
                    </button>
                </div>
            </footer>
            <Modal
                title="Insertar recurso de la biblioteca"
                open={resourceOpen}
                onClose={() => setResourceOpen(false)}
            >
                <p className="help-text" style={{ marginBottom: 20 }}>
                    Los fondos son imágenes únicas; sus textos internos no son
                    editables.
                </p>
                <div className="editor-assets resource-modal">
                    {assets.map((a) => (
                        <div key={a.id}>
                            <img
                                src={"/recursos/" + a.id + "/archivo"}
                                alt={a.name}
                            />
                            <strong>{a.name}</strong>
                            <div className="inline">
                                <Button
                                    secondary
                                    onClick={() => void addAsset(a)}
                                >
                                    Insertar
                                </Button>
                                <Button
                                    secondary
                                    onClick={() => void addAsset(a, true)}
                                >
                                    Usar de fondo
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                {!assets.length && (
                    <Link className="button secondary" href="/recursos">
                        Subir recursos a la biblioteca
                    </Link>
                )}
            </Modal>
            <Modal title="Validación del borrador" open={!!validation} onClose={() => setValidation(null)}>{validation && <><div className="review-preview"><img alt="Previsualización del diseño con datos pendientes de emisión" src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(validation.svg)} /></div><div className="notice" style={{marginTop: 16}}>Vista de diseño sin destinatario. La emisión revisará nuevamente los datos reales seleccionados.</div>{validation.issues.length ? validation.issues.map((issue, i) => <div key={i} className={"notice " + (issue.level === "error" ? "danger" : "warning")}>{issue.message}</div>) : <div className="notice success">Diseño sin incidencias con estos textos de referencia.</div>}</>}</Modal>
            <Modal
                title="Recuperar una versión anterior"
                open={!!restore}
                onClose={() => setRestore(null)}
            >
                <p className="help-text">
                    Se abrirá la versión {restore?.number}. Al guardar se creará
                    una versión nueva; ningún certificado emitido cambiará.
                </p>
                <div className="form-actions">
                    <Button secondary onClick={() => setRestore(null)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={async () => {
                            if (!restore) return;
                            try {
                                const v = await api<Version>(
                                    "/plantillas/" +
                                        template.id +
                                        "/versiones/" +
                                        restore.id,
                                );
                                await loadState(
                                    JSON.stringify({
                                        design: v.design,
                                        width_mm: v.width_mm,
                                        height_mm: v.height_mm,
                                    }),
                                );
                                setRestore(null);
                            } catch (e) {
                                setError((e as Error).message);
                            }
                        }}
                    >
                        Recuperar versión
                    </Button>
                </div>
            </Modal>
            <Modal
                title="Hay un diseño local sin guardar"
                open={!!recovery}
                onClose={() => setRecovery(null)}
            >
                <p className="help-text">
                    Se encontró una recuperación de esta plantilla. Puedes
                    abrirla y guardarla como una nueva versión, o descartarla
                    para conservar la versión del servidor.
                </p>
                <div className="form-actions">
                    <Button
                        secondary
                        onClick={() => {
                            localStorage.removeItem(
                                "certificate-template-" + template.id,
                            );
                            setRecovery(null);
                        }}
                    >
                        Descartar recuperación
                    </Button>
                    <Button
                        onClick={async () => {
                            if (recovery) {
                                const recovered = JSON.parse(recovery);
                                await loadState(recovered.payload);
                                setRecovery(null);
                            }
                        }}
                    >
                        Recuperar diseño
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
