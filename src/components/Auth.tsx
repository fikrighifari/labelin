import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Modal, Logo } from "./UI";
import { t } from "../lib/language";
import { type User, load, save, normalizeEmail } from "../lib/data";
import { cloudRequest, CloudError, hydrate, type CloudSession } from '../lib/cloud';
type Account = { name: string; email: string; salt: string; hash: string };
type TokenResponse = { access_token?: string; error?: string };
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (r: TokenResponse) => void;
            error_callback: () => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}
async function digest(p: string, salt: string) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(p),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 150000,
      hash: "SHA-256",
    },
    base,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export default function Auth({
  initial,
  onClose,
  onUser,
}: {
  initial: "login" | "register";
  onClose: () => void;
  onUser: (u: User) => void;
}) {
  const [mode, setMode] = useState(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState(false);
  const [cid, setCid] = useState(load("google-client-id", () => ""));
  const finishAuth = async (result: CloudSession, legacy?: User) => {
    if (!result.user?.cloudId) throw new CloudError('API_NOT_DEPLOYED', 503);
    // Verify that the browser retained the HttpOnly session, including in a preview iframe.
    const confirmed = await cloudRequest<CloudSession>('account');
    if (confirmed.user?.cloudId !== result.user.cloudId) throw new CloudError('SESSION_COOKIE_BLOCKED', 401);
    hydrate(confirmed, legacy);
    onUser(confirmed.user);
  };
  const login = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setError("");
    setBusy(true);
    try {
      // Password managers can fill the native fields without firing React's change event.
      const fields = new FormData(ev.currentTarget);
      const normalized = normalizeEmail(String(fields.get("email") ?? ""));
      const submittedPassword = String(fields.get("password") ?? "");
      const submittedName = String(fields.get("name") ?? "").trim();
      const old = mode === 'login' ? load<Account[]>('accounts', () => []).find(a => normalizeEmail(a.email) === normalized) : undefined;
      const verified = old && await digest(submittedPassword,old.salt) === old.hash;
      const credentials = { email:normalized, password:submittedPassword, name:submittedName };
      let result: CloudSession;
      try { result = await cloudRequest<CloudSession>('account','POST',{action:mode,...credentials}); }
      catch(error) {
        if (!verified || !(error instanceof CloudError) || error.message !== 'INVALID_CREDENTIALS') throw error;
        // Upgrade on the original device only, after verifying its existing password.
        result = await cloudRequest<CloudSession>('account','POST',{...credentials,action:'register',name:old.name});
      }
      await finishAuth(result, verified ? {name:old.name,email:old.email,provider:'local'} : undefined);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Tidak dapat masuk. Coba kembali.",
      );
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    setError("");
    const id = import.meta.env.VITE_GOOGLE_CLIENT_ID || cid.trim();
    if (!id) {
      setSetup(true);
      return;
    }
    setBusy(true);
    try {
      if (!window.google) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(
              Error("Google tidak dapat dijangkau. Periksa koneksi internet."),
            );
          document.head.appendChild(script);
        });
      }
      window
        .google!.accounts.oauth2.initTokenClient({
          client_id: id,
          scope: "openid email profile",
          error_callback: () => {
            setBusy(false);
            setError("Login Google dibatalkan atau pop-up diblokir.");
          },
          callback: async (response) => {
            try {
              if (response.error || !response.access_token)
                throw Error("Izin masuk Google tidak diberikan.");
              const result = await cloudRequest<CloudSession>('account','POST',{action:'google',accessToken:response.access_token});
              if (!result.user?.cloudId) throw Error('GOOGLE_INVALID');
              await finishAuth(result,{name:result.user.name,email:result.user.email,provider:'google'});
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Gagal masuk dengan Google.",
              );
            } finally {
              setBusy(false);
            }
          },
        })
        .requestAccessToken();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Gagal memuat Google.");
    }
  };
  return (
    <Modal
      title={
        setup
          ? "Hubungkan Google"
          : mode === "login"
            ? "Masuk ke Labelin"
            : "Buat akun pribadi"
      }
      onClose={onClose}
    >
      <div className="auth-body">
        {setup ? (
          <>
            <div className="auth-symbol">
              <KeyRound size={25} />
            </div>
            <h3>{t("Konfigurasi Google Sign-In")}</h3>
            <p className="form-help">
              {t("Google Sign-In memerlukan OAuth Client ID milik aplikasi ini. Tambahkan origin")} <strong>{window.location.origin}</strong> {t("ke Authorized JavaScript origins di Google Cloud Console.")}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save("google-client-id", cid.trim());
                setSetup(false);
                setError("");
              }}
            >
              <label className="field">
                <span>Google OAuth Client ID</span>
                <input
                  required
                  pattern=".+\.apps\.googleusercontent\.com"
                  placeholder="…apps.googleusercontent.com"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                />
              </label>
              <button className="btn dark full">{t("Simpan konfigurasi")}</button>
            </form>
            <button className="text-link" onClick={() => setSetup(false)}>
              <ArrowLeft size={14} />
              {t("Kembali ke email")}
            </button>
          </>
        ) : (
          <>
            <div className="auth-brand">
              <Logo />
            </div>
            <p className="auth-intro">
              {t(mode === "login"
                ? "Workspace pribadimu, siap untuk kiriman berikutnya."
                : "Satu ruang pribadi untuk alamat dan label pengirimanmu.")}
            </p>
            <button className="btn google-btn" disabled={busy} onClick={google}>
              <svg
                width="17"
                height="17"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.3 9.3 0 0 1-4.1 6v5h6.6c3.9-3.6 6.1-8.7 6.1-14.7Z"
                />
                <path
                  fill="#34A853"
                  d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z"
                />
                <path
                  fill="#FBBC05"
                  d="M12.6 27.6a12.1 12.1 0 0 1 0-7.2v-5.2H5.8a20 20 0 0 0 0 17.6Z"
                />
                <path
                  fill="#EA4335"
                  d="M24 12c3 0 5.6 1 7.7 3l5.8-5.8A19.6 19.6 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15.2l6.8 5.2C14.2 15.6 18.7 12 24 12Z"
                />
              </svg>
              {t("Lanjutkan dengan Google")}
            </button>
            <div className="or-line">
              <span />
              {t("atau gunakan email")}
              <span />
            </div>
            <form onSubmit={login}>
              <div className="fields">
                {mode === "register" && (
                  <label className="field">
                    <span>{t("Nama lengkap")}</span>
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={70}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("Nama lengkapmu")}
                    />
                  </label>
                )}
                <label className="field">
                  <span>{t("Alamat email")}</span>
                  <div className="input-icon">
                    <Mail size={15} />
                    <input
                      type="email"
                      name="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                    />
                  </div>
                </label>
                <label className="field">
                  <span>{t("Kata sandi")}</span>
                  <div className="input-icon">
                    <LockKeyhole size={15} />
                    <input
                      name="password"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      type={visible ? "text" : "password"}
                      minLength={mode === "register" ? 5 : 1}
                      required
                      value={password}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder={t(
                        mode === "register"
                          ? "Minimal 8 karakter"
                          : "Masukkan kata sandi"
                      )}
                    />
                    <button
                      type="button"
                      title={t("Tampilkan / sembunyikan kata sandi")}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>
              </div>
              {error && (
                <p className="error-text" role="alert">
                  {t(error)}
                  {['WRONG_ORIGIN','SESSION_COOKIE_BLOCKED'].includes(error) && <>{' '}<a className="text-link" href={window.location.href} target="_blank" rel="noopener noreferrer">{t('Buka Labelin di tab baru')}</a></>}
                </p>
              )}
              <button className="btn dark full" disabled={busy}>
                {t(busy
                  ? "Memproses…"
                  : mode === "login"
                    ? "Masuk ke workspace"
                    : "Daftar akun")}
                <ArrowRight size={15} />
              </button>
            </form>
            <p className="auth-switch">
              {t(mode === "login" ? "Belum punya akun?" : "Sudah punya akun?")}{" "}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                  setPass("");
                }}
              >
                {t(mode === "login" ? "Daftar sekarang" : "Masuk")}
              </button>
            </p>
            <div className="local-note">
              <HardDrive size={15} />
              {t("Masuk dengan akun yang sama untuk menyinkronkan data antarperangkat.")}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
