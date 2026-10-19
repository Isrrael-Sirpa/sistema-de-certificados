import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const { paths, output } = JSON.parse(input),
    doc = await PDFDocument.create();
for (const p of paths) {
    const source = await PDFDocument.load(await fs.readFile(p));
    for (const page of await doc.copyPages(source, source.getPageIndices()))
        doc.addPage(page);
}
await fs.writeFile(output, await doc.save());
