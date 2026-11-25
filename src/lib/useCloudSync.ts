import { useEffect, useState } from 'react';
import { CloudError, syncWorkspace } from './cloud';
import { readSession, workspaceId, type User } from './data';

export function useCloudSync(user: User | null) {
  const [state,setState]=useState('Menyinkronkan…');
  useEffect(()=>{
    if(!user?.cloudId)return;
    let active=true;let timer:ReturnType<typeof setTimeout>;
    const run=()=>{if(readSession()?.cloudId!==user.cloudId)return;syncWorkspace(user).then(()=>{if(active)setState('Tersinkron online');}).catch(error=>{
      if(!active)return;
      setState(error instanceof CloudError && ['SESSION_EXPIRED','ACCOUNT_CHANGED'].includes(error.message)?'Masuk kembali untuk sinkronisasi':error instanceof CloudError && error.status===413?'Ruang sinkron penuh':'Tersimpan lokal · menunggu sinkronisasi');
    });};
    const schedule=()=>{clearTimeout(timer);setState('Menyinkronkan…');timer=setTimeout(run,300);};
    const changed=(event:Event)=>{const key=(event as CustomEvent<string>).detail; const id=workspaceId(user);if(key==='workspace:'+id||key==='draft:'+id)schedule();};
    const resume=()=>{if(!document.hidden)run();};
    const poll=setInterval(resume,8000);run();
    window.addEventListener('labelin:local-write',changed);window.addEventListener('online',run);window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
    return()=>{active=false;clearInterval(poll);clearTimeout(timer);window.removeEventListener('labelin:local-write',changed);window.removeEventListener('online',run);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
  },[user]);
  return user?.cloudId?state:user?'Masuk kembali untuk sinkronisasi':'Tersimpan lokal';
}
