"""Private policy planning and document extraction. No arbitrary-code or submission API."""
import hmac
import io
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import TypedDict

from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile, File
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field
from pypdf import PdfReader
from docx import Document
from PIL import Image
import pytesseract

app = FastAPI(title='VeloVisa private worker', docs_url=None, redoc_url=None)

def authorize(authorization: str = Header(default='')):
    token = os.environ.get('PYTHON_SERVICE_TOKEN', '')
    if len(token) < 32:
        raise HTTPException(503, 'Service token is not configured')
    if not hmac.compare_digest(authorization.encode(), f'Bearer {token}'.encode()):
        raise HTTPException(401, 'Unauthorized')

class Plan(BaseModel):
    task: str = Field(min_length=1, max_length=16000)

class State(TypedDict):
    task: str
    guarded: str

def policy(state: State):
    return {'guarded': state['task'] + '\nPrivate-worker policy: stop for human review; no payments, final applications, uploads or legal declarations. Never fabricate evidence or eligibility.'}

graph = StateGraph(State)
graph.add_node('policy', policy)
graph.add_edge(START, 'policy')
graph.add_edge('policy', END)
planner = graph.compile()

@app.post('/plan', dependencies=[Depends(authorize)])
def plan(body: Plan):
    return {'task': planner.invoke({'task': body.task, 'guarded': ''})['guarded']}

@app.post('/extract', dependencies=[Depends(authorize)])
def extract(file: UploadFile = File(...)):
    raw = file.file.read(10 * 1024 * 1024 + 1)
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, 'Document too large')
    filename = Path(file.filename or 'document').name
    suffix = Path(filename).suffix.lower()
    warnings = ['Extraction is not certification. Verify names, dates and passport numbers against the original.']
    try:
        if suffix == '.pdf':
            reader = PdfReader(io.BytesIO(raw))
            if len(reader.pages) > 80:
                raise HTTPException(413, 'Maximum 80 PDF pages')
            text = '\n'.join(page.extract_text() or '' for page in reader.pages)
            method = 'PDF text extraction'
            if len(text.strip()) < 20:
                warnings.append('Scanned PDF detected; OCR/manual review is required. No verified text extracted.')
        elif suffix == '.docx':
            import zipfile
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                if sum(info.file_size for info in archive.infolist()) > 50 * 1024 * 1024:
                    raise HTTPException(413, 'Expanded document too large')
            document = Document(io.BytesIO(raw))
            text = '\n'.join([p.text for p in document.paragraphs] + [' | '.join(c.text for c in row.cells) for table in document.tables for row in table.rows])
            method = 'DOCX structural extraction'
        elif suffix == '.doc':
            with tempfile.TemporaryDirectory() as directory:
                source = Path(directory) / 'input.doc'
                source.write_bytes(raw)
                subprocess.run(['libreoffice', '-env:UserInstallation=file://' + directory + '/profile', '--headless', '--convert-to', 'txt:Text', '--outdir', directory, str(source)], check=True, timeout=30, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                text = (Path(directory) / 'input.txt').read_text(errors='replace')
            method = 'DOC converted by LibreOffice'
        elif suffix in {'.jpg', '.jpeg', '.png'}:
            image = Image.open(io.BytesIO(raw))
            if image.width * image.height > 25_000_000:
                raise HTTPException(413, 'Image too large')
            text = pytesseract.image_to_string(image, timeout=30)
            method = 'Tesseract OCR'
            warnings.append('OCR may misread characters. Review all identifiers.')
        else:
            raise HTTPException(400, 'Unsupported format')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, 'Extraction failed; check file integrity and OCR/converter installation') from None
    text = text[:200000]
    # Heuristic candidates, not asserted identities. No universal passport format is assumed.
    passport_numbers = sorted(set(re.findall(r'(?i)passport\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9]{5,15})', text)))
    names = [match.strip() for match in re.findall(r'(?im)^(?:full name|applicant name|name)\s*[:\-]\s*([^\n]{2,120})', text)]
    return {'filename': filename, 'text': text, 'names': names, 'passportNumbers': passport_numbers, 'warnings': warnings, 'extractionMethod': method}
