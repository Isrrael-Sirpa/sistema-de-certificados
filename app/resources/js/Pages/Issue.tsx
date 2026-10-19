import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { ArrowRight } from "lucide-react";
import Workflow from "../components/Workflow";
import Layout from "../components/Layout";
import { PageTitle, Button, Field, Errors, Empty } from "../components/UI";
import type { Activity, Template } from "../types";
type Selection = {
    participant_id: number;
    template_version_id: number;
    replacement_for: number | null;
};
export default function Issue({
    activities,
    templates,
    activityId,
    replacementFor,
    templateId: initialTemplateId,
}: {
    activities: Activity[];
    templates: Template[];
    activityId: number | null;
    replacementFor: number | null;
    templateId?: number | null;
}) {
    const requested = templates.find(t => t.id === initialTemplateId);
    const [active, setActive] = useState(activityId ?? activities.find(a => !requested?.career_id || a.career_id === requested.career_id)?.id ?? 0),
        [templateId, setTemplate] = useState(initialTemplateId ?? 0),
        [group, setGroup] = useState("");
    const f = useForm({
        operation_key: crypto.randomUUID(),
        items: [] as Selection[],
    });
    const activity = activities.find((a) => a.id === active),
        available = templates.filter(
            (t) => !t.career_id || t.career_id === activity?.career_id,
        ),
        template = available.find((t) => t.id === templateId) ?? available[0],
        rows =
            activity?.participants.filter(
                (p) => !group || p.group_name === group,
            ) ?? [];
    function toggle(ids: number[], checked: boolean) {
        if (!template) return;
        f.setData("items", [
            ...f.data.items.filter((i) => !ids.includes(i.participant_id)),
            ...(checked
                ? ids.map((id) => ({
                      participant_id: id,
                      template_version_id: template.latest_version.id,
                      replacement_for: replacementFor,
                  }))
                : []),
        ]);
    }
    const selectedCount =
        activity?.participants.filter((p) =>
            f.data.items.some((i) => i.participant_id === p.id),
        ).length ?? 0;
    return (
        <Layout>
            <PageTitle
                title="Preparar una emisión"
                description="Selecciona destinatarios de forma explícita. El borrador aún no tiene validez ni inicia la vigencia."
            />
            <Workflow steps={["Seleccionar destinatarios", "Revisar diseños", "Confirmar emisión", "Descargar"]} current={0} />
            <Errors errors={f.errors} />
            {replacementFor && (
                <div className="notice warning">
                    Reemplazo del certificado anulado #{replacementFor}.
                    Selecciona únicamente al destinatario correspondiente.
                </div>
            )}
            <div className="filterbar">
                <Field label="Actividad">
                    <select
                        value={active}
                        onChange={(e) => {
                            setActive(Number(e.target.value));
                            setTemplate(0);
                            setGroup("");
                        }}
                    >
                        {activities.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name} · {a.career.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Plantilla para esta selección">
                    <select
                        value={template?.id ?? ""}
                        onChange={(e) => setTemplate(Number(e.target.value))}
                    >
                        <option value="" disabled>
                            Elige una plantilla
                        </option>
                        {available.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name} · v{t.latest_version.number}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Filtrar grupo">
                    <select
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                    >
                        <option value="">Todos los grupos</option>
                        {[
                            ...new Set(
                                activity?.participants
                                    .map((p) => p.group_name)
                                    .filter(Boolean),
                            ),
                        ].map((g) => (
                            <option key={g} value={g!}>
                                {g}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            <div className="notice">
                {activity?.participants.length ?? 0} participantes en esta
                actividad · <strong>{selectedCount} seleccionados</strong>. Solo
                recibirán certificado las personas marcadas. Puedes cambiar de
                actividad y añadir destinatarios a la misma operación.
            </div>
            <section className="card">
                {rows.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            aria-label="Seleccionar grupo visible"
                                            disabled={!template}
                                            checked={rows.every((p) =>
                                                f.data.items.some(
                                                    (i) =>
                                                        i.participant_id ===
                                                        p.id,
                                                ),
                                            )}
                                            onChange={(e) =>
                                                toggle(
                                                    rows.map((p) => p.id),
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                    </th>
                                    <th>Destinatario</th>
                                    <th>Condición</th>
                                    <th>Grupo</th>
                                    <th>Diseño seleccionado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((p) => {
                                    const chosen = f.data.items.find(
                                        (i) => i.participant_id === p.id,
                                    );
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    aria-label={
                                                        "Emitir para " +
                                                        p.student.full_name
                                                    }
                                                    disabled={!template}
                                                    checked={!!chosen}
                                                    onChange={(e) =>
                                                        toggle(
                                                            [p.id],
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <strong>
                                                    {p.student.full_name}
                                                </strong>
                                                <small>CI {p.student.ci}</small>
                                            </td>
                                            <td>
                                                {p.condition ?? (
                                                    <span className="muted">
                                                        Sin registrar; requiere
                                                        corrección
                                                    </span>
                                                )}
                                            </td>
                                            <td>{p.group_name ?? "—"}</td>
                                            <td>
                                                {chosen
                                                    ? templates.find(
                                                          (t) =>
                                                              t.latest_version
                                                                  .id ===
                                                              chosen.template_version_id,
                                                      )?.name
                                                    : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        title="No hay participantes para seleccionar"
                        description="Asocia estudiantes a la actividad y registra su condición antes de continuar."
                    />
                )}
            </section>
            <div className="selection-summary">
                <div>
                    <strong>
                        {f.data.items.length} destinatarios en la operación
                    </strong>
                    <small>
                        Las fechas, el identificador y el QR se generan al
                        emitir.
                    </small>
                </div>
                <div className="inline">
                    <Button secondary onClick={() => f.setData("items", [])}>
                        Vaciar selección
                    </Button>
                    <Button
                        disabled={f.processing || !f.data.items.length}
                        onClick={() => f.post("/lotes")}
                    >
                        {f.processing
                            ? "Preparando…"
                            : "Crear borrador y revisar"}
                        <ArrowRight size={15} />
                    </Button>
                </div>
            </div>
        </Layout>
    );
}
