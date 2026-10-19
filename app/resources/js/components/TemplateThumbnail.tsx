import { useEffect, useRef, useState } from "react";
import { StaticCanvas, FabricObject } from "fabric";
import type { Version } from "../types";

export default function TemplateThumbnail({ version, name, large = false }: { version: Version; name: string; large?: boolean }) {
    const host = useRef<HTMLDivElement>(null);
    const [image, setImage] = useState(""), [error, setError] = useState("");
    useEffect(() => {
        let alive = true;
        const observer = new IntersectionObserver(async (entries) => {
            if (!entries.some(e => e.isIntersecting)) return;
            observer.disconnect();
            const width = Number(version.width_mm) * 96 / 25.4, height = Number(version.height_mm) * 96 / 25.4;
            FabricObject.ownDefaults.originX = "left";
            FabricObject.ownDefaults.originY = "top";
            const canvas = new StaticCanvas(document.createElement("canvas"), { width, height, enableRetinaScaling: false, renderOnAddRemove: false });
            try {
                await document.fonts.ready;
                await canvas.loadFromJSON(version.design);
                canvas.renderAll();
                const png = canvas.toDataURL({ format: "png", multiplier: Math.min(1, (large ? 1200 : 650) / width) });
                if (alive) setImage(png);
            } catch { if (alive) setError("No se pudo cargar la miniatura. Abre el editor para revisar sus recursos."); }
            finally { await canvas.dispose(); }
        }, { rootMargin: "150px" });
        if (host.current) observer.observe(host.current);
        return () => { alive = false; observer.disconnect(); };
    }, [version.id, large]);
    return <div className={"template-thumbnail " + (large ? "preview-large" : "")} ref={host}>
        {image ? <img src={image} alt={"Diseño guardado: " + name} /> : <span className="loading" role="status">{error || "Cargando diseño…"}</span>}
    </div>;
}
