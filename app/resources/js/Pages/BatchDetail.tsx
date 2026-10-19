import { useEffect, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { Play, RefreshCw, Eye, Download } from "lucide-react";
import Workflow from "../components/Workflow";
import Layout from "../components/Layout";
import { PageTitle, Button, Badge, Modal, Errors } from "../components/UI";
import { api, downloadBundle } from "../lib";
import type { Batch, Issue as PrintIssue } from "../types";
export default function BatchDetail({ batch: b }: { batch: Batch }) {
    const [busy, setBusy] = useState(false),
        [progress, setProgress] = useState(""),
        [error, setError] = useState(""),
        [preview, setPreview] = useState<{
            name: string;
            svg: string;
            issues: PrintIssue[];
        } | null>(null),
        [confirm, setConfirm] = useState(false),
        [exportGroup, setExportGroup] = useState(0);
    const errors = usePage().props.errors as Record<string, string>;
    const completed = b.items.filter((i) => i.status === "completed").length,
        reviewed = b.items.filter((i) => i.review).length,
        blocked = b.items.some((i) =>
            i.review?.issues.some((x) => x.level === "error"),
        );
    useEffect(() => {
        if (
            b.confirmed_at &&
            b.items.some((i) => ["pending", "processing"].includes(i.status))
        ) {
            const id = setInterval(
                () => router.reload({ only: ["batch"] }),
                4000,
            );
            return () => clearInterval(id);
        }
    }, [b]);
    async function review(ids: number[], show = false) {
        setBusy(true);
        setError("");
        try {
            for (let n = 0; n < ids.length; n++) {
                const item = b.items.find((i) => i.id === ids[n])!;
                setProgress(
                    "Revisando " +
                        (n + 1) +
                        " de " +
                        ids.length +
                        " · " +
                        item.participant.student.full_name,
                );
                const r = await api<{ svg: string; issues: PrintIssue[] }>(
                    "/lotes/" + b.id + "/elementos/" + item.id + "/revisar",
                    {},
                );
                if (show)
                    setPreview({
                        name: item.participant.student.full_name,
                        ...r,
                    });
            }
            router.reload({ only: ["batch"] });
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
            setProgress("");
        }
    }
    const certificateIds = b.items.flatMap((i) =>
        i.certificate ? [i.certificate.id] : [],
    );
    const exportIds = certificateIds.slice(
        exportGroup * 200,
        (exportGroup + 1) * 200,
    );
    return (
        <Layout>
            <PageTitle
                title={"Lote #" + String(b.id).padStart(4, "0")}
                description={
                    b.confirmed_at
                        ? "La descarga y los reintentos conservan las emisiones ya completadas."
                        : "Borrador: revisa cada destinatario antes de confirmar la emisión."
                }
                action={<Badge status={b.status} />}
            />
            <Workflow steps={["Seleccionar destinatarios", "Revisar diseños", "Confirmar emisión", "Descargar"]} current={b.confirmed_at ? 3 : confirm ? 2 : 1} />
            <Errors errors={{ ...errors, error }} />
            {b.status === "draft" ? (
                <div className="notice">
                    Revisa el lote completo con datos reales. Los avisos
                    permiten continuar; los errores deben corregirse. La fecha y
                    el identificador siguen pendientes de emisión.
                </div>
            ) : null}
            <section className="card">
                <div className="card-body">
                    <div
                        className="inline"
                        style={{
                            justifyContent: "space-between",
                            marginBottom: 15,
                        }}
                    >
                        <strong>
                            {b.confirmed_at ? completed : reviewed} de{" "}
                            {b.items.length}{" "}
                            {b.confirmed_at ? "completados" : "revisados"}
                        </strong>
                        <span className="help-text">
                            {progress ||
                                (b.confirmed_at
                                    ? "Seguimiento automático cada 4 segundos"
                                    : "El diseño se comprueba con el motor de PDF del servidor")}
                        </span>
                    </div>
                    <div className="progress-track">
                        <div
                            style={{
                                width:
                                    ((b.confirmed_at ? completed : reviewed) /
                                        b.items.length) *
                                        100 +
                                    "%",
                            }}
                        />
                    </div>
                    <div className="inline" style={{ marginTop: 20 }}>
                        {!b.confirmed_at ? (
                            <>
                                <Button
                                    secondary
                                    disabled={busy}
                                    onClick={() =>
                                        review(b.items.map((i) => i.id))
                                    }
                                >
                                    <Eye size={15} />
                                    {busy
                                        ? "Revisando…"
                                        : "Revisar todo el lote"}
                                </Button>
                                <Button
                                    disabled={
                                        busy ||
                                        reviewed !== b.items.length ||
                                        blocked
                                    }
                                    onClick={() => setConfirm(true)}
                                >
                                    <Play size={14} />
                                    Confirmar emisión
                                </Button>
                            </>
                        ) : (
                            <Button
                                secondary
                                onClick={() =>
                                    router.post(
                                        "/lotes/" + b.id + "/reintentar",
                                    )
                                }
                            >
                                <RefreshCw size={14} />
                                Reintentar pendientes o fallidos
                            </Button>
                        )}
                        {certificateIds.length > 0 && (
                            <>
                                {certificateIds.length > 200 && (
                                    <label className="field">
                                        Documentos a descargar
                                        <select
                                            value={exportGroup}
                                            onChange={(event) =>
                                                setExportGroup(
                                                    Number(event.target.value),
                                                )
                                            }
                                        >
                                            {Array.from(
                                                {
                                                    length: Math.ceil(
                                                        certificateIds.length /
                                                            200,
                                                    ),
                                                },
                                                (_, index) => (
                                                    <option
                                                        key={index}
                                                        value={index}
                                                    >
                                                        {index * 200 + 1}–
                                                        {Math.min(
                                                            (index + 1) * 200,
                                                            certificateIds.length,
                                                        )}{" "}
                                                        de{" "}
                                                        {certificateIds.length}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                )}
                                <Button
                                    secondary
                                    onClick={() =>
                                        downloadBundle(exportIds, "zip")
                                    }
                                >
                                    <Download size={14} />
                                    Descargar ZIP
                                </Button>
                                <Button
                                    secondary
                                    onClick={() =>
                                        downloadBundle(exportIds, "pdf")
                                    }
                                >
                                    PDF para impresión conjunta
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </section>
            <section className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Destinatario</th>
                                <th>Actividad / diseño</th>
                                <th>Resultado</th>
                                <th>Observaciones</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {b.items.map((i) => (
                                <tr key={i.id}>
                                    <td>
                                        <strong>
                                            {i.participant.student.full_name}
                                        </strong>
                                        <small>
                                            CI {i.participant.student.ci}
                                        </small>
                                    </td>
                                    <td>
                                        {i.participant.activity?.name}
                                        <small>
                                            {i.version.template.name} · versión{" "}
                                            {i.version.number}
                                        </small>
                                    </td>
                                    <td>
                                        <Badge status={i.status} />
                                    </td>
                                    <td>
                                        {i.error ? (
                                            <span style={{ color: "#ab4651" }}>
                                                {i.error}
                                            </span>
                                        ) : i.review ? (
                                            <div
                                                className="stack"
                                                style={{ gap: 4 }}
                                            >
                                                {i.review.issues.length ? (
                                                    i.review.issues.map(
                                                        (x, n) => (
                                                            <span
                                                                key={n}
                                                                style={{
                                                                    color:
                                                                        x.level ===
                                                                        "error"
                                                                            ? "#b54e5a"
                                                                            : "#a17a24",
                                                                    fontSize: 10,
                                                                }}
                                                            >
                                                                {x.level ===
                                                                "error"
                                                                    ? "Error: "
                                                                    : "Aviso: "}
                                                                {x.message}
                                                            </span>
                                                        ),
                                                    )
                                                ) : (
                                                    <span
                                                        style={{
                                                            color: "#22836e",
                                                        }}
                                                    >
                                                        Revisión sin
                                                        observaciones
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="muted">
                                                Sin revisar
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {!b.confirmed_at ? (
                                            <button
                                                disabled={busy}
                                                className="text-link"
                                                onClick={() =>
                                                    review([i.id], true)
                                                }
                                            >
                                                Previsualizar
                                            </button>
                                        ) : i.certificate ? (
                                            <Link
                                                className="text-link"
                                                href={
                                                    "/certificados/" +
                                                    i.certificate.id
                                                }
                                            >
                                                Documento →
                                            </Link>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <Modal
                title={preview?.name ?? "Vista previa"}
                open={!!preview}
                onClose={() => setPreview(null)}
            >
                {preview && (
                    <>
                        <div className="review-preview">
                            <img
                                src={
                                    "data:image/svg+xml;charset=utf-8," +
                                    encodeURIComponent(preview.svg)
                                }
                                alt={"Vista previa de " + preview.name}
                            />
                        </div>
                        <p className="help-text" style={{ marginTop: 15 }}>
                            Vista de preparación. Las fechas definitivas y el QR
                            se generan en el servidor al emitir.
                        </p>
                        {preview.issues.map((x, i) => (
                            <div
                                className={
                                    "notice " +
                                    (x.level === "error" ? "danger" : "warning")
                                }
                                key={i}
                            >
                                {x.message}
                            </div>
                        ))}
                    </>
                )}
            </Modal>
            <Modal
                title="Emitir certificados definitivamente"
                open={confirm}
                onClose={() => setConfirm(false)}
            >
                <p className="help-text">
                    Se emitirán exactamente {b.items.length} certificados con
                    los datos revisados. La vigencia será de tres años
                    calendario desde su emisión. Los documentos completados
                    serán inmutables.
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
                                "/lotes/" + b.id + "/confirmar",
                                {},
                                {
                                    onFinish: () => {
                                        setBusy(false);
                                        setConfirm(false);
                                    },
                                },
                            );
                        }}
                    >
                        Confirmar y emitir {b.items.length}
                    </Button>
                </div>
            </Modal>
        </Layout>
    );
}
