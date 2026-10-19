import { Check } from "lucide-react";
export default function Workflow({ steps, current }: { steps: string[]; current: number }) {
    return <ol className="workflow" aria-label="Etapas del proceso">{steps.map((label, index) => <li key={label} className={index === current ? "current" : index < current ? "done" : ""} aria-current={index === current ? "step" : undefined}><span>{index < current ? <Check size={16} aria-label="Completado" /> : index + 1}</span><strong>{label}</strong></li>)}</ol>;
}
