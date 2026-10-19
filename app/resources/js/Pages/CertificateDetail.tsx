import { useState } from "react";
import { Link, useForm } from "@inertiajs/react";
import { Download, ExternalLink, Copy, Ban } from "lucide-react";
import Layout from "../components/Layout";
import {
    PageTitle,
    Button,
    Badge,
    Modal,
    Field,
    Errors,
    useAuth,
    ActionLink,
} from "../components/UI";
import { date, type Certificate } from "../types";
export default function CertificateDetail({
    certificate: c,
    deliveryUrl,
    verificationUrl,
}: {
    certificate: Certificate;
    deliveryUrl: string;
    verificationUrl: string;
}) {
    const user = useAuth(),
        [open, setOpen] = useState(false),
        [copied, setCopied] = useState(false),
        f = useForm({ reason: "" });
    return (
        <Layout>
            <PageTitle
                title={c.identifier}
                description="Documento definitivo. Su PDF y sus datos se conservan desde la emisión."
                action={
                    <a
                        className="button"
                        href={"/certificados/" + c.id + "/pdf"}
                    >
                        <Download size={15} />
                        Descargar PDF original
                    </a>
                }
            />
            <div className="two-columns">
                <section className="card">
                    <div className="card-heading flex">
                        <h2>Datos del certificado</h2>
                        <Badge status={c.status} />
                    </div>
                    <div className="card-body">
                        <div className="eyebrow">DESTINATARIO</div>
                        <h2 style={{ fontSize: 25, marginBottom: 25 }}>
                            {c.snapshot.full_name}
                        </h2>
                        <dl className="details">
                            {[
                                ["Entidad emisora", c.snapshot.issuer],
                                ["Actividad", c.snapshot.activity],
                                ["Carrera", c.snapshot.career],
                                [
                                    "Tipo de certificado",
                                    c.snapshot.certificate_type,
                                ],
                                ["Condición acreditada", c.snapshot.condition],
                                [
                                    "Carga horaria",
                                    c.snapshot.hours || "No corresponde",
                                ],
                                [
                                    "Fechas de la actividad",
                                    c.snapshot.activity_dates,
                                ],
                                ["Fecha de emisión", date(c.issued_at)],
                                ["Fecha de vencimiento", date(c.expires_at)],
                            ].map(([k, v]) => (
                                <div key={k}>
                                    <dt>{k}</dt>
                                    <dd>{v}</dd>
                                </div>
                            ))}
                        </dl>
                        {c.revocation && (
                            <div
                                className="notice danger"
                                style={{ marginTop: 25 }}
                            >
                                <strong>
                                    Anulado el {date(c.revocation.created_at)}
                                </strong>
                                <br />
                                {c.revocation.reason}
                            </div>
                        )}
                        {c.replacement_for && (
                            <div className="notice" style={{ marginTop: 20 }}>
                                Reemplaza al certificado{" "}
                                <Link
                                    className="text-link"
                                    href={"/certificados/" + c.replacement_for}
                                >
                                    #{c.replacement_for}
                                </Link>
                                .
                            </div>
                        )}
                    </div>
                </section>
                <div>
                    <section className="card">
                        <div className="card-heading">
                            <h2>Entrega y verificación</h2>
                        </div>
                        <div className="card-body form-stack">
                            <p className="help-text">
                                El enlace de entrega permite descargar este
                                documento sin acceso a la aplicación ni al
                                historial del estudiante.
                            </p>
                            <Field label="Enlace individual de entrega">
                                <input
                                    readOnly
                                    value={deliveryUrl}
                                    onFocus={(e) => e.target.select()}
                                />
                            </Field>
                            <Button
                                secondary
                                onClick={async () => {
                                    await navigator.clipboard.writeText(
                                        deliveryUrl,
                                    );
                                    setCopied(true);
                                }}
                            >
                                <Copy size={14} />
                                {copied
                                    ? "Enlace copiado"
                                    : "Copiar enlace de entrega"}
                            </Button>
                            <a
                                href={verificationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="button secondary"
                            >
                                <ExternalLink size={14} />
                                Abrir verificación pública
                            </a>
                            <p className="help-text">
                                El QR conserva su registro aunque el certificado
                                venza o sea anulado.
                            </p>
                        </div>
                    </section>
                    {c.status !== "anulado" && user.role === "admin" && (
                        <Button secondary onClick={() => setOpen(true)}>
                            <Ban size={15} />
                            Anular certificado
                        </Button>
                    )}
                    {c.status === "anulado" && (
                        <ActionLink
                            href={
                                "/emision?activity_id=" +
                                c.activity_id +
                                "&replacement_for=" +
                                c.id
                            }
                        >
                            Preparar reemplazo
                        </ActionLink>
                    )}
                </div>
            </div>
            <Modal
                title="Anular certificado"
                open={open}
                onClose={() => setOpen(false)}
            >
                <div className="notice warning">
                    La anulación es definitiva. El PDF se conserva y el QR
                    mostrará el estado Anulado.
                </div>
                <Errors errors={f.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        f.post("/certificados/" + c.id + "/anular", {
                            onSuccess: () => setOpen(false),
                        });
                    }}
                >
                    <Field label="Motivo de anulación">
                        <textarea
                            required
                            minLength={10}
                            maxLength={3000}
                            value={f.data.reason}
                            onChange={(e) =>
                                f.setData("reason", e.target.value)
                            }
                        />
                    </Field>
                    <div className="form-actions">
                        <Button
                            type="button"
                            secondary
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="danger-button"
                            disabled={f.processing}
                        >
                            Confirmar anulación
                        </Button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
}
