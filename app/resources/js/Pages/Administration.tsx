import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { Plus, Pencil } from "lucide-react";
import Layout from "../components/Layout";
import {
    PageTitle,
    Button,
    Modal,
    Field,
    Errors,
    Pager,
    Badge,
} from "../components/UI";
import {
    date,
    type Career,
    type User,
    type CertificateType,
    type Pagination,
} from "../types";
type Audit = {
    id: number;
    created_at: string;
    action: string;
    user: User | null;
    subject_type: string | null;
    subject_id: number | null;
    details: Record<string, unknown>;
};
export default function Administration({
    careers,
    users,
    types,
    audit,
}: {
    careers: Career[];
    users: User[];
    types: CertificateType[];
    audit: Pagination<Audit>;
}) {
    const [tab, setTab] = useState("users"),
        [modal, setModal] = useState<string | null>(null),
        [id, setId] = useState<number | null>(null);
    const user = useForm({
            name: "",
            email: "",
            password: "",
            role: "chief",
            career_id: careers[0]?.id ?? "",
            active: true,
        }),
        career = useForm({ name: "", code: "", active: true }),
        type = useForm({ name: "", text: "", active: true });
    const start = (kind: string, record?: User | Career | CertificateType) => {
        setId(record?.id ?? null);
        setModal(kind);
        if (kind === "users") {
            const u = record as User | undefined;
            user.setData({
                name: u?.name ?? "",
                email: u?.email ?? "",
                password: "",
                role: u?.role ?? "chief",
                career_id: u?.career_id ?? careers[0]?.id ?? "",
                active: u?.active ?? true,
            });
            user.clearErrors();
        }
        if (kind === "careers") {
            const c = record as Career | undefined;
            career.setData({
                name: c?.name ?? "",
                code: c?.code ?? "",
                active: c?.active ?? true,
            });
            career.clearErrors();
        }
        if (kind === "types") {
            const t = record as CertificateType | undefined;
            type.setData({
                name: t?.name ?? "",
                text: t?.text ?? "",
                active: t?.active ?? true,
            });
            type.clearErrors();
        }
    };
    return (
        <Layout>
            <PageTitle
                title="Administración y auditoría"
                description="Cuentas personales, carreras configurables y trazabilidad de las operaciones."
                action={
                    tab !== "audit" ? (
                        <Button onClick={() => start(tab)}>
                            <Plus size={15} />
                            {tab === "users"
                                ? "Crear cuenta"
                                : tab === "careers"
                                  ? "Crear carrera"
                                  : "Crear tipo"}
                        </Button>
                    ) : undefined
                }
            />
            <div className="tabs">
                {[
                    ["users", "Cuentas personales"],
                    ["careers", "Carreras"],
                    ["types", "Tipos de certificado"],
                    ["audit", "Auditoría"],
                ].map(([k, v]) => (
                    <button
                        className={tab === k ? "active" : ""}
                        key={k}
                        onClick={() => setTab(k)}
                    >
                        {v}
                    </button>
                ))}
            </div>
            <section className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                {(tab === "users"
                                    ? [
                                          "Persona / correo",
                                          "Rol",
                                          "Carrera",
                                          "Estado",
                                          "",
                                      ]
                                    : tab === "careers"
                                      ? ["Carrera", "Código", "Estado", ""]
                                      : tab === "types"
                                        ? [
                                              "Tipo",
                                              "Texto del certificado",
                                              "Estado",
                                              "",
                                          ]
                                        : [
                                              "Fecha",
                                              "Usuario",
                                              "Operación",
                                              "Registro",
                                              "Detalles",
                                          ]
                                ).map((h, i) => (
                                    <th key={i}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tab === "users"
                                ? users.map((u) => (
                                      <tr key={u.id}>
                                          <td>
                                              <strong>{u.name}</strong>
                                              <small>{u.email}</small>
                                          </td>
                                          <td>
                                              {u.role === "admin"
                                                  ? "Vicedecanato"
                                                  : "Jefe de carrera"}
                                          </td>
                                          <td>
                                              {u.career?.name ??
                                                  "Ámbito global"}
                                          </td>
                                          <td>
                                              <Badge
                                                  status={
                                                      u.active
                                                          ? "vigente"
                                                          : "anulado"
                                                  }
                                              />
                                          </td>
                                          <td>
                                              <button
                                                  className="icon-button"
                                                  aria-label={
                                                      "Editar " + u.name
                                                  }
                                                  onClick={() =>
                                                      start("users", u)
                                                  }
                                              >
                                                  <Pencil size={14} />
                                              </button>
                                          </td>
                                      </tr>
                                  ))
                                : tab === "careers"
                                  ? careers.map((c) => (
                                        <tr key={c.id}>
                                            <td>
                                                <strong>{c.name}</strong>
                                            </td>
                                            <td>{c.code}</td>
                                            <td>
                                                {c.active
                                                    ? "Activa"
                                                    : "Desactivada"}
                                            </td>
                                            <td>
                                                <button
                                                    className="icon-button"
                                                    aria-label="Editar carrera"
                                                    onClick={() =>
                                                        start("careers", c)
                                                    }
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                  : tab === "types"
                                    ? types.map((t) => (
                                          <tr key={t.id}>
                                              <td>
                                                  <strong>{t.name}</strong>
                                              </td>
                                              <td>{t.text}</td>
                                              <td>
                                                  {t.active
                                                      ? "Activo"
                                                      : "Desactivado"}
                                              </td>
                                              <td>
                                                  <button
                                                      className="icon-button"
                                                      aria-label="Editar tipo"
                                                      onClick={() =>
                                                          start("types", t)
                                                      }
                                                  >
                                                      <Pencil size={14} />
                                                  </button>
                                              </td>
                                          </tr>
                                      ))
                                    : audit.data.map((a) => (
                                          <tr key={a.id}>
                                              <td>{date(a.created_at)}</td>
                                              <td>
                                                  {a.user?.name ?? "Sistema"}
                                              </td>
                                              <td className="mono">
                                                  {a.action}
                                              </td>
                                              <td>
                                                  {a.subject_type
                                                      ?.split("\\")
                                                      .pop()}{" "}
                                                  #{a.subject_id ?? "—"}
                                              </td>
                                              <td
                                                  style={{
                                                      maxWidth: 350,
                                                      wordBreak: "break-word",
                                                  }}
                                              >
                                                  {JSON.stringify(a.details)}
                                              </td>
                                          </tr>
                                      ))}
                        </tbody>
                    </table>
                </div>
                {tab === "audit" && <Pager page={audit} />}
            </section>
            <Modal
                title={id ? "Editar cuenta personal" : "Crear cuenta personal"}
                open={modal === "users"}
                onClose={() => setModal(null)}
            >
                <Errors errors={user.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        user.post(
                            "/administracion/usuarios" + (id ? "/" + id : ""),
                            { onSuccess: () => setModal(null) },
                        );
                    }}
                >
                    <Field label="Nombre completo">
                        <input
                            required
                            value={user.data.name}
                            onChange={(e) =>
                                user.setData("name", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Correo">
                        <input
                            required
                            type="email"
                            value={user.data.email}
                            onChange={(e) =>
                                user.setData("email", e.target.value)
                            }
                        />
                    </Field>
                    <Field
                        label={
                            id
                                ? "Nueva contraseña (opcional)"
                                : "Contraseña inicial"
                        }
                        hint="Mínimo 12 caracteres. Entregar por un canal apropiado a la persona."
                    >
                        <input
                            required={!id}
                            type="password"
                            minLength={12}
                            autoComplete="new-password"
                            value={user.data.password}
                            onChange={(e) =>
                                user.setData("password", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Rol">
                        <select
                            value={user.data.role}
                            onChange={(e) =>
                                user.setData("role", e.target.value)
                            }
                        >
                            <option value="chief">Jefe de carrera</option>
                            <option value="admin">Vicedecanato</option>
                        </select>
                    </Field>
                    {user.data.role === "chief" && (
                        <Field label="Carrera asignada">
                            <select
                                required
                                value={user.data.career_id}
                                onChange={(e) =>
                                    user.setData(
                                        "career_id",
                                        Number(e.target.value),
                                    )
                                }
                            >
                                {careers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}
                    <label className="check-label">
                        <input
                            type="checkbox"
                            checked={user.data.active}
                            onChange={(e) =>
                                user.setData("active", e.target.checked)
                            }
                        />
                        Cuenta activa
                    </label>
                    <Button disabled={user.processing}>Guardar cuenta</Button>
                </form>
            </Modal>
            <Modal
                title={id ? "Editar carrera" : "Crear carrera"}
                open={modal === "careers"}
                onClose={() => setModal(null)}
            >
                <Errors errors={career.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        career.post(
                            "/administracion/carreras" + (id ? "/" + id : ""),
                            { onSuccess: () => setModal(null) },
                        );
                    }}
                >
                    <Field label="Nombre oficial configurable">
                        <input
                            required
                            value={career.data.name}
                            onChange={(e) =>
                                career.setData("name", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Código">
                        <input
                            required
                            maxLength={30}
                            value={career.data.code}
                            onChange={(e) =>
                                career.setData("code", e.target.value)
                            }
                        />
                    </Field>
                    <label className="check-label">
                        <input
                            type="checkbox"
                            checked={career.data.active}
                            onChange={(e) =>
                                career.setData("active", e.target.checked)
                            }
                        />
                        Carrera activa
                    </label>
                    <Button disabled={career.processing}>
                        Guardar carrera
                    </Button>
                </form>
            </Modal>
            <Modal
                title={
                    id
                        ? "Editar tipo de certificado"
                        : "Crear tipo de certificado"
                }
                open={modal === "types"}
                onClose={() => setModal(null)}
            >
                <Errors errors={type.errors} />
                <form
                    className="form-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        type.post(
                            "/administracion/tipos" + (id ? "/" + id : ""),
                            { onSuccess: () => setModal(null) },
                        );
                    }}
                >
                    <Field label="Nombre del tipo">
                        <input
                            required
                            value={type.data.name}
                            onChange={(e) =>
                                type.setData("name", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Texto que acredita">
                        <textarea
                            required
                            value={type.data.text}
                            onChange={(e) =>
                                type.setData("text", e.target.value)
                            }
                        />
                    </Field>
                    <label className="check-label">
                        <input
                            type="checkbox"
                            checked={type.data.active}
                            onChange={(e) =>
                                type.setData("active", e.target.checked)
                            }
                        />
                        Tipo activo
                    </label>
                    <Button disabled={type.processing}>Guardar tipo</Button>
                </form>
            </Modal>
        </Layout>
    );
}
