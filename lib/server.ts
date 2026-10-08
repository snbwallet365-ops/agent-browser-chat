import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { BrowserUse, BrowserUseError } from 'browser-use-sdk/v4';
import type { NextRequest } from 'next/server';
import type { VisaCase } from '@/types/visa';

export class AppError extends Error { constructor(public status: number, message: string, public retryAfter?: number) { super(message); } }
export function env(name: string): string { const value = process.env[name]; if (!value) throw new AppError(503, `${name} is not configured`); return value; }
function digest(value: string) { return createHash('sha256').update(value).digest(); }
export function authenticate(req: NextRequest) {
  const secret = env('DASHBOARD_ACCESS_TOKEN');
  if (secret.length < 32) throw new AppError(503, 'Use a dashboard token of at least 32 characters');
  const bearer = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const cookie = req.cookies.get('velovisa_session')?.value ?? '';
  let cookieValid = false;
  const [expiry, sig] = cookie.split('.');
  if (expiry && sig && Number(expiry) > Date.now()) {
    const expected = createHmac('sha256', secret).update(expiry).digest('hex');
    cookieValid = timingSafeEqual(digest(sig), digest(expected));
  }
  if (!cookieValid && !timingSafeEqual(digest(bearer), digest(secret))) throw new AppError(401, 'Authentication required');
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) throw new AppError(403, 'Cross-origin request rejected');
  if (req.method !== 'GET' && !origin && !bearer) throw new AppError(403, 'Origin or API authorization required');
}
export function sessionCookie() {
  const expiry = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expiry}.${createHmac('sha256', env('DASHBOARD_ACCESS_TOKEN')).update(expiry).digest('hex')}`;
}
export interface Store { key?: string; cases: VisaCase[]; audit: { at: string; action: string; itemId: string; previous: string; hash: string }[]; }
function dataPath() {
  if (process.env.VERCEL) throw new AppError(503, 'This encrypted-file backend requires persistent disk; do not use ephemeral Vercel storage');
  return path.resolve(process.env.VELOVISA_DATA_DIR ?? '.velovisa');
}
function masterKey() {
  const value = env('VAULT_MASTER_KEY');
  if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new AppError(503, 'VAULT_MASTER_KEY must be 64 hex characters');
  return Buffer.from(value, 'hex');
}
async function readStore(): Promise<Store> {
  const key = masterKey();
  try {
    const raw = JSON.parse(await fs.readFile(path.join(dataPath(), 'vault.json'), 'utf8'));
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(raw.tag, 'hex'));
    const plain = Buffer.concat([decipher.update(Buffer.from(raw.data, 'base64')), decipher.final()]);
    return JSON.parse(plain.toString('utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { cases: [], audit: [] };
    throw new AppError(503, 'Encrypted storage cannot be read; check the master key and disk');
  }
}
async function writeStore(store: Store) {
  const dir = dataPath(); await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(store), 'utf8'), cipher.final()]);
  const tmp = path.join(dir, `vault-${randomBytes(8).toString('hex')}.tmp`);
  await fs.writeFile(tmp, JSON.stringify({ version: 1, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: encrypted.toString('base64') }), { mode: 0o600 });
  await fs.rename(tmp, path.join(dir, 'vault.json'));
}
const processState = globalThis as typeof globalThis & { velovisaLock?: Promise<void> };
export async function transaction<T>(fn: (store: Store) => Promise<T>): Promise<T> {
  const previous = processState.velovisaLock ?? Promise.resolve();
  let release!: () => void;
  processState.velovisaLock = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try { const store = await readStore(); const result = await fn(store); await writeStore(store); return result; }
  finally { release(); }
}
export function audit(store: Store, action: string, itemId = '') {
  const previous = store.audit.at(-1)?.hash ?? '0'.repeat(64);
  const row = { at: new Date().toISOString(), action, itemId, previous };
  store.audit.push({ ...row, hash: createHash('sha256').update(JSON.stringify(row)).digest('hex') });
}
export function client(store: Store) {
  const apiKey = store.key ?? process.env.BROWSER_USE_API_KEY;
  if (!apiKey?.startsWith('bu_')) throw new AppError(503, 'Configure a Browser Use Cloud key');
  // Disable SDK retries for mutating operations; creation timeouts must be reconciled.
  return new BrowserUse({ apiKey, maxRetries: 0, timeout: 25000 });
}
export async function safeRead<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(); } catch (error) {
      if (attempt >= 2 || !(error instanceof BrowserUseError) || ![429, 502, 503, 504].includes(error.statusCode)) throw error;
      const detail = error.detail as { retry_after_seconds?: number } | undefined;
      const delay = Math.max(2 ** attempt * 1000, Number(detail?.retry_after_seconds ?? 0) * 1000);
      if (delay > 8000) throw new AppError(429, 'Provider requested a longer backoff', Math.ceil(delay / 1000));
      await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 250));
    }
  }
}
export function portalHost(value: string) {
  const url = new URL(value);
  const hosts = env('VISA_PORTAL_HOSTS').split(',').map(v => v.trim().toLowerCase());
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.includes(url.hostname.toLowerCase())) throw new AppError(403, 'Portal must be HTTPS and listed in VISA_PORTAL_HOSTS');
  return url.hostname;
}
export async function python(pathname: string, body: BodyInit, contentType?: string): Promise<Response> {
  const base = env('PYTHON_BACKEND_URL').replace(/\/$/, '');
  return fetch(`${base}${pathname}`, { method: 'POST', headers: { Authorization: `Bearer ${env('PYTHON_SERVICE_TOKEN')}`, ...(contentType ? { 'Content-Type': contentType } : {}) }, body, cache: 'no-store', signal: AbortSignal.timeout(60000) });
}
