import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { Upload } from "lucide-react";
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
import type { Asset, Career, Pagination } from "../types";
export default function Assets({
    assets,
    careers,
}: {
    assets: Pagination<Asset>;
    careers: Career[];
}) {
    const [open, setOpen] = useState(false),
        f = useForm<{
            name: string;
            career_id: number | string;
            kind: string;
            file: File | null;
        }>({
            name: "",
            career_id: careers[0]?.id ?? "",
            kind: "logo",
            file: null,
        });
    const labels: Record<string, string> = {
        logo: "Logo",
        signature: "Imagen de firma",
        stamp: "Sello",
        background: "Fondo",
        watermark: "Marca de agua",
        image: "Imagen",
    };
    return (
        <Layout>
            <PageTitle
                title="Recursos gráficos"
                description="Biblioteca privada de logos, fondos, firmas y sellos para tus diseños."
                action={
                    <Button onClick={() => setOpen(true)}>
                        <Upload size={16} />
                        Subir recurso
                    </Button>
                }
            />
            <div className="notice">
                Las imágenes de firmas y sellos son elementos visuales. El QR
                verifica el registro; no equivale a una firma digital
                criptográfica.
            </div>
            {assets.data.length ? (
                <>
                    <div className="asset-grid">
                        {assets.data.map((a) => (
                            <article className="asset-card" key={a.id}>
                                <div className="asset-image">
                                    <img
                                        src={"/recursos/" + a.id + "/archivo"}
                                        alt={a.name}
                                        loading="lazy"
                                    />
                                </div>
                                <div className="asset-info">
                                    <h3>{a.name}</h3>
                                    <p>
                                        {labels[a.kind]} · {a.width} ×{" "}
                                        {a.height} px
                                    </p>
                                    <p>
                                        {a.career_id
                                            ? careers.find(
                                                  (c) => c.id === a.career_id,
                                              )?.name
                                            : "Institucional global"}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                    <Pager page={assets} />
                </>
            ) : (
                <section className="card">
                    <Empty
                        title="Tu biblioteca de diseño"
                        description="Sube imágenes en PNG, JPG o WebP. Los recursos conservan los permisos de su carrera."
                    />
                </section>
            )}
            <Modal
                title="Subir recurso gráfico"
                open={open}
                onClose={() => setOpen(false)}
            >
                <Errors errors={f.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        f.post("/recursos", {
                            forceFormData: true,
                            onSuccess: () => {
                                setOpen(false);
                                f.reset();
                            },
                        });
                    }}
                >
                    <Field label="Nombre descriptivo">
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
                    <Field label="Tipo de recurso">
                        <select
                            value={f.data.kind}
                            onChange={(e) => f.setData("kind", e.target.value)}
                        >
                            {Object.entries(labels).map(([v, l]) => (
                                <option value={v} key={v}>
                                    {l}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field
                        label="Imagen"
                        hint="PNG, JPG o WebP · máximo 10 MB, 40 megapíxeles."
                    >
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            required
                            onChange={(e) =>
                                f.setData("file", e.target.files?.[0] ?? null)
                            }
                        />
                    </Field>
                    <Button disabled={f.processing}>
                        {f.processing ? "Subiendo…" : "Guardar recurso"}
                    </Button>
                </form>
            </Modal>
        </Layout>
    );
}
