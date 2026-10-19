import { useState } from "react";
import { Link, router, useForm } from "@inertiajs/react";
import { Plus, Copy, ArrowUpRight, Eye, Search } from "lucide-react";
import TemplateThumbnail from "../components/TemplateThumbnail";
import Layout from "../components/Layout";
import {
    PageTitle,
    Button,
    Modal,
    Field,
    Errors,
    Empty,
    Pager,
} from "../components/UI";
import type { Template, Career, Pagination } from "../types";
export default function Templates({
    templates,
    careers,
    filters = {},
}: {
    templates: Pagination<Template>;
    careers: Career[];
    filters?: {q?: string; career_id?: string; state?: string};
}) {
    const [preview, setPreview] = useState<Template | null>(null);
    const [query, setQuery] = useState(filters.q ?? ""), [careerFilter, setCareerFilter] = useState(filters.career_id ?? ""), [state, setState] = useState(filters.state ?? "active");
    const [open, setOpen] = useState(false),
        f = useForm({
            name: "",
            career_id: (careers[0]?.id ?? "") as number | string,
            width_mm: 297,
            height_mm: 210,
        });
    return (
        <Layout>
            <PageTitle
                title="Plantillas y editor"
                description="Diseña una vez, personaliza con datos reales y conserva cada versión."
                action={
                    <Button onClick={() => setOpen(true)}>
                        <Plus size={16} />
                        Crear plantilla
                    </Button>
                }
            />
            <form className="filterbar" onSubmit={e => {e.preventDefault(); router.get('/plantillas', {q: query, career_id: careerFilter, state}, {preserveState: true, replace: true});}}>
                <Field label="Buscar plantilla"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre de la plantilla" /></Field>
                <Field label="Carrera"><select value={careerFilter} onChange={e => setCareerFilter(e.target.value)}><option value="">Todas las carreras de mi ámbito</option>{careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
                <Field label="Estado"><select value={state} onChange={e => setState(e.target.value)}><option value="active">Activas</option><option value="inactive">Inactivas</option><option value="all">Todas</option></select></Field>
                <Button secondary><Search size={16} />Filtrar</Button>
            </form>
            {templates.data.length ? (
                <>
                    <div className="template-grid">
                        {templates.data.map((t) => (
                            <div className="template-card" key={t.id}>
                                <button
                                    onClick={() => setPreview(t)} aria-label={"Previsualizar " + t.name}
                                    className="template-preview"
                                >
                                    <TemplateThumbnail version={t.latest_version} name={t.name} />
                                </button>
                                <div className="template-info">
                                    <h3>{t.name}</h3>
                                    <p>
                                        {t.latest_version.width_mm} ×{" "}
                                        {t.latest_version.height_mm} mm ·
                                        Versión {t.latest_version.number}
                                    </p>
                                    <p>
                                        {t.career_id
                                            ? careers.find(
                                                  (c) => c.id === t.career_id,
                                              )?.name
                                            : "Recurso institucional global"}
                                    </p>
                                    <div className="template-preview-meta"><span className={"badge " + (t.active ? "vigente" : "draft")}>{t.active ? "Activa" : "Inactiva"}</span><span className="help-text">{Number(t.latest_version.width_mm) >= Number(t.latest_version.height_mm) ? "Horizontal" : "Vertical"}</span></div>
                                </div>
                                <div className="template-actions">
                                    <button className="icon-button" onClick={() => setPreview(t)} aria-label={"Previsualizar " + t.name}><Eye size={16} /></button>
                                    <Link
                                        className="text-link inline"
                                        href={"/plantillas/" + t.id + "/editor"}
                                    >
                                        Abrir editor
                                        <ArrowUpRight size={14} />
                                    </Link>
                                    <button
                                        className="icon-button"
                                        aria-label="Duplicar plantilla"
                                        onClick={() =>
                                            router.post(
                                                "/plantillas/" +
                                                    t.id +
                                                    "/duplicar",
                                            )
                                        }
                                    >
                                        <Copy size={14} />
                                    </button>
                                    {t.active && <Link className="text-link use-template" href={"/emision?template_id=" + t.id}>Usar →</Link>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pager page={templates} />
                </>
            ) : (
                <section className="card">
                    <Empty
                        title="Dale forma al próximo reconocimiento"
                        description="Comienza con una hoja en blanco o incorpora un fondo desde la biblioteca de recursos."
                    />
                </section>
            )}
            <Modal title={preview?.name ?? "Vista previa"} open={!!preview} onClose={() => setPreview(null)}>{preview && <><TemplateThumbnail version={preview.latest_version} name={preview.name} large /><div className="notice" style={{marginTop: 20}}>Borrador de diseño. Los datos, fechas y QR se completan al emitir. Las firmas y sellos pendientes se configuran en el editor.</div><Link className="button" href={"/plantillas/" + preview.id + "/editor"}>Editar esta plantilla</Link></>}</Modal>
            <Modal
                title="Nueva plantilla"
                open={open}
                onClose={() => setOpen(false)}
            >
                <Errors errors={f.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        f.post("/plantillas");
                    }}
                >
                    <Field label="Nombre">
                        <input
                            required
                            value={f.data.name}
                            onChange={(e) => f.setData("name", e.target.value)}
                        />
                    </Field>
                    <Field label="Carrera">
                        <select
                            value={f.data.career_id}
                            onChange={(e) =>
                                f.setData(
                                    "career_id",
                                    e.target.value
                                        ? Number(e.target.value)
                                        : "",
                                )
                            }
                        >
                            <option value="">
                                Institucional global (Vicedecanato)
                            </option>
                            {careers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Formato inicial">
                        <select
                            onChange={(e) => {
                                const [w, h] = e.target.value
                                    .split("x")
                                    .map(Number);
                                f.setData((d) => ({
                                    ...d,
                                    width_mm: w,
                                    height_mm: h,
                                }));
                            }}
                            defaultValue="297x210"
                        >
                            <option value="297x210">A4 horizontal</option>
                            <option value="210x297">A4 vertical</option>
                            <option value="279.4x215.9">
                                Carta horizontal
                            </option>
                            <option value="215.9x279.4">Carta vertical</option>
                        </select>
                    </Field>
                    <div className="form-grid">
                        <Field label="Ancho (mm)">
                            <input
                                type="number"
                                min="100"
                                max="600"
                                step=".1"
                                value={f.data.width_mm}
                                onChange={(e) =>
                                    f.setData(
                                        "width_mm",
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </Field>
                        <Field label="Alto (mm)">
                            <input
                                type="number"
                                min="100"
                                max="600"
                                step=".1"
                                value={f.data.height_mm}
                                onChange={(e) =>
                                    f.setData(
                                        "height_mm",
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </Field>
                    </div>
                    <Button disabled={f.processing}>
                        Crear y abrir editor
                    </Button>
                </form>
            </Modal>
        </Layout>
    );
}
