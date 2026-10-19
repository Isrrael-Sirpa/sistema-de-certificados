import { useState } from "react";
import { router } from "@inertiajs/react";
import Workflow from "../components/Workflow";
import Layout from "../components/Layout";
import {
    PageTitle,
    Button,
    Badge,
    Modal,
    Errors,
    Empty,
} from "../components/UI";
type Row = {
    row: number;
    ci: string;
    first_names: string;
    last_names: string;
    status: string;
    message: string;
};
type Import = {
    id: number;
    rows: Row[];
    confirmed_at: string | null;
    result: {
        new: number;
        existing: number;
        skipped: number;
        errors: number;
        rows: Row[];
    } | null;
};
export default function ImportReview({ import: imp }: { import: Import }) {
    const [confirm, setConfirm] = useState(false),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        rows = imp.result?.rows ?? imp.rows;
    return (
        <Layout>
            <PageTitle
                title={
                    imp.confirmed_at
                        ? "Resultado de importación"
                        : "Revisar importación"
                }
                description="Las discrepancias y los errores se omiten. Los estudiantes existentes se reutilizan sin cambiar sus nombres."
                action={
                    !imp.confirmed_at ? (
                        <Button
                            disabled={
                                !rows.some((r) =>
                                    ["new", "existing"].includes(r.status),
                                )
                            }
                            onClick={() => setConfirm(true)}
                        >
                            Confirmar importación
                        </Button>
                    ) : undefined
                }
            />
            <Workflow steps={["Cargar Excel", "Revisar filas", "Confirmar", "Resultado"]} current={imp.confirmed_at ? 3 : confirm ? 2 : 1} />
            <Errors errors={{ error }} />
            {imp.result && (
                <div className="notice success">
                    {imp.result.new} nuevos · {imp.result.existing} reutilizados
                    · {imp.result.skipped} omitidos · {imp.result.errors} con
                    errores. Esta importación no emitió certificados.
                </div>
            )}
            <section className="card">
                {rows.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fila</th>
                                    <th>CI</th>
                                    <th>Datos del archivo</th>
                                    <th>Estado</th>
                                    <th>Observación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.row}>
                                        <td>{r.row}</td>
                                        <td className="mono">{r.ci}</td>
                                        <td>
                                            {r.first_names} {r.last_names}
                                        </td>
                                        <td>
                                            <Badge status={r.status} />
                                        </td>
                                        <td>{r.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty title="El archivo no contiene estudiantes" />
                )}
            </section>
            <Modal
                title="Confirmar la importación"
                open={confirm}
                onClose={() => setConfirm(false)}
            >
                <p className="help-text">
                    Se procesarán las filas válidas y los CI existentes sin
                    discrepancias. Las demás filas quedarán documentadas para su
                    corrección.
                </p>
                <div className="form-actions">
                    <Button secondary onClick={() => setConfirm(false)}>
                        Volver a revisar
                    </Button>
                    <Button
                        disabled={busy}
                        onClick={() => {
                            setBusy(true);
                            router.post(
                                "/importaciones/" + imp.id + "/confirmar",
                                {},
                                {
                                    onError: (e) =>
                                        setError(Object.values(e).join(" ")),
                                    onFinish: () => {
                                        setBusy(false);
                                        setConfirm(false);
                                    },
                                },
                            );
                        }}
                    >
                        Confirmar
                    </Button>
                </div>
            </Modal>
        </Layout>
    );
}
