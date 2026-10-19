import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
    RGBLuminanceSource,
    HybridBinarizer,
    BinaryBitmap,
    QRCodeReader,
    DecodeHintType,
} = require("@zxing/library");
const inventory = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
const result = spawnSync(
    process.env.QA_PYTHON_BINARY || "python",
    ["scripts/inspect-pdf.py"],
    {
        input: JSON.stringify(inventory),
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    },
);
if (result.status !== 0)
    throw new Error(result.stderr || "Error inspeccionando PDF.");
const reports = JSON.parse(result.stdout);
for (const report of reports) {
    const pixels = new Uint8ClampedArray(await fs.readFile(report.raw));
    const bitmap = new BinaryBitmap(
        new HybridBinarizer(
            new RGBLuminanceSource(pixels, report.width, report.height),
        ),
    );
    const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);
    const decoded = new QRCodeReader().decode(bitmap, hints).getText();
    if (decoded !== report.verification_url)
        throw new Error("El QR no coincide con su registro: " + report.path);
    report.qr_matches_record = true;
    await fs.unlink(report.raw);
    delete report.raw;
    delete report.verification_url;
}
process.stdout.write(
    JSON.stringify({ result: "passed", pdfs: reports }, null, 2),
);
