import { useEffect, useRef, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { ShieldCheck, ScanLine, Search, ShieldX, Clock3 } from "lucide-react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import Institution from "../components/Institution";
import { Button, Field, Badge } from "../components/UI";
import { date } from "../types";
type PublicCertificate = {
    issuer: string;
    recipient: string;
    activity: string;
    type: string;
    career: string;
    identifier: string;
    issued_at: string;
    expires_at: string;
    status: string;
};
export default function Verify({
    certificate: c,
}: {
    certificate: PublicCertificate | null;
}) {
    const [input, setInput] = useState(""),
        [scanning, setScanning] = useState(false),
        [error, setError] = useState("");
    const video = useRef<HTMLVideoElement>(null),
        controls = useRef<IScannerControls | null>(null);
    function go(value: string) {
        const token = value
            .trim()
            .match(/(?:^|\/verificar\/)([a-f0-9]{64})(?:[?#].*)?$/)?.[1];
        if (token) {
            window.location.assign("/verificar/" + token);
        } else
            setError(
                "Introduce la URL o el código de verificación de 64 caracteres que acompaña al QR.",
            );
    }
    useEffect(() => {
        if (!scanning) return;
        let alive = true;
        const reader = new BrowserQRCodeReader();
        reader
            .decodeFromVideoDevice(undefined, video.current!, (result) => {
                if (result && alive) {
                    controls.current?.stop();
                    go(result.getText());
                }
            })
            .then((c) => {
                if (alive) controls.current = c;
                else c.stop();
            })
            .catch(() => {
                setError(
                    "No se pudo acceder a la cámara. Usa HTTPS y autoriza el acceso, o pega el enlace del QR.",
                );
                setScanning(false);
            });
        return () => {
            alive = false;
            controls.current?.stop();
        };
    }, [scanning]);
    const Icon =
        c?.status === "anulado"
            ? ShieldX
            : c?.status === "vencido"
              ? Clock3
              : ShieldCheck;
    return (
        <div className="public-page">
            <Head title="Verificación de certificado" />
            <div className="public-brand"><Institution /></div>
            <article className="public-card">
                <div className="public-card-top">
                    <Icon
                        size={39}
                        color={
                            c?.status === "anulado"
                                ? "var(--danger)"
                                : c?.status === "vencido"
                                  ? "var(--warning)"
                                  : "var(--success)"
                        }
                        style={{ margin: "0 auto" }}
                    />
                    <h1>
                        {c
                            ? "Registro de certificado"
                            : "Verificar un certificado"}
                    </h1>
                    <p>
                        {c
                            ? "Compara estos datos con el documento presentado."
                            : "Escanea el QR o pega su enlace para consultar el registro institucional."}
                    </p>
                    {c && (
                        <div style={{ marginTop: 15 }}>
                            <Badge status={c.status} />
                        </div>
                    )}
                </div>
                <div className="public-card-body">
                    {c ? (
                        <>
                            <div className="eyebrow">DESTINATARIO</div>
                            <div className="public-recipient">
                                {c.recipient}
                            </div>
                            <dl className="details">
                                {[
                                    ["Actividad", c.activity],
                                    ["Tipo de certificado", c.type],
                                    ["Carrera / unidad", c.career],
                                    ["Identificador", c.identifier],
                                    ["Fecha de emisión", date(c.issued_at)],
                                    [
                                        "Fecha de vencimiento",
                                        date(c.expires_at),
                                    ],
                                ].map(([k, v]) => (
                                    <div key={k}>
                                        <dt>{k}</dt>
                                        <dd>{v}</dd>
                                    </div>
                                ))}
                            </dl>
                            <div
                                style={{ marginTop: 25 }}
                                className={
                                    "notice " +
                                    (c.status === "vigente"
                                        ? "success"
                                        : c.status === "anulado"
                                          ? "danger"
                                          : "warning")
                                }
                            >
                                {c.status === "vigente"
                                    ? "Este certificado se encuentra vigente."
                                    : c.status === "anulado"
                                      ? "Este certificado ha sido anulado y ya no acredita una condición vigente."
                                      : "Este certificado ha alcanzado su fecha de vencimiento."}
                            </div>
                            <p className="help-text">
                                <strong>Entidad emisora:</strong> {c.issuer}
                            </p>
                        </>
                    ) : (
                        <div className="form-stack">
                            {error && (
                                <div className="notice danger" role="alert">
                                    {error}
                                </div>
                            )}
                            <form
                                className="form-stack"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    go(input);
                                }}
                            >
                                <Field label="Enlace o código de verificación">
                                    <input
                                        required
                                        value={input}
                                        onChange={(e) =>
                                            setInput(e.target.value)
                                        }
                                        placeholder="Pega el enlace que aparece en el QR"
                                    />
                                </Field>
                                <Button>
                                    <Search size={16} />
                                    Consultar registro
                                </Button>
                            </form>
                            <Button
                                secondary
                                onClick={() => setScanning(!scanning)}
                            >
                                <ScanLine size={18} />
                                {scanning
                                    ? "Cerrar cámara"
                                    : "Escanear QR con la cámara"}
                            </Button>
                            {scanning && (
                                <video ref={video} autoPlay playsInline muted />
                            )}
                        </div>
                    )}
                </div>
            </article>
            <p className="public-footer">
                El QR permite consultar este registro. Comprueba que el nombre,
                la actividad y el identificador coincidan con el documento. El
                QR no equivale a una firma digital.
                <br />
                <Link
                    className="text-link"
                    href={c ? "/verificar" : "/ingresar"}
                >
                    {c ? "Verificar otro certificado" : "Acceso institucional"}
                </Link>
            </p>
        </div>
    );
}
