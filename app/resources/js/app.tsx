import React from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import "@fontsource/noto-sans/latin-400.css";
import "@fontsource/noto-sans/latin-500.css";
import "@fontsource/noto-sans/latin-600.css";
import "@fontsource/noto-sans/latin-700.css";
import "@fontsource/noto-sans/latin-400-italic.css";
import "../css/app.css";
import "../css/institutional.css";
const pages = import.meta.glob("./Pages/*.tsx");
createInertiaApp({
    title: (title) => title + " · Certificados UMSA",
    resolve: async (name) => {
        const page = pages["./Pages/" + name + ".tsx"];
        if (!page) throw new Error("Página no encontrada: " + name);
        return ((await page()) as { default: React.ComponentType }).default;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: "#024966" },
});
