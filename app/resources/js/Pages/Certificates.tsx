import { useState } from "react";
import { Link, router } from "@inertiajs/react";
import { Download, Plus, Printer } from "lucide-react";
import Layout from "../components/Layout";
import {
    PageTitle,
    Button,
    ActionLink,
    Badge,
    Pager,
    Empty,
    Field,
} from "../components/UI";
import { downloadBundle } from "../lib";
import {
    date,
    type Certificate,
    type Career,
    type Activity,
    type Pagination,
} from "../types";
export default function Certificates({
    certificates,
    careers,
    activities,
    filters,
}: {
    certificates: Pagination<Certificate>;
    careers: Career[];
    activities: Activity[];
    filters: Record<string, string>;
}) {
    const [ids, setIds] = useState<number[]>([]);
    return (
        <Layout>
            <PageTitle
                title="Certificados"
                description="Consulta, descarga y entrega los documentos definitivos de tu ámbito."
                action={
                    <ActionLink href="/emision">
                        <Plus size={16} />
                        Emitir certificados
                    </ActionLink>
                }
            />
            <form
                className="filterbar"
                onSubmit={(e) => {
                    e.preventDefault();
                    setIds([]);
                    router.get(
                        "/certificados",
                        Object.fromEntries(
                            new FormData(e.currentTarget) as Iterable<
                                [string, string]
                            >,
                        ),
                    );
                }}
            >
                <Field label="Buscar">
                    <input
                        name="q"
                        defaultValue={filters.q}
                        placeholder="Destinatario o identificador"
                    />
                </Field>
                <Field label="Estado">
                    <select name="status" defaultValue={filters.status ?? ""}>
                        <option value="">Todos</option>
                        <option value="vigente">Vigentes</option>
                        <option value="vencido">Vencidos</option>
                        <option value="anulado">Anulados</option>
                    </select>
                </Field>
                <Field label="Carrera">
                    <select
                        name="career_id"
                        defaultValue={filters.career_id ?? ""}
                    >
                        <option value="">Todas las autorizadas</option>
                        {careers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Actividad">
                    <select
                        name="activity_id"
                        defaultValue={filters.activity_id ?? ""}
                    >
                        <option value="">Todas</option>
                        {activities.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Desde">
                    <input
                        name="from"
                        type="date"
                        defaultValue={filters.from}
                    />
                </Field>
                <Field label="Hasta">
                    <input name="to" type="date" defaultValue={filters.to} />
                </Field>
                <Button secondary>Filtrar</Button>
            </form>
            <section className="card">
                {certificates.data.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            aria-label="Seleccionar página"
                                            checked={certificates.data.every(
                                                (c) => ids.includes(c.id),
                                            )}
                                            onChange={(e) =>
                                                setIds(
                                                    e.target.checked
                                                        ? certificates.data.map(
                                                              (c) => c.id,
                                                          )
                                                        : [],
                                                )
                                            }
                                        />
                                    </th>
                                    <th>Destinatario / identificador</th>
                                    <th>Actividad / carrera</th>
                                    <th>Fechas</th>
                                    <th>Estado</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {certificates.data.map((c) => (
                                    <tr key={c.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                aria-label={
                                                    "Seleccionar " +
                                                    c.identifier
                                                }
                                                checked={ids.includes(c.id)}
                                                onChange={(e) =>
                                                    setIds(
                                                        e.target.checked
                                                            ? [...ids, c.id]
                                                            : ids.filter(
                                                                  (x) =>
                                                                      x !==
                                                                      c.id,
                                                              ),
                                                    )
                                                }
                                            />
                                        </td>
                                        <td>
                                            <strong>
                                                {c.snapshot.full_name}
                                            </strong>
                                            <small className="mono">
                                                {c.identifier}
                                            </small>
                                        </td>
                                        <td>
                                            {c.snapshot.activity}
                                            <small>{c.snapshot.career}</small>
                                        </td>
                                        <td>
                                            {date(c.issued_at)}
                                            <small>
                                                Vence: {date(c.expires_at)}
                                            </small>
                                        </td>
                                        <td>
                                            <Badge status={c.status} />
                                        </td>
                                        <td>
                                            <Link
                                                className="text-link"
                                                href={"/certificados/" + c.id}
                                            >
                                                Ver detalle →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        title="No hay certificados para estos filtros"
                        description="Solo se muestran documentos emitidos correctamente. Los borradores y errores se consultan en lotes."
                    />
                )}
                <Pager page={certificates} />
            </section>
            {ids.length > 0 && (
                <div className="selection-summary">
                    <strong>{ids.length} documentos seleccionados</strong>
                    <div className="inline">
                        <Button
                            secondary
                            onClick={() => downloadBundle(ids, "zip")}
                        >
                            <Download size={14} />
                            Descargar ZIP
                        </Button>
                        <Button onClick={() => downloadBundle(ids, "pdf")}>
                            <Printer size={14} />
                            Imprimir juntos
                        </Button>
                    </div>
                </div>
            )}
        </Layout>
    );
}
