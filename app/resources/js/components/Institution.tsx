export default function Institution({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
    return <div className={`institution-brand ${compact ? "compact" : ""} ${light ? "light" : ""}`}>
        <div className="institution-emblems">
            <img src="/institutional/umsa.png" alt="Escudo de la Universidad Mayor de San Andrés" />
            <span aria-hidden="true" />
            <img src="/institutional/facultad-official-original.png" alt="Emblema de la Facultad de Tecnología" />
        </div>
        <div className="institution-name"><span>Universidad Mayor de San Andrés</span><strong>Facultad de Tecnología</strong>{!compact && <small>Sistema de Gestión y Verificación de Certificados</small>}</div>
    </div>;
}
