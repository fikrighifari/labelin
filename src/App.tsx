import Workspace from "./pages/Workspace";
import { useEffect, useState } from "react";
import { t, useLanguage } from "./lib/language";
import { readSession, save, workspaceId, type User } from "./lib/data";
import { bootstrapAccount, cloudRequest, hydrate, syncWorkspace } from './lib/cloud';

function App() {
  const language = useLanguage();
  const [session, setSession] = useState(() => ({ user: readSession(), notice: "" }));
  useEffect(() => {
    let active = true;
    const initial = readSession();
    // Restore from the server cookie, not from a browser-only identity assertion.
    bootstrapAccount().then(result => {
      if (!active || readSession()?.cloudId !== initial?.cloudId) return;
      if (result.user) {
        if (initial?.cloudId !== result.user.cloudId) hydrate(result);
        save('session',result.user);
        setSession(previous => previous.user?.cloudId === result.user?.cloudId ? previous : {user:result.user,notice:''});
      } else if (initial?.cloudId) {
        save('session',null);setSession({user:null,notice:t('Masuk kembali untuk sinkronisasi')});
      }
    }).catch(() => { /* Keep the local cache available while disconnected. */ });
    const sync = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === "labelin:session" || event.key === null)) {
        setSession({ user: readSession(), notice: "" });
      }
    };
    window.addEventListener("storage", sync);
    return () => { active = false; window.removeEventListener("storage", sync); };
  }, []);
  const changeSession = async (user: User | null) => {
    if (!user && session.user?.cloudId) {
      // Completing an explicit logout revokes this device's session, not other devices'.
      await syncWorkspace(session.user).catch(() => {});
      await cloudRequest('account','POST',{action:'logout'});
    }
    save("session", user);
    window.location.assign("#dashboard");
    setSession({ user, notice: user ? `${t("Berhasil masuk. Selamat datang,")} ${user.name.split(" ")[0]}.` : t("Kamu telah keluar dari akun pribadi.") });
  };
  return <Workspace key={workspaceId(session.user)} language={language} user={session.user} initialNotice={session.notice} onUser={changeSession} />;
}

export default App;
