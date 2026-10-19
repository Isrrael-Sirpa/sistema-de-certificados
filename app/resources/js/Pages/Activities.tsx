import { useState } from "react";
import { Link, useForm } from "@inertiajs/react";
import { Plus, Pencil } from "lucide-react";
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
import type { Activity, Career, CertificateType, Pagination } from "../types";
export default function Activities({
    activities,
    careers,
    types,
}: {
    activities: Pagination<Activity>;
    careers: Career[];
    types: CertificateType[];
}) {
    const [open, setOpen] = useState(false),
        [editing, setEditing] = useState<number | null>(null);
    const f = useForm({
        career_id: careers[0]?.id ?? "",
        name: "",
        kind: "Curso",
        description: "",
        starts_on: "",
        ends_on: "",
        hours: "",
        certificate_type_id: types[0]?.id ?? "",
    });
    function edit(a?: Activity) {
        setEditing(a?.id ?? null);
        if (a)
            f.setData({
                career_id: a.career_id,
                name: a.name,
                kind: a.kind,
                description: a.description ?? "",
                starts_on: a.starts_on,
                ends_on: a.ends_on,
                hours: a.hours ?? "",
                certificate_type_id: a.certificate_type_id,
            });
        else f.reset();
        f.clearErrors();
        setOpen(true);
    }
    return (
        <Layout>
            <PageTitle
                title="Actividades"
                description="Organiza la formación y registra la condición acreditada de cada participante."
                action={
                    <Button onClick={() => edit()}>
                        <Plus size={16} />
                        Crear actividad
                    </Button>
                }
            />
            <section className="card">
                {activities.data.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Actividad</th>
                                    <th>Carrera responsable</th>
                                    <th>Realización</th>
                                    <th>Participantes</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {activities.data.map((a) => (
                                    <tr key={a.id}>
                                        <td>
                                            <strong>{a.name}</strong>
                                            <small>
                                                {a.kind} ·{" "}
                                                {a.certificate_type.name}
                                            </small>
                                        </td>
                                        <td>{a.career.name}</td>
                                        <td>
                                            {a.starts_on}
                                            <small>al {a.ends_on}</small>
                                        </td>
                                        <td>{a.participants_count}</td>
                                        <td>
                                            <div className="table-actions">
                                                <Link
                                                    className="text-link"
                                                    href={
                                                        "/actividades/" + a.id
                                                    }
                                                >
                                                    Gestionar →
                                                </Link>
                                                <button
                                                    className="icon-button"
                                                    onClick={() => edit(a)}
                                                    aria-label={
                                                        "Editar " + a.name
                                                    }
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        title="Crea tu primera actividad"
                        description="Define la carrera responsable, las fechas, la carga horaria y el tipo de certificado."
                    />
                )}
                <Pager page={activities} />
            </section>
            <Modal
                title={editing ? "Editar actividad" : "Crear actividad"}
                open={open}
                onClose={() => setOpen(false)}
            >
                <Errors errors={f.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        f.post(
                            "/actividades" + (editing ? "/" + editing : ""),
                            { onSuccess: () => setOpen(false) },
                        );
                    }}
                >
                    <Field label="Nombre de la actividad">
                        <input
                            required
                            value={f.data.name}
                            onChange={(e) => f.setData("name", e.target.value)}
                        />
                    </Field>
                    <div className="form-grid">
                        <Field label="Carrera responsable">
                            <select
                                required
                                disabled={!!editing}
                                value={f.data.career_id}
                                onChange={(e) =>
                                    f.setData(
                                        "career_id",
                                        Number(e.target.value),
                                    )
                                }
                            >
                                {careers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Tipo de actividad">
                            <input
                                required
                                value={f.data.kind}
                                onChange={(e) =>
                                    f.setData("kind", e.target.value)
                                }
                                list="activity-kinds"
                            />
                            <datalist id="activity-kinds">
                                <option>Curso</option>
                                <option>Seminario</option>
                                <option>Taller</option>
                            </datalist>
                        </Field>
                        <Field label="Fecha inicial">
                            <input
                                type="date"
                                required
                                value={f.data.starts_on}
                                onChange={(e) =>
                                    f.setData("starts_on", e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Fecha final">
                            <input
                                type="date"
                                required
                                value={f.data.ends_on}
                                min={f.data.starts_on}
                                onChange={(e) =>
                                    f.setData("ends_on", e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Carga horaria (opcional)">
                            <input
                                type="number"
                                min="0"
                                step=".01"
                                value={f.data.hours}
                                onChange={(e) =>
                                    f.setData("hours", e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Tipo de certificado">
                            <select
                                required
                                value={f.data.certificate_type_id}
                                onChange={(e) =>
                                    f.setData(
                                        "certificate_type_id",
                                        Number(e.target.value),
                                    )
                                }
                            >
                                {types.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    <Field label="Descripción">
                        <textarea
                            value={f.data.description}
                            onChange={(e) =>
                                f.setData("description", e.target.value)
                            }
                        />
                    </Field>
                    <Button disabled={f.processing}>Guardar actividad</Button>
                </form>
            </Modal>
        </Layout>
    );
}
