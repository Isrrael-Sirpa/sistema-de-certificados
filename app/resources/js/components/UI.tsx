import { useEffect, useRef, useId, cloneElement, isValidElement, type ReactNode } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, ArrowRight, FilePlus2, Inbox, X } from "lucide-react";
import type { Pagination, Shared } from "../types";
import { statusLabel } from "../types";
export function PageTitle({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <>
            <Head title={title} />
            <div className="page-title">
                <div>
                    <div className="eyebrow">
                        GESTIÓN Y VERIFICACIÓN DE CERTIFICADOS
                    </div>
                    <h1>{title}</h1>
                    {description && <p>{description}</p>}
                </div>
                {action}
            </div>
        </>
    );
}
export function Button({
    children,
    secondary = false,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
    return (
        <button
            {...props}
            className={
                "button " +
                (secondary ? "secondary " : "") +
                (props.className ?? "")
            }
        >
            {children}
        </button>
    );
}
export function ActionLink({
    href,
    children,
    secondary = false,
}: {
    href: string;
    children: ReactNode;
    secondary?: boolean;
}) {
    return (
        <Link
            className={"button " + (secondary ? "secondary" : "")}
            href={href}
        >
            {children}
        </Link>
    );
}
export function Field({
    label,
    children,
    hint,
    error,
}: {
    label: string;
    children: ReactNode;
    hint?: string;
    error?: string;
}) {
    const id = useId();
    return (
        <label className="field" htmlFor={id}>
            <span>{label}</span>
            {isValidElement(children) ? cloneElement(children as React.ReactElement<Record<string, unknown>>, { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? id + "-error" : hint ? id + "-hint" : undefined }) : children}
            {hint && <small id={id + "-hint"}>{hint}</small>}
            {error && <small className="field-error" id={id + "-error"}>{error}</small>}
        </label>
    );
}
export function Errors({
    errors,
}: {
    errors: Record<string, string | undefined>;
}) {
    const messages = Object.values(errors).filter(Boolean);
    return messages.length ? (
        <div role="alert" className="notice danger">
            {messages.map((m, i) => (
                <div key={i}>{m}</div>
            ))}
        </div>
    ) : null;
}
export function Badge({ status }: { status: string }) {
    return (
        <span className={"badge " + status}>
            <i />
            {statusLabel[status] ?? status}
        </span>
    );
}
export function Empty({
    title = "Todavía no hay registros",
    description = "Los registros aparecerán aquí cuando los cree.",
    action,
}: {
    title?: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="empty">
            <div className="empty-icon">
                <Inbox size={28} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            {action}
        </div>
    );
}
export function Pager<T>({ page }: { page: Pagination<T> }) {
    return (
        <div className="pager">
            <span>
                {page.total
                    ? page.from +
                      "–" +
                      page.to +
                      " de " +
                      page.total +
                      " registros"
                    : "0 registros"}
            </span>
            <div>
                {page.links.map((l, i) =>
                    l.url ? (
                        <Link
                            key={i}
                            className={l.active ? "active" : ""}
                            href={l.url}
                            preserveScroll
                        >
                            {l.label.includes("Previous") ||
                            l.label.includes("Anterior") ? (
                                <ArrowLeft size={15} />
                            ) : l.label.includes("Next") ||
                              l.label.includes("Siguiente") ? (
                                <ArrowRight size={15} />
                            ) : (
                                l.label.replace(/&[^;]+;/g, "").trim()
                            )}
                        </Link>
                    ) : (
                        <span key={i}>
                            {l.label.includes("Previous") ||
                            l.label.includes("Anterior")
                                ? "Anterior"
                                : l.label.includes("Next") ||
                                    l.label.includes("Siguiente")
                                  ? "Siguiente"
                                  : l.label}
                        </span>
                    ),
                )}
            </div>
        </div>
    );
}
export function Modal({
    title,
    open,
    onClose,
    children,
}: {
    title: string;
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        if (open && !ref.current?.open) ref.current?.showModal();
        if (!open && ref.current?.open) ref.current.close();
    }, [open]);
    return (
        <dialog ref={ref} onCancel={onClose} onClose={onClose}>
            <div className="modal-heading">
                <h2>{title}</h2>
                <button
                    className="icon-button"
                    onClick={onClose}
                    aria-label="Cerrar"
                >
                    <X size={20} />
                </button>
            </div>
            {children}
        </dialog>
    );
}
export function useAuth() {
    return (usePage().props as unknown as Shared).auth.user!;
}
export function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="card">
            <div className="card-heading">
                <h2>{title}</h2>
                {description && <p>{description}</p>}
            </div>
            {children}
        </section>
    );
}
export function NewIcon() {
    return <FilePlus2 size={17} />;
}
