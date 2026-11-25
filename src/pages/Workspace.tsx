import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  BookOpen,
  BookUser,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  CircleUserRound,
  FileStack,
  FilePenLine,
  FolderClosed,
  HardDrive,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  PanelLeft,
  PanelLeftClose,
  Pencil,
  Phone,
  Plus,
  Printer,
  SlidersHorizontal,
  Trash2,
  UserRoundPlus,
  X,
} from "lucide-react";
import {
  type Address,
  type Entry,
  type Store,
  type User,
  blank,
  dateLabel,
  formatName,
  labelDocumentName,
  paperSize,
  getStore,
  load,
  placeLine,
  streetLine,
  makeEntry,
  persistSnapshot,
  workspaceId,
} from "../lib/data";
import { Avatar, Logo, Modal, Tag, Toast, LanguageSwitch } from "../components/UI";
import { t, type Language } from "../lib/language";
import { AddressModal } from "../components/AddressForm";
import { Label } from "../components/Label";
import Auth from "../components/Auth";
import Dashboard from "./Dashboard";
import { AddressBook, Drafts, History, Preferences, Senders } from "./Library";
import Editor from "./Editor";
import { useCloudSync } from '../lib/useCloudSync';
import { PaperLibrary } from '../lib/paperLibrary';
const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "addresses", label: "Buku alamat", icon: BookUser },
  { id: "drafts", label: "Draf", icon: FilePenLine },
  { id: "history", label: "Riwayat cetak", icon: FileStack },
  { id: "senders", label: "Profil pengirim", icon: CircleUserRound },
  { id: "preferences", label: "Preferensi printer", icon: SlidersHorizontal },
];
const getPage = () => {
  const p = window.location.hash.slice(1);
  return nav.some((x) => x.id === p) || p === "editor" ? p : "dashboard";
};
type Edit = { a: Address; sender: boolean; isNew: boolean };
type Removal = {
  id: string;
  name: string;
  type: "sender" | "address" | "history";
};
export default function Workspace({language, user, initialNotice, onUser}: {language: Language; user: User | null; initialNotice: string; onUser: (user: User | null) => Promise<void>}) {
  const cloudStatus = useCloudSync(user);
  const [s, setS] = useState<Store>(() => getStore(user));
  const [page, setPage] = useState(getPage);
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState(false);
  const [auth, setAuth] = useState<"login" | "register" | null>(null);
  const [help, setHelp] = useState(false);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [detail, setDetail] = useState<Address | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [view, setView] = useState<Entry | null>(null);
  const [printJob, setPrintJob] = useState<Entry | null>(null);
  const [confirmPrint, setConfirmPrint] = useState(false);
  const media = printJob ? paperSize(printJob.format, printJob.customPaper) : null;
  const [toast, setToast] = useState(initialNotice);
  const [storageOK, setStorageOK] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = "draft:" + workspaceId(user);
  const [draft, setDraft] = useState<Entry>(() =>
    load<Entry | null>(draftKey, () => null) ?? makeEntry(s),
  );
  const saveDraft = useCallback((entry: Entry) => {
    // Keep the prior single-slot draft when an existing user starts another label.
    const previous = load<Entry | null>(draftKey, () => null);
    setS(old => {
      const rows = old.drafts || [];
      const missing = previous && previous.id !== entry.id && !rows.some(d => d.id === previous.id);
      if (!missing && rows.some(d => d === entry)) return old;
      return {...old, drafts: [entry, ...(missing ? [previous] : []), ...rows.filter(d => d.id !== entry.id)]};
    });
  }, [draftKey]);
  const who = { name: user?.name || t("Tamu"), color: "pink" };
  const notify = (t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  useEffect(() => {
    if (initialNotice) toastTimer.current = setTimeout(() => setToast(""), 3500);
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [initialNotice]);
  const receivedStore = useRef<Store | null>(null);
  useEffect(() => {
    const sync = (event: Event) => {
      const owner = workspaceId(user);
      if (event instanceof StorageEvent) {
        if (event.storageArea !== localStorage || event.key !== 'labelin:workspace:'+owner) return;
      } else if ((event as CustomEvent).detail !== owner) return;
      const fresh = getStore(user);
      receivedStore.current = fresh;
      setS(fresh);
    };
    window.addEventListener("storage", sync);
    window.addEventListener('labelin:cloud-applied',sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener('labelin:cloud-applied',sync); };
  }, [user]);
  useEffect(() => {
    if (receivedStore.current === s) return;
    let active = true;
    persistSnapshot("workspace:" + workspaceId(user), s).then((ok) => {
      if (active) setStorageOK(ok);
    });
    return () => {
      active = false;
    };
  }, [s, user]);
  useEffect(() => {
    const fn = () => {
      setPage(getPage());
      setDrawer(false);
      setProfile(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    // Save as PDF uses the document title and appends the .pdf extension.
    if (printJob) {
      document.title = labelDocumentName(printJob);
      return;
    }
    document.title =
      t(page === "editor"
        ? "Editor label"
        : nav.find((n) => n.id === page)?.label || "Dashboard") + " — Labelin";
  }, [page, language, printJob]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfile(false);
        setDrawer(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const go = (p: string) => {
    setPage(p);
    window.location.assign("#" + p);
    setDrawer(false);
    setProfile(false);
    window.scrollTo(0, 0);
  };
  const newLabel = (a?: Address) => {
    setDetail(null);
    setDraft(makeEntry(s, a));
    go("editor");
  };
  const deleteDrafts = (ids: string[]) => {
    const removed = new Set(ids);
    const latest = load<Entry | null>(draftKey, () => null);
    const next = (s.drafts || []).filter(d => !removed.has(d.id)).sort((a,b) => Date.parse(b.date) - Date.parse(a.date))[0];
    if (latest && removed.has(latest.id)) void persistSnapshot(draftKey, next ?? null);
    if (removed.has(draft.id)) setDraft((latest && !removed.has(latest.id) ? latest : next) ?? makeEntry(s));
    setS(old => ({...old, drafts: (old.drafts || []).filter(d => !removed.has(d.id))}));
    notify(t('Draf yang dipilih telah dihapus.'));
  };
  const add = (sender = false) => setEdit({ a: blank(), sender, isNew: true });
  const editA = (a: Address, sender = false) => {
    setDetail(null);
    setEdit({ a, sender, isNew: false });
  };
  const persistAddress = (a: Address, sender = false) => {
    setS((old) => {
      const key = sender ? "senders" : "addresses";
      const exists = old[key].some((x) => x.id === a.id);
      return {
        ...old,
        [key]: exists
          ? old[key].map((x) => (x.id === a.id ? a : x))
          : [a, ...old[key]],
        defaultSender: sender && !old.defaultSender ? a.id : old.defaultSender,
      };
    });
  };
  const remove = () => {
    if (!removal) return;
    const k =
      removal.type === "history"
        ? "history"
        : removal.type === "sender"
          ? "senders"
          : "addresses";
    setS((old) => {
      const next = { ...old, [k]: old[k].filter((x) => x.id !== removal.id) };
      if (k === "senders" && next.defaultSender === removal.id)
        next.defaultSender = next.senders[0]?.id || "";
      return next;
    });
    setRemoval(null);
    notify("Data berhasil dihapus.");
  };
  const startPrint = (entry: Entry) => {
    setView(null);
    setPrintJob(entry);
    setConfirmPrint(false);
  };
  const choosePrinter = () => {
    const after = () => setConfirmPrint(true);
    window.addEventListener("afterprint", after, { once: true });
    window.print();
    setConfirmPrint(true);
    window.removeEventListener("afterprint", after);
  };
  const finishPrint = () => {
    if (!printJob) return;
    const item = {
      ...printJob,
      id: "LBL-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      reference: printJob.reference || printJob.id,
      date: new Date().toISOString(),
    };
    if (!s.history.some((h) => h.id === printJob.id)) item.id = printJob.id;
    setS((old) => ({ ...old, history: [item, ...old.history] }));
    setConfirmPrint(false);
    setPrintJob(null);
    notify("Label tersimpan di riwayat cetak.");
  };
  const latestDraft = page !== 'editor' ? load<Entry | null>(draftKey, () => null) : null;
  const draftCount = (s.drafts?.length ?? 0) + (latestDraft && !s.drafts?.some(d => d.id === latestDraft.id) ? 1 : 0);
  const navButton = (n: (typeof nav)[number]) => (
    <button
      className={"nav-item " + (page === n.id ? "active" : "")}
      onClick={() => go(n.id)}
      key={n.id}
      title={t(n.label)}
      aria-current={page === n.id ? "page" : undefined}
    >
      <n.icon size={18} strokeWidth={1.8} />
      <span>{t(n.label)}</span>
      {n.id === "addresses" && <small>{s.addresses.length}</small>}
      {n.id === "drafts" && <small>{draftCount}</small>}
    </button>
  );
  return (
    <PaperLibrary.Provider value={{sizes: s.paperPresets || [], add: preset => setS(old => ({...old, paperPresets: [...(old.paperPresets || []), preset]}))}}>
      {page === "editor" ? (
        <Editor
          key={draft.id}
          initial={draft}
          s={s}
          onBack={() => go("dashboard")}
          onPrint={startPrint}
          onSaveAddress={(a) => persistAddress(a)}
          onSaveDraft={saveDraft}
          draftKey={draftKey}
          notify={notify}
        />
      ) : (
        <div className={"app-shell " + (collapsed ? "is-collapsed" : "")}>
          {drawer && (
            <div className="drawer-shade" onClick={() => setDrawer(false)} />
          )}
          <aside className={"sidebar " + (drawer ? "drawer-open" : "")}>
            <button
              className="brand-button"
              onClick={() => go("dashboard")}
              aria-label="Labelin dashboard"
            >
              <Logo />
            </button>
            <button
              className="drawer-close icon-btn"
              title={t("Tutup menu")}
              onClick={() => setDrawer(false)}
            >
              <X size={18} />
            </button>
            <div className="sidebar-workspace">
              <div className="workspace-icon">
                <FolderClosed size={17} />
              </div>
              <div>
                <strong>{t("Workspace pribadi")}</strong>
                <small>Personal workspace</small>
              </div>
              <span className="workspace-status" />
            </div>
            <nav className="navigation">
              <div className="nav-heading">WORKSPACE</div>
              {nav.slice(0, 4).map(navButton)}
              <div className="nav-heading settings-heading">{t("PENGATURAN")}</div>
              {nav.slice(4).map(navButton)}
            </nav>
            <div className="sidebar-bottom">
              <div className="help-card">
                <div className="help-title">
                  <BookOpen size={16} />
                  <strong>{t("Panduan Labelin")}</strong>
                </div>
                <p>{t("Mulai kiriman pertamamu.")}</p>
                <button onClick={() => setHelp(true)}>
                  {t("Buka panduan")}
                  <ArrowUpRight size={13} />
                </button>
              </div>
              <button
                className="sidebar-collapsed-help icon-btn"
                onClick={() => setHelp(true)}
                title={t("Panduan Labelin")}
              >
                <CircleHelp size={19} />
              </button>
              <div className="account-wrap">
                {profile && (
                  <>
                    <button
                      className="menu-dismiss"
                      aria-label={t("Tutup menu akun")}
                      onClick={() => setProfile(false)}
                    />
                    <div className="account-menu">
                      <span className="eyebrow">{t("AKUN WORKSPACE")}</span>
                      <strong>{user?.name || t("Workspace tamu")}</strong>
                      <small>
                        {user?.email || t("Belum masuk")}
                      </small>
                      {user ? (
                        <>{(!user.cloudId || cloudStatus === 'Masuk kembali untuk sinkronisasi') && <button onClick={() => {setProfile(false);setAuth('login');}}><LogIn size={16}/>{t('Masuk kembali untuk sinkronisasi')}</button>}
                        <button onClick={() => onUser(null).catch(() => notify(t('Hubungkan internet untuk keluar dengan aman.')))}>
                          <LogOut size={16} />
                          {t("Keluar dari akun")}
                        </button></>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setProfile(false);
                              setAuth("login");
                            }}
                          >
                            <LogIn size={16} />
                            {t("Masuk ke akun")}
                          </button>
                          <button
                            onClick={() => {
                              setProfile(false);
                              setAuth("register");
                            }}
                          >
                            <UserRoundPlus size={16} />
                            {t("Daftar akun baru")}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
                <button
                  className="account-button"
                  onClick={() => setProfile(!profile)}
                  aria-expanded={profile}
                  aria-label={t("Menu akun")}
                >
                  <Avatar a={who} small />
                  <span>
                    <strong>{who.name}</strong>
                    <small>{t(user ? "Akun pribadi" : "Belum masuk")}</small>
                  </span>
                  <ChevronsUpDown size={14} />
                </button>
              </div>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <div className="breadcrumb">
                <button
                  className="icon-btn sidebar-toggle"
                  title={t("Buka atau tutup sidebar")}
                  onClick={() =>
                    window.innerWidth <= 800
                      ? setDrawer(!drawer)
                      : setCollapsed(!collapsed)
                  }
                >
                  {collapsed ? (
                    <PanelLeftClose size={17} />
                  ) : (
                    <PanelLeft size={17} />
                  )}
                </button>
                <i />
                <span className="desktop-crumb">Workspace</span>
                <span className="mobile-brand">
                  <Logo />
                </span>
                <ChevronRight size={12} />
                <strong>{t(nav.find((n) => n.id === page)?.label || "Dashboard")}</strong>
              </div>
              <div className="topbar-end">
                <LanguageSwitch />
                <span className="local-status">
                  <i className={storageOK ? "" : "warning"} />
                  {t(storageOK ? cloudStatus : "Penyimpanan penuh")}
                </span>
                <i />
                <button
                  className="icon-btn"
                  title={t("Bantuan dan panduan")}
                  onClick={() => setHelp(true)}
                >
                  <CircleHelp size={18} />
                </button>
              </div>
            </header>
            <main className="main-content" key={page}>
              {page === "dashboard" && (
                <Dashboard
                  s={s}
                  onPaperChange={(format, customPaper) => setS(old => ({...old, format, customPaper}))}
                  go={go}
                  newLabel={newLabel}
                  resume={
                    load<Entry | null>(draftKey, () => null)?.recipient.name
                      ? () => {
                          setDraft(load(draftKey, () => makeEntry(s)));
                          go("editor");
                        }
                      : undefined
                  }
                  add={() => add()}
                  openAddress={setDetail}
                />
              )}
              {page === "addresses" && (
                <AddressBook
                  s={s}
                  onAdd={() => add()}
                  onEdit={(a) => editA(a)}
                  onUse={newLabel}
                  onDelete={(a) =>
                    setRemoval({ id: a.id, name: a.name, type: "address" })
                  }
                />
              )}
              {page === "drafts" && <Drafts entries={s.drafts || []} latest={latestDraft} onResume={entry => {setDraft(entry); go('editor');}} newLabel={() => newLabel()} onDelete={deleteDrafts} />}
              {page === "senders" && (
                <Senders
                  s={s}
                  onAdd={() => add(true)}
                  onEdit={(a) => editA(a, true)}
                  onDefault={(id) => {
                    setS((o) => ({ ...o, defaultSender: id }));
                    notify("Pengirim utama diperbarui.");
                  }}
                  onDelete={(a) =>
                    setRemoval({ id: a.id, name: a.name, type: "sender" })
                  }
                />
              )}
              {page === "preferences" && (
                <Preferences
                  format={s.format}
                  customPaper={s.customPaper}
                  onSave={(format, customPaper) => {
                    setS((o) => ({ ...o, format, customPaper }));
                    notify("Preferensi printer tersimpan.");
                  }}
                />
              )}
              {page === "history" && (
                <History
                  s={s}
                  newLabel={() => newLabel()}
                  onView={setView}
                  onReprint={startPrint}
                  onDelete={(h) =>
                    setRemoval({ id: h.id, name: h.id, type: "history" })
                  }
                />
              )}
            </main>
          </div>
        </div>
      )}
      {edit && (
        <AddressModal
          initial={edit.a}
          sender={edit.sender}
          isNew={edit.isNew}
          onClose={() => setEdit(null)}
          onSave={(a) => {
            persistAddress(a, edit.sender);
            setEdit(null);
            notify(
              edit.sender
                ? "Profil pengirim tersimpan."
                : "Alamat berhasil disimpan.",
            );
          }}
        />
      )}
      {detail && (
        <Modal
          title="Detail alamat"
          sub="Kontak tersimpan di buku alamatmu."
          onClose={() => setDetail(null)}
        >
          <div className="modal-body address-detail">
            <div className="detail-person">
              <Avatar a={detail} />
              <div>
                <h3>{detail.name}</h3>
                <Tag value={detail.tag} />
              </div>
            </div>
            <div className="detail-block">
              <Phone size={17} />
              <div>
                <small>{t("Nomor telepon")}</small>
                <strong>{detail.phone}</strong>
              </div>
            </div>
            <div className="detail-block">
              <MapPin size={17} />
              <div>
                <small>{t("Alamat lengkap")}</small>
                <strong>{streetLine(detail)}</strong>
                {[detail.village, detail.district].filter(Boolean).join(", ")}
                <p>{placeLine(detail)}</p>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => editA(detail)}>
              <Pencil size={14} />
              {t("Edit alamat")}
            </button>
            <button className="btn dark" onClick={() => newLabel(detail)}>
              <Plus size={15} />
              {t("Buat label")}
            </button>
          </div>
        </Modal>
      )}
      {removal && (
        <Modal
          title={
            "Hapus " +
            (removal.type === "history"
              ? "riwayat cetak"
              : removal.type === "sender"
                ? "profil pengirim"
                : "alamat") +
            "?"
          }
          sub={`“${removal.name}” ${t("akan dihapus dari workspace ini. Tindakan ini tidak dapat dibatalkan.")}`}
          onClose={() => setRemoval(null)}
        >
          <div className="modal-actions">
            <button className="btn" onClick={() => setRemoval(null)}>
              {t("Batal")}
            </button>
            <button className="btn danger-btn" onClick={remove}>
              <Trash2 size={15} />
              {t("Ya, hapus")}
            </button>
          </div>
        </Modal>
      )}
      {view && (
        <Modal
          title="Label tersimpan"
          sub={dateLabel(view.date) + " · " + formatName(view.format, view.customPaper)}
          onClose={() => setView(null)}
        >
          <div className="full-preview">
            <Label entry={view} />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setView(null)}>
              {t("Tutup")}
            </button>
            <button className="btn dark" onClick={() => startPrint(view)}>
              <Printer size={15} />
              {t("Cetak ulang")}
            </button>
          </div>
        </Modal>
      )}
      {auth && (
        <Auth initial={auth} onClose={() => setAuth(null)} onUser={onUser} />
      )}
      {help && (
        <Modal
          title="Panduan Labelin"
          sub="Dari alamat tersimpan sampai paket siap dikirim."
          onClose={() => setHelp(false)}
        >
          <div className="modal-body guide">
            {[
              {
                t: "Simpan alamat dan pengirim",
                d: "Tambahkan kontak di Buku alamat. Atur profil pengirim utama agar alamat asal terisi otomatis.",
              },
              {
                t: "Buat label pengiriman",
                d: "Pilih Buat label baru, lalu isi penerima atau pilih kontak dari buku alamat. Periksa hasilnya di pratinjau langsung.",
              },
              {
                t: "Pilih format dan cetak",
                d: "Gunakan thermal, A4, atau ukuran khusus. Pilih printer pada menu Tujuan di dialog cetak, gunakan skala 100%, dan nonaktifkan header/footer.",
              },
            ].map((x, i) => (
              <div className="guide-step" key={x.t}>
                <span className="step-num">0{i + 1}</span>
                <div>
                  <h3>{t(x.t)}</h3>
                  <p>{t(x.d)}</p>
                </div>
              </div>
            ))}
            <div className="local-note">
              <HardDrive size={18} />
              <span>
                {t("Workspace tamu tersimpan di perangkat ini. Masuk untuk menyinkronkan buku alamat, pengirim, riwayat, preferensi, dan draf antarperangkat.")}
              </span>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn dark" onClick={() => setHelp(false)}>
              {t("Mengerti")}
              <Check size={15} />
            </button>
          </div>
        </Modal>
      )}
      {printJob && !confirmPrint && <Modal title="Pilih printer" sub="Pada dialog cetak berikutnya, pilih printer di menu Tujuan / Destination atau pilih Simpan sebagai PDF." onClose={() => setPrintJob(null)}>
        <div className="print-confirm-detail"><Printer size={22}/><div><strong>{printJob.recipient.name}</strong><small>{formatName(printJob.format, printJob.customPaper)} · {printJob.copies} {t("salinan")}</small></div></div>
        <div className="modal-actions"><button className="btn" onClick={() => setPrintJob(null)}>{t("Batal")}</button><button className="btn dark" onClick={choosePrinter}><Printer size={15}/>{t("Pilih printer & cetak")}</button></div>
      </Modal>}
      {printJob && media &&
        createPortal(
          <>
            <style>{`@page { size: ${media.width}mm ${media.height}mm; margin: 0; }`}</style>
            <div className="print-output">
              {Array.from(
                { length: Math.min(20, Math.max(1, printJob.copies)) },
                (_, i) => (
                  <div key={i} className={"print-page " + printJob.format} style={{width: `${media.width}mm`, height: `${media.height}mm`}}>
                    <Label entry={printJob} />
                  </div>
                ),
              )}
            </div>
          </>,
          document.body,
        )}
      {confirmPrint && printJob && (
        <Modal
          title="Label berhasil dicetak?"
          sub="Konfirmasi hasil cetak untuk menyimpannya ke riwayat."
          onClose={() => {
            setConfirmPrint(false);
            setPrintJob(null);
          }}
        >
          <div className="print-confirm-detail">
            <Printer size={22} />
            <div>
              <strong>{printJob.recipient.name}</strong>
              <small>
                {formatName(printJob.format, printJob.customPaper)} · {printJob.copies} {t("salinan")}
              </small>
            </div>
          </div>
          <div className="modal-actions">
            <button
              className="btn"
              onClick={() => {
                setConfirmPrint(false);
                setPrintJob(null);
              }}
            >
              {t("Belum dicetak")}
            </button>
            <button className="btn dark" onClick={finishPrint}>
              <Check size={15} />
              {t("Ya, simpan riwayat")}
            </button>
          </div>
        </Modal>
      )}
      <Toast text={toast} />
    </PaperLibrary.Provider>
  );
}
