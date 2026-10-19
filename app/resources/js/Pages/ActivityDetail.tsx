import { useState } from "react";
import { Link, router, useForm } from "@inertiajs/react";
import { Plus, Trash2, FilePlus2 } from "lucide-react";
import Layout from "../components/Layout";
import {
    PageTitle,
    Button,
    Modal,
    Field,
    Errors,
    Empty,
    ActionLink,
} from "../components/UI";
import type { Activity, Participant, Student } from "../types";
export default function ActivityDetail({
    activity: a,
    participants,
    students,
    q,
}: {
    activity: Activity;
    participants: Participant[];
    students: Student[];
    q: string;
}) {
    const [open, setOpen] = useState(false),
        [selected, setSelected] = useState<number[]>([]),
        [remove, setRemove] = useState<number | null>(null);
    const f = useForm({
        student_ids: [] as number[],
        condition: "",
        group_name: "",
    });
    const toggle = (id: number) =>
        setSelected((s) =>
            s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
        );
    return (
        <Layout>
            <PageTitle
                title={a.name}
                description={
                    a.career.name +
                    " · " +
                    a.kind +
                    " · " +
                    a.starts_on +
                    " al " +
                    a.ends_on
                }
                action={
                    <ActionLink href={"/emision?activity_id=" + a.id}>
                        <FilePlus2 size={16} />
                        Preparar emisión
                    </ActionLink>
                }
            />
            <div className="notice">
                {participants.length} participantes registrados. La inscripción
                no acredita aprobación ni asistencia. Registra la condición y
                selecciona destinatarios al preparar la emisión.
            </div>
            <section className="card">
                <div className="card-heading flex">
                    <h2>Participantes</h2>
                    <Button
                        onClick={() => {
                            f.setData({
                                student_ids: [],
                                condition: "",
                                group_name: "",
                            });
                            setOpen(true);
                        }}
                    >
                        <Plus size={15} />
                        Asociar estudiantes
                    </Button>
                </div>
                {participants.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            aria-label="Seleccionar todos"
                                            type="checkbox"
                                            checked={
                                                selected.length ===
                                                participants.length
                                            }
                                            onChange={(e) =>
                                                setSelected(
                                                    e.target.checked
                                                        ? participants.map(
                                                              (p) => p.id,
                                                          )
                                                        : [],
                                                )
                                            }
                                        />
                                    </th>
                                    <th>Estudiante</th>
                                    <th>Condición acreditada</th>
                                    <th>Grupo</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                aria-label={
                                                    "Seleccionar " +
                                                    p.student.full_name
                                                }
                                                checked={selected.includes(
                                                    p.id,
                                                )}
                                                onChange={() => toggle(p.id)}
                                            />
                                        </td>
                                        <td>
                                            <Link
                                                href={
                                                    "/estudiantes/" +
                                                    p.student_id
                                                }
                                            >
                                                <strong>
                                                    {p.student.full_name}
                                                </strong>
                                                <small>CI {p.student.ci}</small>
                                            </Link>
                                        </td>
                                        <td>
                                            {p.condition ?? (
                                                <span className="muted">
                                                    Sin registrar
                                                </span>
                                            )}
                                        </td>
                                        <td>{p.group_name ?? "—"}</td>
                                        <td>
                                            <button
                                                className="icon-button"
                                                onClick={() => setRemove(p.id)}
                                                aria-label="Excluir participante"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        title="Asocia estudiantes a esta actividad"
                        description="Selecciona personas del registro y establece la condición que acredita su certificado."
                    />
                )}
            </section>
            {selected.length > 0 && (
                <div className="selection-summary">
                    <div>{selected.length} participantes seleccionados</div>
                    <Button
                        onClick={() => {
                            f.setData({
                                student_ids: participants
                                    .filter((p) => selected.includes(p.id))
                                    .map((p) => p.student_id),
                                condition: "",
                                group_name: "",
                            });
                            setOpen(true);
                        }}
                    >
                        Registrar condición o grupo
                    </Button>
                </div>
            )}
            <Modal
                title={
                    f.data.student_ids.length
                        ? "Registrar participantes y condición"
                        : "Asociar estudiantes existentes"
                }
                open={open}
                onClose={() => setOpen(false)}
            >
                <Errors errors={f.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        f.post("/actividades/" + a.id + "/participantes", {
                            onSuccess: () => {
                                setOpen(false);
                                setSelected([]);
                            },
                        });
                    }}
                >
                    <Field
                        label="Buscar en el registro"
                        hint="Se muestran hasta 100 coincidencias de tu ámbito."
                    >
                        <input
                            defaultValue={q}
                            placeholder="Nombre o CI. Presiona Enter para buscar."
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    router.get(
                                        "/actividades/" + a.id,
                                        { q: e.currentTarget.value },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                        },
                                    );
                                }
                            }}
                        />
                    </Field>
                    <div
                        style={{ maxHeight: 220, overflow: "auto" }}
                        className="stack"
                    >
                        {students.map((s) => (
                            <label className="check-label" key={s.id}>
                                <input
                                    type="checkbox"
                                    checked={f.data.student_ids.includes(s.id)}
                                    onChange={(e) =>
                                        f.setData(
                                            "student_ids",
                                            e.target.checked
                                                ? [...f.data.student_ids, s.id]
                                                : f.data.student_ids.filter(
                                                      (x) => x !== s.id,
                                                  ),
                                        )
                                    }
                                />
                                {s.full_name}
                                <small className="muted">{s.ci}</small>
                            </label>
                        ))}
                    </div>
                    <Field
                        label="Condición acreditada"
                        hint="Por ejemplo: aprobó, asistió o participó. No se deduce de la inscripción."
                    >
                        <input
                            value={f.data.condition}
                            onChange={(e) =>
                                f.setData("condition", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Grupo (opcional)">
                        <input
                            value={f.data.group_name}
                            onChange={(e) =>
                                f.setData("group_name", e.target.value)
                            }
                        />
                    </Field>
                    <Button
                        disabled={f.processing || !f.data.student_ids.length}
                    >
                        Guardar {f.data.student_ids.length} participantes
                    </Button>
                </form>
            </Modal>
            <Modal
                title="Excluir participante"
                open={remove !== null}
                onClose={() => setRemove(null)}
            >
                <p className="help-text">
                    Se eliminará su asociación con esta actividad si aún no
                    tiene operaciones de emisión. Su identidad se conservará en
                    el registro.
                </p>
                <div className="form-actions">
                    <Button secondary onClick={() => setRemove(null)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={() =>
                            router.delete(
                                "/actividades/" +
                                    a.id +
                                    "/participantes/" +
                                    remove,
                                { onFinish: () => setRemove(null) },
                            )
                        }
                    >
                        Excluir participante
                    </Button>
                </div>
            </Modal>
        </Layout>
    );
}
