export type Career = {
    id: number;
    name: string;
    code: string;
    active: boolean;
};
export type User = {
    id: number;
    name: string;
    email: string;
    role: "admin" | "chief";
    career_id: number | null;
    active: boolean;
    career?: Career;
};
export type Student = {
    id: number;
    ci: string;
    first_names: string;
    last_names: string;
    full_name: string;
    careers?: Career[];
};
export type CertificateType = {
    id: number;
    name: string;
    text: string;
    active: boolean;
};
export type Activity = {
    id: number;
    career_id: number;
    name: string;
    kind: string;
    description: string;
    starts_on: string;
    ends_on: string;
    hours: string | null;
    certificate_type_id: number;
    certificate_type: CertificateType;
    career: Career;
    participants_count?: number;
    participants: Participant[];
};
export type Participant = {
    id: number;
    student_id: number;
    activity_id: number;
    condition: string | null;
    group_name: string | null;
    student: Student;
    activity?: Activity;
};
export type Version = {
    id: number;
    number: number;
    width_mm: string;
    height_mm: string;
    design: { objects: Record<string, unknown>[]; [key: string]: unknown };
    created_at: string;
};
export type Template = {
    id: number;
    career_id: number | null;
    name: string;
    active: boolean;
    latest_version: Version;
};
export type Asset = {
    id: number;
    career_id: number | null;
    name: string;
    kind: string;
    width: number;
    height: number;
    mime: string;
};
export type Certificate = {
    id: number;
    identifier: string;
    career_id: number;
    activity_id: number;
    student_id: number;
    status: "vigente" | "vencido" | "anulado";
    public_token: string;
    issued_at: string;
    expires_at: string;
    snapshot: Record<string, string>;
    replacement_for: number | null;
    revocation?: { reason: string; created_at: string } | null;
};
export type Issue = { level: "error" | "warning"; message: string };
export type Item = {
    id: number;
    status: string;
    error: string | null;
    participant: Participant;
    review: { issues: Issue[] } | null;
    certificate: Certificate | null;
    version: Version & { template: Template };
};
export type Batch = {
    id: number;
    status: string;
    confirmed_at: string | null;
    created_at: string;
    items: Item[];
    items_count: number;
    completed_count: number;
    failed_count: number;
};
export type Pagination<T> = {
    data: T[];
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
};
export type Shared = {
    auth: { user: User | null };
    flash: { success?: string };
    issuer: string;
};
export const date = (value: string) =>
    new Intl.DateTimeFormat("es-BO", {
        dateStyle: "medium",
        timeZone: "America/La_Paz",
    }).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T12:00:00-04:00" : value));
export const statusLabel: Record<string, string> = {
    draft: "Borrador",
    pending: "Pendiente",
    queued: "En cola",
    processing: "Procesando",
    completed: "Completado",
    partial: "Con incidencias",
    failed: "Fallido",
    vigente: "Vigente",
    vencido: "Vencido",
    anulado: "Anulado",
    new: "Nuevo",
    existing: "Existente",
    discrepancy: "Discrepancia",
    duplicate: "Duplicado",
    error: "Error",
};
