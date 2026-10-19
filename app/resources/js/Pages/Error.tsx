import { Head, Link } from "@inertiajs/react";
export default function ErrorPage({
    status = 500,
    message,
}: {
    status: number;
    message?: string;
}) {
    const messages: Record<number, string> = {
        403: "No tienes acceso a este registro.",
        404: "No se encontró el registro solicitado.",
        419: "Tu sesión ha vencido. Inicia sesión nuevamente.",
        429: "Demasiadas consultas. Intenta nuevamente en un minuto.",
        500: "No se pudo completar la operación. El equipo técnico puede consultar el registro del servidor.",
    };
    return (
        <main className="public-page">
            <Head title={"Error " + status} />
            <div className="public-card public-card-body">
                <div className="eyebrow">CERTIFICADOS · UMSA</div>
                <h1>{status}</h1>
                <p style={{ margin: "20px 0" }}>
                    {message ||
                        messages[status] ||
                        "No se pudo completar la solicitud."}
                </p>
                <Link className="button" href="/dashboard">
                    Volver al inicio
                </Link>
                <Link
                    className="button secondary"
                    style={{ marginLeft: 10 }}
                    href="/verificar"
                >
                    Verificar certificado
                </Link>
            </div>
        </main>
    );
}
