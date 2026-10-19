import { Link } from "@inertiajs/react";
import { Plus } from "lucide-react";
import Layout from "../components/Layout";
import { PageTitle, ActionLink, Badge, Pager, Empty } from "../components/UI";
import { date, type Batch, type Pagination } from "../types";
export default function Batches({ batches }: { batches: Pagination<Batch> }) {
    return (
        <Layout>
            <PageTitle
                title="Lotes de emisión"
                description="Revisa el progreso, los documentos completados y los errores de cada operación."
                action={
                    <ActionLink href="/emision">
                        <Plus size={16} />
                        Preparar emisión
                    </ActionLink>
                }
            />
            <section className="card">
                {batches.data.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Operación</th>
                                    <th>Estado</th>
                                    <th>Destinatarios</th>
                                    <th>Completados / fallidos</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {batches.data.map((b) => (
                                    <tr key={b.id}>
                                        <td>
                                            <strong>
                                                Lote #
                                                {String(b.id).padStart(4, "0")}
                                            </strong>
                                            <small>{date(b.created_at)}</small>
                                        </td>
                                        <td>
                                            <Badge status={b.status} />
                                        </td>
                                        <td>{b.items_count}</td>
                                        <td>
                                            {b.completed_count} /{" "}
                                            {b.failed_count}
                                        </td>
                                        <td>
                                            <Link
                                                className="text-link"
                                                href={"/lotes/" + b.id}
                                            >
                                                Abrir lote →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        title="Todavía no hay operaciones"
                        description="Prepara una emisión, revisa sus destinatarios y confírmala para iniciar la generación de documentos."
                    />
                )}
                <Pager page={batches} />
            </section>
        </Layout>
    );
}
