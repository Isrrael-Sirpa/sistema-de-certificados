import { defineConfig } from "vite";
export default defineConfig({
    publicDir: false,
    build: {
        outDir: "public",
        emptyOutDir: false,
        lib: {
            entry: "resources/js/pdf-entry.ts",
            formats: ["iife"],
            name: "CertificateRenderer",
            fileName: () => "pdf-renderer.js",
        },
        minify: true,
    },
});
