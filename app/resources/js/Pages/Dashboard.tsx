import { Link, router } from "@inertiajs/react";
import {
    FileBadge,
    ShieldCheck,
    Clock3,
    Ban,
    ArrowUpRight,
    ArrowRight,
    UserPlus,
    PanelsTopLeft,
    FilePlus2,
} from "lucide-react";
import Layout from "../components/Layout";
import { PageTitle, Empty, Badge, ActionLink, Field } from "../components/UI";
import { date, type Certificate, type Career, type Activity } from "../types";
type Props = {
    stats: Record<string, number>;
    recent: Certificate[];
    careers: Career[];
    activities: Activity[];
    filters: Record<string, string>;
};
export default function Dashboard({
    stats,
    recent,
    careers,
    activities,
    filters,
}: Props) {
    return (
        <Layout>
            <PageTitle
                title="Resumen general"
                description="Una vista de la emisión y vigencia de los certificados de tu ámbito."
                action={
                    <ActionLink href="/emision">
                        <FilePlus2 size={16} />
                        Emitir certificados
                    </ActionLink>
                }
            />
            <form
                className="filterbar"
                onSubmit={(e) => {
                    e.preventDefault();
                    router.get(
                        "/dashboard",
                        Object.fromEntries(
                            new FormData(e.currentTarget) as Iterable<
                                [string, string]
                            >,
                        ),
                    );
                }}
            >
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
                        <option value="">Todas las actividades</option>
                        {activities.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Emisión desde">
                    <input
                        type="date"
                        name="from"
                        defaultValue={filters.from ?? ""}
                    />
                </Field>
                <Field label="Hasta">
                    <input
                        type="date"
                        name="to"
                        defaultValue={filters.to ?? ""}
                    />
                </Field>
                <button className="button secondary">Aplicar filtros</button>
            </form>
            <div className="stats">
                {[
                    ["total", "Total emitidos", FileBadge],
                    ["vigente", "Vigentes", ShieldCheck],
                    ["vencido", "Vencidos", Clock3],
                    ["anulado", "Anulados", Ban],
                ].map(([key, label, Icon]) => {
                    const k = key as string,
                        I = Icon as typeof FileBadge;
                    return (
                        <Link
                            key={k}
                            href={
                                "/certificados?" +
                                new URLSearchParams({
                                    ...filters,
                                    ...(k === "total" ? {} : { status: k }),
                                })
                            }
                            className={"stat " + k}
                        >
                            <div className="stat-top">
                                {label as string}
                                <span className="stat-icon">
                                    <I size={18} />
                                </span>
                            </div>
                            <div className="stat-value">
                                {(stats[k] ?? 0).toLocaleString("es-BO")}
                            </div>
                            <div className="stat-bottom">
                                Consultar certificados
                                <ArrowUpRight size={13} />
                            </div>
                        </Link>
                    );
                })}
            </div>
            <div className="welcome-banner">
                <div>
                    <h2>Gestión de certificados de la Facultad</h2>
                    <p>
                        Emite con un diseño propio, conserva el documento
                        original y permite comprobar su vigencia desde cualquier
                        celular.
                    </p>
                </div>
                <div className="welcome-art">
                    <FileBadge size={56} strokeWidth={1} />
                </div>
            </div>
            <div className="section-heading">
                <h2>Continúa tu trabajo</h2>
                <span className="help-text">
                    {stats.students} estudiantes · {stats.activities}{" "}
                    actividades
                </span>
            </div>
            <div className="quick-links">
                {[
                    [
                        "/estudiantes",
                        "Registrar estudiantes",
                        "Registro individual o desde Excel",
                        UserPlus,
                    ],
                    [
                        "/plantillas",
                        "Diseñar un certificado",
                        "Plantillas y editor visual",
                        PanelsTopLeft,
                    ],
                    [
                        "/emision",
                        "Preparar una emisión",
                        "Elige quiénes reciben certificado",
                        FilePlus2,
                    ],
                ].map(([url, title, sub, Icon]) => {
                    const I = Icon as typeof FileBadge;
                    return (
                        <Link
                            className="quick-card"
                            href={url as string}
                            key={url as string}
                        >
                            <span>
                                <I size={20} />
                            </span>
                            <div>
                                <strong>{title as string}</strong>
                                <small>{sub as string}</small>
                            </div>
                            <ArrowRight size={15} />
                        </Link>
                    );
                })}
            </div>
            <section className="card">
                <div className="card-heading flex">
                    <div>
                        <h2>Últimos certificados emitidos</h2>
                        <p>
                            Documentos finalizados y disponibles para su
                            entrega.
                        </p>
                    </div>
                    <Link href="/certificados" className="text-link">
                        Ver todos →
                    </Link>
                </div>
                {recent.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Destinatario</th>
                                    <th>Actividad</th>
                                    <th>Emisión</th>
                                    <th>Estado</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {recent.map((c) => (
                                    <tr key={c.id}>
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
                                        <td>{date(c.issued_at)}</td>
                                        <td>
                                            <Badge status={c.status} />
                                        </td>
                                        <td>
                                            <Link
                                                href={"/certificados/" + c.id}
                                                className="text-link"
                                            >
                                                Ver detalle
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        title="Aún no hay certificados emitidos"
                        description="Cuando completes tu primera emisión, podrás consultar y entregar los certificados desde este espacio."
                    />
                )}
            </section>
        </Layout>
    );
}
