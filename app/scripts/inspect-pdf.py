import json,sys,pathlib
import pypdfium2 as pdfium
from pypdf import PdfReader
records=json.load(sys.stdin)
out=[]
for record in records:
    path=pathlib.Path(record["path"])
    reader=PdfReader(str(path))
    if len(reader.pages)!=1:
        raise RuntimeError("El certificado debe tener una página: "+str(path))
    page=reader.pages[0]
    text=page.extract_text() or ""
    if " ".join(record["recipient"].split()) not in " ".join(text.split()):
        raise RuntimeError("Nombre ausente o caracteres incorrectos: "+record["recipient"])
    doc=pdfium.PdfDocument(str(path))
    rendered=doc[0].render(scale=2).to_pil()
    png=path.with_suffix(".qa.png")
    rendered.save(png)
    raw=path.with_suffix(".qa.gray")
    gray=rendered.convert("L")
    raw.write_bytes(gray.tobytes())
    out.append({**record,"pages":len(reader.pages),"width_mm":round(float(page.mediabox.width)*25.4/72,2),"height_mm":round(float(page.mediabox.height)*25.4/72,2),"png":str(png),"raw":str(raw),"width":gray.width,"height":gray.height,"embedded_text":True})
print(json.dumps(out,ensure_ascii=False))
