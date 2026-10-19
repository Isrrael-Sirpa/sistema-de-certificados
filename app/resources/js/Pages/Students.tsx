import { useState } from "react";
import { Link, router, useForm } from "@inertiajs/react";
import { Plus, Upload, Download, Search } from "lucide-react";
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
import type { Career, Student, Pagination } from "../types";
export default function Students({
    students,
    careers,
    filters,
}: {
    students: Pagination<Student>;
    careers: Career[];
    filters: { q: string };
}) {
    const [modal, setModal] = useState<"new" | "import" | null>(null),
        f = useForm({
            ci: "",
            first_names: "",
            last_names: "",
            career_id: careers[0]?.id ?? "",
        }),
        imp = useForm<{ career_id: number | string; file: File | null }>({
            career_id: careers[0]?.id ?? "",
            file: null,
        });
    return (
        <Layout>
            <PageTitle
                title="Estudiantes"
                description="Identidad única por CI. Una persona puede participar en distintas actividades y carreras."
                action={
                    <div className="inline">
                        <Button secondary onClick={() => setModal("import")}>
                            <Upload size={15} />
                            Importar Excel
                        </Button>
                        <Button onClick={() => setModal("new")}>
                            <Plus size={16} />
                            Registrar estudiante
                        </Button>
                    </div>
                }
            />
            <form
                className="filterbar"
                onSubmit={(e) => {
                    e.preventDefault();
                    router.get("/estudiantes", {
                        q: new FormData(e.currentTarget).get("q"),
                    });
                }}
            >
                <div className="inline" style={{ flex: 1 }}>
                    <Search size={18} className="muted" />
                    <input
                        name="q"
                        defaultValue={filters.q}
                        placeholder="Buscar por CI, nombres o apellidos…"
                        style={{ maxWidth: 500 }}
                    />
                </div>
                <Button secondary>Buscar</Button>
            </form>
            <section className="card">
                {students.data.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Estudiante</th>
                                    <th>Cédula de identidad</th>
                                    <th>Ficha e historial</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.data.map((s) => (
                                    <tr key={s.id}>
                                        <td>
                                            <strong>{s.full_name}</strong>
                                        </td>
                                        <td className="mono">{s.ci}</td>
                                        <td>
                                            <Link
                                                className="text-link"
                                                href={"/estudiantes/" + s.id}
                                            >
                                                Consultar ficha →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        title={
                            filters.q
                                ? "No hay coincidencias"
                                : "Tu registro de estudiantes comienza aquí"
                        }
                        description="Registra una persona o importa un Excel. Este paso no emite certificados."
                    />
                )}
                <Pager page={students} />
            </section>
            <Modal
                title="Registrar estudiante"
                open={modal === "new"}
                onClose={() => setModal(null)}
            >
                <Errors errors={f.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        f.post("/estudiantes");
                    }}
                >
                    <Field label="Carrera">
                        <select
                            value={f.data.career_id}
                            onChange={(e) =>
                                f.setData("career_id", Number(e.target.value))
                            }
                            required
                        >
                            {careers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field
                        label="CI"
                        hint="Escribe el CI completo. Conserva ceros iniciales, complementos y guiones."
                    >
                        <input
                            required
                            value={f.data.ci}
                            onChange={(e) => f.setData("ci", e.target.value)}
                        />
                    </Field>
                    <Field label="Nombres">
                        <input
                            required
                            value={f.data.first_names}
                            onChange={(e) =>
                                f.setData("first_names", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Apellidos">
                        <input
                            required
                            value={f.data.last_names}
                            onChange={(e) =>
                                f.setData("last_names", e.target.value)
                            }
                        />
                    </Field>
                    <Button disabled={f.processing}>
                        {f.processing ? "Guardando…" : "Guardar estudiante"}
                    </Button>
                </form>
            </Modal>
            <Modal
                title="Importar estudiantes desde Excel"
                open={modal === "import"}
                onClose={() => setModal(null)}
            >
                <div className="notice">
                    Una fila por estudiante, con CI, nombres y apellidos. Podrás
                    revisar los resultados antes de confirmar.
                </div>
                <a
                    className="button secondary"
                    href="/estudiantes/plantilla-excel"
                >
                    <Download size={15} />
                    Descargar plantilla Excel
                </a>
                <Errors errors={imp.errors} />
                <form
                    className="form-stack"
                    style={{ marginTop: 22 }}
                    onSubmit={(e) => {
                        e.preventDefault();
                        imp.post("/importaciones", { forceFormData: true });
                    }}
                >
                    <Field label="Carrera de destino">
                        <select
                            value={imp.data.career_id}
                            required
                            onChange={(e) =>
                                imp.setData("career_id", Number(e.target.value))
                            }
                        >
                            {careers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field
                        label="Archivo Excel"
                        hint=".xlsx · máximo 5 MB y 5000 estudiantes."
                    >
                        <input
                            type="file"
                            accept=".xlsx"
                            required
                            onChange={(e) =>
                                imp.setData("file", e.target.files?.[0] ?? null)
                            }
                        />
                    </Field>
                    <Button disabled={imp.processing}>
                        {imp.processing
                            ? "Analizando archivo…"
                            : "Subir y revisar"}
                    </Button>
                </form>
            </Modal>
        </Layout>
    );
}
