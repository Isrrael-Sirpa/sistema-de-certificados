import { useState } from "react";
import { Link, useForm, router } from "@inertiajs/react";
import { Pencil, ArrowLeft } from "lucide-react";
import Layout from "../components/Layout";
import {
    PageTitle,
    Button,
    Modal,
    Field,
    Errors,
    Empty,
    Pager,
    Badge,
} from "../components/UI";
import {
    date,
    type Student,
    type Certificate,
    type Pagination,
} from "../types";
export default function StudentDetail({
    student,
    certificates,
    total,
    editable,
    filters,
}: {
    student: Student;
    certificates: Pagination<Certificate>;
    total: number;
    editable: boolean;
    filters: { status?: string };
}) {
    const [open, setOpen] = useState(false),
        f = useForm({
            ci: student.ci,
            first_names: student.first_names,
            last_names: student.last_names,
        });
    return (
        <Layout>
            <Link
                href="/estudiantes"
                className="text-link inline"
                style={{ marginBottom: 20 }}
            >
                <ArrowLeft size={14} />
                Estudiantes
            </Link>
            <PageTitle
                title={student.full_name}
                description={
                    "CI " +
                    student.ci +
                    " · " +
                    total +
                    " certificados en tu ámbito"
                }
                action={
                    editable ? (
                        <Button secondary onClick={() => setOpen(true)}>
                            <Pencil size={14} />
                            Editar datos
                        </Button>
                    ) : undefined
                }
            />
            <div className="notice">
                Los datos de esta ficha no modifican documentos ya emitidos.{" "}
                {editable
                    ? ""
                    : "La identidad está compartida entre carreras; Vicedecanato puede corregirla."}
            </div>
            <section className="card">
                <div className="card-heading flex">
                    <h2>Historial de certificados</h2>
                    <select
                        style={{ width: 170 }}
                        value={filters.status ?? ""}
                        onChange={(e) =>
                            router.get("/estudiantes/" + student.id, {
                                status: e.target.value,
                            })
                        }
                    >
                        <option value="">Todos los estados</option>
                        <option value="vigente">Vigentes</option>
                        <option value="vencido">Vencidos</option>
                        <option value="anulado">Anulados</option>
                    </select>
                </div>
                {certificates.data.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Certificado / actividad</th>
                                    <th>Carrera</th>
                                    <th>Emisión / vencimiento</th>
                                    <th>Estado</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {certificates.data.map((c) => (
                                    <tr key={c.id}>
                                        <td>
                                            <strong>
                                                {c.snapshot.activity}
                                            </strong>
                                            <small>
                                                {c.snapshot.certificate_type} ·{" "}
                                                {c.identifier}
                                            </small>
                                        </td>
                                        <td>{c.snapshot.career}</td>
                                        <td>
                                            {date(c.issued_at)}
                                            <small>{date(c.expires_at)}</small>
                                        </td>
                                        <td>
                                            <Badge status={c.status} />
                                        </td>
                                        <td>
                                            <Link
                                                className="text-link"
                                                href={"/certificados/" + c.id}
                                            >
                                                Ver documento →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        title="Sin certificados en este ámbito"
                        description="Los certificados de esta persona aparecerán al finalizar su emisión."
                    />
                )}
                <Pager page={certificates} />
            </section>
            <Modal
                title="Editar identidad del estudiante"
                open={open}
                onClose={() => setOpen(false)}
            >
                <Errors errors={f.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        f.post("/estudiantes/" + student.id, {
                            onSuccess: () => setOpen(false),
                        });
                    }}
                >
                    {(["ci", "first_names", "last_names"] as const).map(
                        (key, i) => (
                            <Field
                                label={["CI", "Nombres", "Apellidos"][i]}
                                key={key}
                            >
                                <input
                                    value={f.data[key]}
                                    required
                                    onChange={(e) =>
                                        f.setData(key, e.target.value)
                                    }
                                />
                            </Field>
                        ),
                    )}
                    <Button disabled={f.processing}>Guardar datos</Button>
                </form>
            </Modal>
        </Layout>
    );
}
