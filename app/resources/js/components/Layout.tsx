import { useEffect, useState, type ReactNode } from "react";
import { Link, usePage } from "@inertiajs/react";
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    PanelsTopLeft,
    FileBadge,
    Layers,
    Image,
    Settings,
    LogOut,
    Search,
    Menu,
    ChevronRight,
    ShieldCheck,
    ArrowUpRight,
} from "lucide-react";
import Institution from "./Institution";
import type { Shared } from "../types";
const nav = [
    ["/dashboard", "Resumen general", LayoutDashboard],
    ["/estudiantes", "Estudiantes", Users],
    ["/actividades", "Actividades", CalendarDays],
    ["/plantillas", "Plantillas y editor", PanelsTopLeft],
    ["/certificados", "Certificados", FileBadge],
    ["/lotes", "Lotes de emisión", Layers],
    ["/recursos", "Recursos gráficos", Image],
] as const;
export default function Layout({
    children,
    wide = false,
}: {
    children: ReactNode;
    wide?: boolean;
}) {
    const page = usePage(),
        { auth, flash } = page.props as unknown as Shared;
    const [menu, setMenu] = useState(false);
    const [mobile, setMobile] = useState(
        () => window.matchMedia("(max-width: 780px)").matches,
    );
    useEffect(() => {
        const media = window.matchMedia("(max-width: 780px)");
        const update = () => setMobile(media.matches);
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);
    const user = auth.user;
    return (
        <div className={"app-shell " + (wide ? "wide" : "")}>
            <a className="skip-link" href="#contenido">Saltar al contenido</a>
            <aside
                className={menu ? "sidebar open" : "sidebar"}
                inert={mobile && !menu}
                aria-label="Navegación principal"
            >
                <Link href="/dashboard" className="brand">
                    <Institution compact light />
                </Link>
                <div className="sidebar-label">ESPACIO DE TRABAJO</div>
                <nav>
                    {nav.map(([href, label, Icon]) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setMenu(false)}
                            className={
                                page.url.startsWith(href) ? "selected" : ""
                            }
                        >
                            <Icon size={19} />
                            {label}
                            {page.url.startsWith(href) && (
                                <span className="nav-dot" />
                            )}
                        </Link>
                    ))}
                    {user?.role === "admin" && (
                        <>
                            <div className="sidebar-label admin-label">
                                GESTIÓN INSTITUCIONAL
                            </div>
                            <Link
                                className={
                                    page.url.startsWith("/administracion")
                                        ? "selected"
                                        : ""
                                }
                                href="/administracion"
                            >
                                <Settings size={19} />
                                Administración y auditoría
                            </Link>
                        </>
                    )}
                </nav>
                <div className="sidebar-bottom">
                    <div className="institution">
                        <ShieldCheck size={19} />
                        <span>
                            Gestión de certificados
                            <small>Facultad de Tecnología</small>
                        </span>
                    </div>
                    <Link href="/verificar" className="public-link">
                        Verificación pública
                        <ArrowUpRight size={15} />
                    </Link>
                    <div className="user-row">
                        <div className="avatar">
                            {user?.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                        </div>
                        <div>
                            <strong>{user?.name}</strong>
                            <small>
                                {user?.role === "admin"
                                    ? "Vicedecanato"
                                    : "Jefatura de carrera"}
                            </small>
                        </div>
                        <Link
                            href="/salir"
                            method="post"
                            as="button"
                            aria-label="Cerrar sesión"
                        >
                            <LogOut size={17} />
                        </Link>
                    </div>
                </div>
            </aside>
            {menu && (
                <button
                    className="scrim"
                    onClick={() => setMenu(false)}
                    aria-label="Cerrar menú"
                />
            )}
            <div className="main-shell">
                <header className="topbar">
                    <button
                        className="icon-button mobile-menu"
                        onClick={() => setMenu(!menu)}
                        aria-label={menu ? "Cerrar menú" : "Abrir menú"}
                        aria-expanded={menu}
                    >
                        <Menu />
                    </button>
                    <div className="breadcrumb">
                        Facultad de Tecnología · UMSA
                        <ChevronRight size={14} />
                        <strong>Sistema de certificados</strong>
                    </div>
                    <form action="/estudiantes" className="global-search">
                        <Search size={16} />
                        <input
                            name="q"
                            placeholder="Buscar estudiante por nombre o CI"
                            aria-label="Buscar estudiante"
                        />
                        <kbd>↵</kbd>
                    </form>
                    <span className="scope-pill">
                        {user?.role === "admin"
                            ? "Ámbito global"
                            : (user?.career?.name ?? "Mi carrera")}
                    </span>
                </header>
                <main id="contenido" tabIndex={-1}>
                    {flash.success && (
                        <div className="notice success" role="status">
                            {flash.success}
                        </div>
                    )}
                    {children}
                </main>
                <footer>
                    Universidad Mayor de San Andrés · Facultad de Tecnología
                    <span>Gestión institucional de certificados</span>
                </footer>
            </div>
        </div>
    );
}
