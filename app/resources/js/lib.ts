export async function api<T>(url: string, data?: unknown): Promise<T> {
    const response = await fetch(url, {
        method: data === undefined ? "GET" : "POST",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-TOKEN":
                document.querySelector<HTMLMetaElement>(
                    'meta[name="csrf-token"]',
                )?.content ?? "",
        },
        body: data === undefined ? undefined : JSON.stringify(data),
    });
    const result = await response
        .json()
        .catch(() => ({ message: "Respuesta inesperada del servidor." }));
    if (!response.ok)
        throw new Error(result.message ?? "No se pudo completar la operación.");
    return result as T;
}
export function downloadBundle(ids: number[], format: "zip" | "pdf") {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/certificados/exportar";
    form.target = "_blank";
    const fields: Record<string, string> = {
        _token:
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content ?? "",
        format,
    };
    ids.forEach((id, i) => (fields["ids[" + i + "]"] = String(id)));
    Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.append(input);
    });
    document.body.append(form);
    form.submit();
    form.remove();
}
