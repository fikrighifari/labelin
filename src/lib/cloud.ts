import { getStore, load, readSession, save, workspaceId, type Entry, type Store, type User } from './data';

export type CloudDocument = { workspace: Store; draft: Entry | null };
type Snapshot = { revision: number; document: CloudDocument | null };
export type CloudSession = { user: User | null; snapshot?: Snapshot };
const empty = (): CloudDocument => ({ workspace: { addresses: [], senders: [], defaultSender: '', format: 'thermal', history: [], cleanStart: true }, draft: null });
const same = (a: unknown, b: unknown) => JSON.stringify(a, canonical) === JSON.stringify(b, canonical);
// JSONB key ordering is different from browser object insertion order.
function canonical(_key: string, value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)));
  return value;
}
export class CloudError extends Error { status: number; constructor(code: string, status: number) { super(code); this.status = status; } }
let csrf = '';
let refreshing: Promise<CloudSession> | undefined;
export function bootstrapAccount(): Promise<CloudSession> {
  return refreshing ??= cloudRequest<CloudSession>('account').finally(() => { refreshing = undefined; });
}
export async function cloudRequest<T>(path: string, method='GET', value?: unknown, owner?: string): Promise<T> {
  const request = async () => {
    const headers: Record<string,string> = {};
    if (value !== undefined) { headers['Content-Type'] = 'application/json'; headers['X-Labelin-Request'] = '1'; }
    if (owner) headers['X-Labelin-Account'] = owner;
    if (window.self !== window.top) headers['X-Labelin-Embedded'] = '1';
    if (method !== 'GET' && csrf) headers['X-Labelin-CSRF'] = csrf;
    let response: Response;
    try { response = await fetch('/api/'+path, {method, mode:'same-origin', credentials:'same-origin', cache:'no-store', signal:AbortSignal.timeout(15000), headers, ...(value !== undefined ? {body:JSON.stringify(value)} : {})}); }
    catch { throw new CloudError('CLOUD_UNAVAILABLE',503); }
    const data = await response.json().catch(() => { throw new CloudError(response.status >= 500 ? 'AUTH_BACKEND_UNAVAILABLE' : 'API_NOT_DEPLOYED',response.status || 503); });
    if (!response.ok) throw new CloudError(data.error || 'CLOUD_UNAVAILABLE',response.status);
    if (path === 'account' && method === 'GET' && typeof data.csrf === 'string') csrf = data.csrf;
    return data as T;
  };
  // Acquire the preview cookie and its matching token before the first auth write.
  // A database setup error is reported here, instead of a misleading origin failure.
  if (path === 'account' && method === 'POST' && !csrf) await bootstrapAccount();
  try { return await request(); } catch (e) {
    // Only retry a write rejected BEFORE authentication or any database mutation.
    if (method === 'GET' || !(e instanceof CloudError) || e.status !== 403 || e.message !== 'WRONG_ORIGIN') throw e;
    await bootstrapAccount();
    return request();
  }
}
function mergeRows<T extends {id:string}>(base:T[], local:T[], remote:T[]):T[] {
  const before=new Map(base.map(row=>[row.id,row])); const here=new Map(local.map(row=>[row.id,row]));
  const changed=local.filter(row=>!same(row,before.get(row.id)));
  const changedIds=new Set(changed.map(row=>row.id));
  return [...changed,...remote.filter(row=>!changedIds.has(row.id) && (!before.has(row.id)||here.has(row.id)))];
}
function merge(base:CloudDocument,local:CloudDocument,remote:CloudDocument):CloudDocument {
  const b=base.workspace,l=local.workspace,r=remote.workspace;
  const workspace: Store={...r,cleanStart:true,addresses:mergeRows(b.addresses,l.addresses,r.addresses),senders:mergeRows(b.senders,l.senders,r.senders),history:mergeRows(b.history,l.history,r.history),format:l.format!==b.format?l.format:r.format,customPaper:!same(l.customPaper,b.customPaper)?l.customPaper:r.customPaper,defaultSender:l.defaultSender!==b.defaultSender?l.defaultSender:r.defaultSender};
  if (b.paperPresets || l.paperPresets || r.paperPresets) workspace.paperPresets=mergeRows(b.paperPresets||[],l.paperPresets||[],r.paperPresets||[]);
  if (b.drafts || l.drafts || r.drafts) workspace.drafts=mergeRows(b.drafts||[],l.drafts||[],r.drafts||[]);
  if (!workspace.senders.some(a=>a.id===workspace.defaultSender)) workspace.defaultSender=workspace.senders[0]?.id||'';
  return { workspace,draft:!same(local.draft,base.draft)?local.draft:remote.draft };
}
const localDoc = (user:User):CloudDocument => ({workspace:getStore(user),draft:load('draft:'+workspaceId(user),()=>null)});
const baseKey = (u:User) => 'cloud-base:'+u.cloudId;
function cache(user:User,doc:CloudDocument,base:Snapshot) {
  const id=workspaceId(user); const local=localDoc(user); const changed=!same(local,doc);
  if (!same(local.workspace,doc.workspace)) save('workspace:'+id,doc.workspace);
  if (!same(local.draft,doc.draft)) save('draft:'+id,doc.draft);
  save(baseKey(user),base);
  if (changed) window.dispatchEvent(new CustomEvent('labelin:cloud-applied',{detail:id}));
}
export function hydrate(result:CloudSession,legacy?:User) {
  const user=result.user;if (!user?.cloudId || !result.snapshot) return;
  const remote=result.snapshot.document || empty();
  const base=load<Snapshot>(baseKey(user),()=>({revision:0,document:null}));
  let doc=merge(base.document||empty(),localDoc(user),remote);
  if (legacy && !load('imported:'+user.cloudId,()=>false)) {
    // Only import after proof of the old local password, or a verified Google sign-in.
    doc=merge(empty(),localDoc(legacy),doc);
    cache(user,doc,result.snapshot);save('imported:'+user.cloudId,true);
  } else cache(user,doc,result.snapshot);
}
const inFlight=new Map<string,Promise<void>>();
export function syncWorkspace(user:User):Promise<void> {
  const id=user.cloudId;if(!id)return Promise.resolve();
  const current=inFlight.get(id);if(current)return current;
  const run=async()=>{
    for(let attempt=0;attempt<4;attempt++){
      if(readSession()?.cloudId!==id)return;
      const remote=await cloudRequest<Snapshot>('workspace','GET',undefined,id);
      if(readSession()?.cloudId!==id)return;
      const base=load<Snapshot>(baseKey(user),()=>({revision:0,document:null}));
      const local=localDoc(user);const desired=merge(base.document||empty(),local,remote.document||empty());
      let accepted=remote;
      if(!same(desired,remote.document||empty())){
        try { accepted=await cloudRequest<Snapshot>('workspace','PUT',{revision:remote.revision,document:desired},id); }
        catch(e){ if(e instanceof CloudError && e.message==='VERSION_CONFLICT')continue;throw e; }
      }
      if(readSession()?.cloudId!==id)return;
      // Edits made during the network request must remain pending, not be overwritten.
      const latest=localDoc(user);const pending=!same(local,latest);
      cache(user,pending?merge(local,latest,desired):desired,accepted);
      if(!pending)return;
    }
    throw new CloudError('SYNC_RETRY',409);
  };
  const promise=(async()=>{if(navigator.locks) await navigator.locks.request('labelin:cloud:'+id,run);else await run();})().finally(()=>inFlight.delete(id));
  inFlight.set(id,promise);return promise;
}
