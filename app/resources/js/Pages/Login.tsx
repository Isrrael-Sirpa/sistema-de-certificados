import { Head, Link, useForm } from "@inertiajs/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Institution from "../components/Institution";
import { Button, Errors, Field } from "../components/UI";
export default function Login() {
    const f = useForm({ email: "", password: "" });
    return (
        <div className="login">
            <Head title="Ingreso institucional" />
            <aside className="login-aside">
                <Institution light />
                <div className="login-quote">
                    <div className="eyebrow">
                        GESTIÓN INSTITUCIONAL DE CERTIFICADOS
                    </div>
                    <h1>Certificados que<br />acompañan la<br />formación.</h1>
                    <p>
                        Diseña, emite y verifica certificados de formación con
                        el respaldo de una gestión organizada y trazable.
                    </p>
                </div>
                <div className="login-foot">
                    UNIVERSIDAD MAYOR DE SAN ANDRÉS
                    <br />
                    Facultad de Tecnología · La Paz, Bolivia
                </div>
            </aside>
            <main className="login-main">
                <div className="login-form">
                    <div className="login-mobile-brand"><Institution /></div>
                    <div className="eyebrow">
                        ACCESO AL SISTEMA
                    </div>
                    <h1>Ingreso institucional</h1>
                    <p>
                        Accede con tu cuenta personal para gestionar los
                        certificados de tu ámbito.
                    </p>
                    <Errors errors={f.errors} />
                    <form
                        className="form-stack"
                        onSubmit={(e) => {
                            e.preventDefault();
                            f.post("/ingresar", {
                                onFinish: () => f.reset("password"),
                            });
                        }}
                    >
                        <Field label="Correo electrónico" error={f.errors.email}>
                            <input
                                autoFocus
                                type="email"
                                autoComplete="username"
                                required
                                value={f.data.email}
                                onChange={(e) =>
                                    f.setData("email", e.target.value)
                                }
                                placeholder="Tu correo institucional"
                            />
                        </Field>
                        <Field label="Contraseña" error={f.errors.password}>
                            <input
                                type="password"
                                autoComplete="current-password"
                                required
                                value={f.data.password}
                                onChange={(e) =>
                                    f.setData("password", e.target.value)
                                }
                                placeholder="Ingresa tu contraseña"
                            />
                        </Field>
                        <Button disabled={f.processing}>
                            {f.processing
                                ? "Ingresando…"
                                : "Ingresar a mi cuenta"}
                            <ArrowRight size={16} />
                        </Button>
                    </form>
                    <div className="login-public">
                        <ShieldCheck
                            size={20}
                            style={{ margin: "0 auto 8px" }}
                        />
                        ¿Recibiste un certificado?
                        <br />
                        <Link href="/verificar">
                            Verificar un certificado sin iniciar sesión →
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
