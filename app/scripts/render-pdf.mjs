import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const payload = JSON.parse(input);
const browser = await puppeteer.launch({
    executablePath: process.env.PDF_CHROME_BINARY || undefined,
    headless: true,
    args: [
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--no-first-run",
    ],
});
try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (r) =>
        r.url().startsWith("data:") || r.url() === "about:blank"
            ? r.continue()
            : r.abort(),
    );
    const font = await fs.readFile(
        path.resolve(
            "node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2",
        ),
        "base64",
    );
    const bold = await fs.readFile(
        path.resolve(
            "node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2",
        ),
        "base64",
    );
    const italic = await fs.readFile(
        path.resolve(
            "node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-italic.woff2",
        ),
        "base64",
    );
    await page.setContent(
        '<html><head><style>@font-face{font-family:"Noto Sans";src:url(data:font/woff2;base64,' +
            font +
            ')}@font-face{font-family:"Noto Sans";font-weight:700;src:url(data:font/woff2;base64,' +
            bold +
            ')}@font-face{font-family:"Noto Sans";font-style:italic;src:url(data:font/woff2;base64,' +
            italic +
            ")}*{box-sizing:border-box}body{margin:0}svg{display:block} @page{size:" +
            payload.widthMm +
            "mm " +
            payload.heightMm +
            "mm;margin:0}</style></head><body></body></html>",
    );
    await page.evaluate(async () => {
        await Promise.all([
            document.fonts.load('16px "Noto Sans"'),
            document.fonts.load('700 16px "Noto Sans"'),
            document.fonts.load('italic 16px "Noto Sans"'),
        ]);
    });
    await page.addScriptTag({
        content: await fs.readFile("public/pdf-renderer.js", "utf8"),
    });
    const result = await page.evaluate(
        async (p) => await window.renderCertificate(p),
        payload,
    );
    if (payload.output && !result.issues.some((i) => i.level === "error")) {
        await page.evaluate((svg) => {
            document.body.innerHTML = svg;
            document.querySelector("svg").style.width = "100%";
            document.querySelector("svg").style.height = "100%";
        }, result.svg);
        const pdf = await page.pdf({
            width: payload.widthMm + "mm",
            height: payload.heightMm + "mm",
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });
        const document = await PDFDocument.load(pdf);
        for (const sheet of document.getPages())
            sheet.setSize(
                (payload.widthMm * 72) / 25.4,
                (payload.heightMm * 72) / 25.4,
            );
        await fs.writeFile(payload.output, await document.save());
    }
    process.stdout.write(JSON.stringify(result));
} finally {
    await browser.close();
}
