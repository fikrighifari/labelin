// Server only. No database credentials, password verifiers, or session tokens enter the Vite bundle.
import postgres from 'postgres';
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';

const derive = promisify(scrypt);
let db, ready;
const credentialFile = () => {
  try { return JSON.parse(readFileSync(new URL('./.database.runtime.json', import.meta.url), 'utf8')); }
  catch { try { return JSON.parse(readFileSync('server/.database.runtime.json', 'utf8')); } catch { return {}; } }
};
const fail = (status, code) => { throw Object.assign(new Error(code), { status, code }); };
async function database() {
  if (!db) {
    const url = (process.env.DATABASE_URL || credentialFile().url || '').trim();
    if (!url) fail(503, 'DATABASE_NOT_CONFIGURED');
    try { const parsed = new URL(url); if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) throw new Error(); }
    catch { fail(503, 'DATABASE_CONFIGURATION'); }
    db = postgres(url, { max: 2, idle_timeout: 15, connect_timeout: 8, prepare: false });
  }
  if (!ready) ready = db.begin(async sql => {
    await sql`select pg_advisory_xact_lock(483915750)`;
    await sql`create table if not exists labelin_accounts (id uuid primary key, provider text not null, identity text not null, email text not null, name text not null, salt text, verifier text, unique(provider, identity))`;
    await sql`create table if not exists labelin_sessions (token_hash text primary key, account_id uuid not null references labelin_accounts(id) on delete cascade, expires_at timestamptz not null)`;
    await sql`create index if not exists labelin_sessions_expiry on labelin_sessions(expires_at)`;
    await sql`create table if not exists labelin_workspaces (account_id uuid primary key references labelin_accounts(id) on delete cascade, revision integer not null default 0, document jsonb)`;
    await sql`create table if not exists labelin_login_limits (bucket text primary key, hits integer not null, expires_at timestamptz not null)`;
  }).catch(error => { ready = undefined; throw error; });
  await ready; return db;
}
const hash = value => createHash('sha256').update(value).digest('hex');
const cookieToken = (req, name = 'labelin_sid') => (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(name+'='))?.slice(name.length+1) || '';
const secureRequest = req => !!(process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted);
const csrfName = req => secureRequest(req) ? '__Host-labelin_csrf' : 'labelin_csrf_dev';
const cookie = (req, token, age, name = 'labelin_sid') => {
  const secure = secureRequest(req);
  const embedded = secure && req.headers['x-labelin-embedded'] === '1';
  return `${name}=${token}; Path=/; HttpOnly; Max-Age=${age}; SameSite=${embedded ? 'None; Partitioned' : 'Lax'}${secure ? '; Secure' : ''}`;
};
function checkWriteOrigin(req) {
  const origin = req.headers.origin;
  let direct = !origin;
  try { if (origin) direct = new URL(origin).origin === `${secureRequest(req) ? 'https' : 'http'}://${req.headers.host}`; } catch { direct = false; }
  // Fetch Metadata describes the browser-facing origin even when a proxy rewrites Host.
  // Browsers control this header. Never trust arbitrary forwarded hosts or wildcard domains.
  const site = req.headers['sec-fetch-site'];
  if ((site === 'same-origin' && req.headers['x-labelin-request'] === '1') || (direct && site !== 'cross-site')) return;
  const allowed = (process.env.LABELIN_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origin && origin !== 'null' && allowed.some(value => {
    try { const u = new URL(value); return u.protocol === 'https:' && u.origin === origin && (value === u.origin || value === u.origin + '/'); } catch { return false; }
  })) return;
  // A preview proxy may replace Host. Prove the caller read our same-origin JSON
  // bootstrap instead of trusting forwarded hosts or allowing arbitrary origins.
  const supplied = req.headers['x-labelin-csrf'], issued = cookieToken(req,csrfName(req));
  if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied) || !/^[a-f0-9]{64}$/.test(issued) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(issued))) fail(403,'WRONG_ORIGIN');
}
const profile = a => ({ cloudId: a.id, email: a.email, name: a.name, provider: a.provider });
const send = (res, status, value) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); };
async function body(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) fail(415, 'INVALID_REQUEST');
  let value = req.body;
  if (value === undefined) { const chunks = []; let n = 0; for await (const chunk of req) { n += chunk.length; if (n > 2400000) fail(413, 'WORKSPACE_TOO_LARGE'); chunks.push(chunk); } value = Buffer.concat(chunks).toString(); }
  if (Buffer.isBuffer(value)) value = value.toString();
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { fail(400, 'INVALID_REQUEST'); } }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'INVALID_REQUEST');
  if (Buffer.byteLength(JSON.stringify(value)) > 2400000) fail(413, 'WORKSPACE_TOO_LARGE');
  return value;
}
async function currentAccount(sql, req) {
  const token = cookieToken(req); if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return (await sql`select a.id, a.email, a.name, a.provider from labelin_accounts a join labelin_sessions s on s.account_id = a.id where s.token_hash = ${hash(token)} and s.expires_at > now()`)[0] || null;
}
async function snapshot(sql, id) {
  return (await sql`select revision, document from labelin_workspaces where account_id = ${id}`)[0] || { revision: 0, document: null };
}
async function limit(sql, value, max) {
  const result = await sql`insert into labelin_login_limits (bucket,hits,expires_at) values (${hash(value)},1,now()+interval '10 minutes') on conflict(bucket) do update set hits = case when labelin_login_limits.expires_at < now() then 1 else labelin_login_limits.hits + 1 end, expires_at = case when labelin_login_limits.expires_at < now() then excluded.expires_at else labelin_login_limits.expires_at end returning hits`;
  if (result[0].hits > max) fail(429, 'TRY_LATER');
}
async function account(sql, req, res) {
  if (req.method === 'GET') {
    const a = await currentAccount(sql, req);
    const previous = cookieToken(req,csrfName(req));
    const csrf = /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie',cookie(req,csrf,86400,csrfName(req)));
    return send(res, 200, { csrf, user: a ? profile(a) : null, ...(a ? { snapshot: await snapshot(sql, a.id) } : {}) });
  }
  if (req.method !== 'POST') fail(405, 'INVALID_REQUEST');
  const b = await body(req);
  if (b.action === 'logout') {
    await sql`delete from labelin_sessions where token_hash = ${hash(cookieToken(req))}`;
    res.setHeader('Set-Cookie', cookie(req, '', 0)); return send(res, 200, { ok: true });
  }
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown').split(',')[0];
  await limit(sql, 'ip:'+ip, 100);
  let a;
  if (b.action === 'google') {
    const client = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    if (!client) fail(503, 'GOOGLE_NOT_CONFIGURED');
    if (typeof b.accessToken !== 'string' || b.accessToken.length > 4096) fail(401, 'GOOGLE_INVALID');
    const info = await fetch('https://oauth2.googleapis.com/tokeninfo?access_token='+encodeURIComponent(b.accessToken), { signal: AbortSignal.timeout(8000) });
    const claims = await info.json();
    if (!info.ok || (claims.aud || claims.audience) !== client || Number(claims.expires_in) <= 0) fail(401, 'GOOGLE_INVALID');
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {headers: {Authorization: 'Bearer '+b.accessToken}, signal: AbortSignal.timeout(8000)});
    const u = await r.json(); if (!r.ok || !u.sub || !u.email || u.email_verified !== true) fail(401, 'GOOGLE_INVALID');
    [a] = await sql`insert into labelin_accounts(id,provider,identity,email,name) values(${randomUUID()},'google',${u.sub},${u.email.toLowerCase()},${u.name || u.email}) on conflict(provider,identity) do update set name=excluded.name,email=excluded.email returning id,email,name,provider`;
  } else {
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof b.password !== 'string' || b.password.length > 512 || !b.password.length) fail(400, 'INVALID_REQUEST');
    await limit(sql, 'email:'+email, 25);
    if (b.action === 'register') {
      if (b.password.length < 5 || typeof b.name !== 'string' || !b.name.trim() || b.name.length > 100) fail(400, 'INVALID_REQUEST');
      const salt = randomBytes(24).toString('hex'); const verifier = (await derive(b.password, salt, 64)).toString('hex');
      [a] = await sql`insert into labelin_accounts(id,provider,identity,email,name,salt,verifier) values(${randomUUID()},'local',${email},${email},${b.name.trim()},${salt},${verifier}) on conflict(provider,identity) do nothing returning id,email,name,provider`;
      if (!a) fail(409, 'ACCOUNT_EXISTS');
    } else if (b.action === 'login') {
      [a] = await sql`select * from labelin_accounts where provider='local' and identity=${email}`;
      const check = await derive(b.password, a?.salt || 'labelin-unknown-account', 64);
      if (!a || !timingSafeEqual(check, Buffer.from(a.verifier, 'hex'))) fail(401, 'INVALID_CREDENTIALS');
    } else fail(400, 'INVALID_REQUEST');
  }
  const token = randomBytes(32).toString('hex');
  await sql.begin(async tx => {
    await tx`delete from labelin_sessions where expires_at < now() or token_hash = ${hash(cookieToken(req))}`;
    await tx`delete from labelin_login_limits where expires_at < now()`;
    await tx`insert into labelin_sessions(token_hash,account_id,expires_at) values(${hash(token)},${a.id},now()+interval '30 days')`;
    await tx`insert into labelin_workspaces(account_id) values(${a.id}) on conflict do nothing`;
  });
  res.setHeader('Set-Cookie', cookie(req, token, 2592000));
  return send(res, 200, { user: profile(a), snapshot: await snapshot(sql, a.id) });
}
const validAddress = a => a && (a.officeHousingName === undefined || (typeof a.officeHousingName === 'string' && a.officeHousingName.length <= 100)) && ['id','name','phone','street','building','rt','rw','village','district','city','province','postal','tag','color'].every(k => typeof a[k] === 'string' && a[k].length <= 1200);
const validFormat = a => a && ['thermal','a4','custom'].includes(a.format) && (!a.customPaper || [a.customPaper.width,a.customPaper.height].every(v => Number.isFinite(v) && v >= 20 && v <= 1000));
const validEntry = e => validFormat(e) && typeof e.id === 'string' && /^LBL-[\w-]{1,64}$/.test(e.id) && (!e.reference || /^LBL-[\w-]{1,64}$/.test(e.reference)) && Number.isFinite(Date.parse(e.date)) && validAddress(e.sender) && validAddress(e.recipient) && Number.isInteger(e.copies) && e.copies >= 0 && e.copies <= 20 && typeof e.note === 'string';
function validDoc(d) {
  const s = d?.workspace;
  if (s?.drafts !== undefined && (!Array.isArray(s.drafts) || s.drafts.length > 5000 || !s.drafts.every(validEntry))) return false;
  if (s?.paperPresets !== undefined && (!Array.isArray(s.paperPresets) || !s.paperPresets.every(p => p && typeof p.id === 'string' && /^user-[a-f0-9-]{36}$/.test(p.id) && typeof p.name === 'string' && p.name.trim() && p.name.length <= 60 && ['mm','in'].includes(p.unit) && [p.width,p.height].every(v => Number.isFinite(v) && v >= 20 && v <= 1000)))) return false;
  return validFormat(s) && typeof s.defaultSender === 'string' && [s.addresses,s.senders,s.history].every(a => Array.isArray(a) && a.length <= 5000) && s.addresses.every(validAddress) && s.senders.every(validAddress) && s.history.every(validEntry) && (d.draft === null || validEntry(d.draft));
}
async function workspace(sql, req, res) {
  const a = await currentAccount(sql, req); if (!a) fail(401, 'SESSION_EXPIRED');
  if (req.headers['x-labelin-account'] !== a.id) fail(409, 'ACCOUNT_CHANGED');
  if (req.method === 'GET') return send(res, 200, await snapshot(sql, a.id));
  if (req.method !== 'PUT') fail(405, 'INVALID_REQUEST');
  const b = await body(req);
  if (!Number.isSafeInteger(b.revision) || b.revision < 0 || !validDoc(b.document)) fail(400, 'INVALID_WORKSPACE');
  const rows = await sql`update labelin_workspaces set revision=revision+1,document=${sql.json(b.document)} where account_id=${a.id} and revision=${b.revision} returning revision,document`;
  if (!rows.length) fail(409, 'VERSION_CONFLICT');
  return send(res, 200, rows[0]);
}
export function endpoint(kind) {
  return async (req, res) => {
    res.setHeader('Cache-Control','private, no-store'); res.setHeader('Vary','Cookie'); res.setHeader('X-Content-Type-Options','nosniff');
    try {
      if (!['GET','HEAD'].includes(req.method)) checkWriteOrigin(req);
      const sql = await database();
      await (kind === 'account' ? account : workspace)(sql,req,res);
    } catch(e) {
      const status = typeof e.status === 'number' ? e.status : 503;
      // Some managed Postgres gateways omit SQLSTATE when credentials have expired.
      const dbAuth = ['28P01','28000','3D000','42501'].includes(e.code) || /failed to identify your database|credentials are incorrect|password authentication failed/i.test(e.message || '');
      const code = typeof e.status === 'number' ? e.code : dbAuth ? 'DATABASE_CONFIGURATION' : 'AUTH_BACKEND_UNAVAILABLE';
      // Never log request bodies, database URLs, session tokens, or address records.
      if (status === 503) console.error('Labelin cloud request unavailable:', e.code || e.name);
      send(res,status,{error: code});
    }
  };
}
