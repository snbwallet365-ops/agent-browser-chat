# VeloVisa AI

A white, English/Bangla, mobile-first visa research and preparation workspace. Replaces simulated runs with Browser Use Cloud API v4. **Not a universal visa-submission bot or a legal-eligibility guarantee.**

## Included
- Eight country profiles: AU, RS, TR, SG, RU, MY, SA, BH. Requirements are pathway-specific operator review items. Only limited AU/SG statements have been checked against linked official sources; all profiles require current professional review.
- Chat command → real paid Cloud research/preparation run; no fake progress. Live preview, incremental event cursor polling, validated JSON, OTP secret bindings and same-session continuation.
- Cases, extracted documents and one agency API key encrypted at rest with AES-256-GCM. Keys never enter localStorage. HTTP-only signed operator sessions.
- Persisted case/run/browser IDs, stop/cancel cleanup, hash-chained audit metadata, explicit consent for recording.
- Private Python/LangGraph policy planner; PDF/DOC/DOCX/image extraction; read-only Python Playwright CDP worker with cleanup in finally.
- Cover-letter text draft export. Drafts are not certified translations, notarized documents or official forms.

## Run (single agency / one persistent Node process)
Requires Node >=22.18 and Python >=3.11. Do not use this encrypted-file backend on ephemeral/serverless storage. Use durable database/vault infrastructure before multi-instance deployment.

```bash
npm install
cp .env.example .env.local
openssl rand -hex 32 # DASHBOARD_ACCESS_TOKEN
openssl rand -hex 32 # VAULT_MASTER_KEY (different secret)
npm run dev
```
Populate the server-only environment variables. BROWSER_USE_API_KEY is optional if you save a key through Settings after signing in. Create a key at https://cloud.browser-use.com/settings?tab=api-keys&new=1 . Enter DASHBOARD_ACCESS_TOKEN on the login screen, then test the Cloud connection. Configuration is not represented as live connectivity until tested. Credits are linked to the provider dashboard; displayed costs are provider-reported run costs, not invented balances.

Set VISA_PORTAL_HOSTS to the exact portal/auth hosts your authorized pathway uses. Default portal URLs are entry points, not guaranteed application endpoints. An embassy may require additional consents, identity verification and application-specific URLs. OTP bindings only permit the selected portal host; configure and verify SSO handling separately.

## Python worker
```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade -r backend/requirements.txt
# On Debian/Ubuntu, install system dependencies as appropriate:
# sudo apt-get install tesseract-ocr libreoffice
export PYTHON_SERVICE_TOKEN=<a separate random service token>
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Set PYTHON_BACKEND_URL and the same PYTHON_SERVICE_TOKEN in .env.local. Next.js forwards uploads to the private service; don't expose it publicly. Scanned PDFs are flagged for manual/OCR review; this implementation does not rasterize PDFs. OCR fields and heuristic passport/name candidates must be manually checked. Expiry dates are not automatically adjudicated.

Authorized read-only Playwright inspection (creates a paid standalone browser):
```bash
export BROWSER_USE_API_KEY=<your key>
export VISA_PORTAL_HOSTS=www.mom.gov.sg
python backend/playwright_worker.py --url https://www.mom.gov.sg/ --country sg --authorize-paid-browser
```
The worker does not submit, upload or pay. It blocks non-read HTTP requests and cross-host navigations; modern portals may not render under this restrictive mode. It stops its managed browser in finally; closing CDP alone does not stop billing.

## One-command preparation, not unreviewed submission
Create an applicant case, select country/pathway, then issue a command such as 'Research current official fees and prepare my evidence checklist'. Confirm the paid run. Inspect the live browser, missing documents and verified JSON. Complete authorized authentication in the live view or via a scoped OTP binding. Final dispatch is rejected server-side until a tested deterministic, portal-specific submission adapter, immutable form version and explicit scoped approval are implemented. A generic prompt is not a hard browser security boundary; Cloud research agents remain subject to operator oversight and portal terms.

## Security and operational limits
- Single agency/shared operator secret; no multi-tenant RBAC or SSO yet. Add reverse-proxy rate limits and HTTPS. Rotate credentials, restrict provider permissions and back up the encrypted vault with a separately secured master key.
- File transactions are serialized only within one Node process. Run one instance with persistent disk, not multiple workers. The audit chain is tamper-evident metadata, not immutable external/WORM storage.
- Creation POSTs are never automatically retried. Read-only transient calls use at most three attempts. A timeout or storage failure after creation can leave a billable run active: reconcile via the Cloud dashboard before retrying.
- Stop cancels a run and stops discovered managed browser IDs. Browser lifetimes/cost limits are provider controls, not a cleanup SLA. Add a durable recovery/cleanup worker before production. Use Stop before leaving. Server crashes can bypass UI cleanup.
- Applicant data is sent to the configured Cloud provider when included in task context; this worker deliberately omits names/passports and uploaded document text from research prompts. Obtain lawful consent and configure retention/access policies.
- Recording is opt-in. Live preview URLs grant access to active sessions; keep them private. No fake WebRTC or approval probability is presented.
- Current manifest supports standalone launch; offline service-worker caching is deliberately absent to avoid caching confidential API responses. iOS installability/icons require device verification.

## Checks
```bash
npm run typecheck
npm run build
python -m compileall backend
```
No live portal or paid browser tests should run without explicit operator authorization. This branch is a foundation requiring deployment security review, country-rule verification and tested portal adapters before handling real legal submissions.

## Documentation
- https://docs.browser-use.com/llms.txt
- https://docs.browser-use.com/cloud/agent/human-in-the-loop
- https://docs.browser-use.com/cloud/api-v4/runs/create-run.md
- https://docs.browser-use.com/cloud/browser/quickstart
