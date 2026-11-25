import { useState } from "react";
import {
  ArrowRight,
  BookUser,
  Check,
  CheckCheck,
  CircleUserRound,
  FileText,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Star,
  Trash2,
  X,
  Settings2,
} from "lucide-react";
import {
  type Store,
  type Address,
  type Entry,
  type Format,
  type PaperSize,
  defaultPaper,
  streetLine,
  placeLine,
  dateLabel,
  formatName,
} from "../lib/data";
import { Avatar, Empty, Modal, Tag } from "../components/UI";
import { PaperSizeControls } from "../components/PaperSizeDialog";
import { t } from "../lib/language";
export function AddressBook({
  s,
  onAdd,
  onEdit,
  onUse,
  onDelete,
}: {
  s: Store;
  onAdd: () => void;
  onEdit: (a: Address) => void;
  onUse: (a: Address) => void;
  onDelete: (a: Address) => void;
}) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("Semua");
  const filtered = s.addresses.filter(
    (a) =>
      (tag === "Semua" || tag === a.tag) &&
      [a.name, a.phone, a.street, a.city, a.province, a.postal]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {t("DIREKTORI PRIBADI")}
          </div>
          <h1>{t("Buku alamat")}</h1>
          <p>{t("Simpan sekali, gunakan lagi untuk kiriman berikutnya.")}</p>
        </div>
        <button className="btn dark" onClick={onAdd}>
          <Plus size={16} />
          {t("Tambah alamat")}
        </button>
      </div>
      <div className="library-toolbar">
        <div className="tabs">
          {["Semua", "Rumah", "Kantor", "Lainnya"].map((kind) => (
            <button
              className={kind === tag ? "selected" : ""}
              onClick={() => setTag(kind)}
              key={kind}
            >
              {t(kind)}
              {kind === "Semua" && <small>{s.addresses.length}</small>}
            </button>
          ))}
        </div>
        <div className="search-input">
          <Search size={16} />
          <input
            aria-label={t("Cari alamat")}
            placeholder={t("Cari nama atau alamat…")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button title={t("Hapus pencarian")} onClick={() => setQ("")}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="address-grid">
        {filtered.map((a) => (
          <section className="panel contact-card" key={a.id}>
            <div className="contact-top">
              <Avatar a={a} />
              <Tag value={a.tag} />
            </div>
            <h3>{a.name}</h3>
            <div className="detail-line">
              <Phone size={14} />
              {a.phone}
            </div>
            <div className="detail-line">
              <MapPin size={15} />
              <span>
                {streetLine(a)}
                <br />
                {[a.village, a.district].filter(Boolean).join(", ")}
                {(a.village || a.district) && <br />}
                {placeLine(a)}
              </span>
            </div>
            <div className="card-actions">
              <button className="text-link" onClick={() => onUse(a)}>
                {t("Buat label")}
                <ArrowRight size={14} />
              </button>
              <div>
                <button
                  className="icon-btn"
                  title={t("Edit alamat") + " · " + a.name}
                  onClick={() => onEdit(a)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="icon-btn danger"
                  title={t("Hapus alamat") + " · " + a.name}
                  onClick={() => onDelete(a)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title={
            s.addresses.length
              ? "Tidak ada alamat yang cocok"
              : "Belum ada alamat tersimpan"
          }
          detail={
            s.addresses.length
              ? "Coba nama, kota, atau jenis alamat lain."
              : "Tambahkan alamat penerima agar membuat label lebih cepat."
          }
        >
          <button
            className="btn"
            onClick={
              s.addresses.length
                ? () => {
                    setQ("");
                    setTag("Semua");
                  }
                : onAdd
            }
          >
            {t(s.addresses.length ? "Reset pencarian" : "Tambah alamat")}
          </button>
        </Empty>
      )}
    </>
  );
}
export function Senders({
  s,
  onAdd,
  onEdit,
  onDefault,
  onDelete,
}: {
  s: Store;
  onAdd: () => void;
  onEdit: (a: Address) => void;
  onDefault: (id: string) => void;
  onDelete: (a: Address) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {t("PENGATURAN WORKSPACE")}
          </div>
          <h1>{t("Profil pengirim")}</h1>
          <p>{t("Pilih identitas dan alamat asal untuk setiap kirimanmu.")}</p>
        </div>
        <button className="btn dark" onClick={onAdd}>
          <Plus size={16} />
          {t("Tambah profil")}
        </button>
      </div>
      <div className="info-strip">
        <CircleUserRound size={19} />
        <span>
          {t("Profil utama akan terisi otomatis setiap kali kamu membuat label baru.")}
        </span>
      </div>
      <div className="address-grid sender-grid">
        {s.senders.map((a) => (
          <section
            className={
              "panel contact-card " +
              (s.defaultSender === a.id ? "default-card" : "")
            }
            key={a.id}
          >
            <div className="contact-top">
              <Avatar a={a} />
              {s.defaultSender === a.id ? (
                <span className="default-tag">
                  <i />
                  {t("Pengirim utama")}
                </span>
              ) : (
                <Tag value={a.tag} />
              )}
            </div>
            <h3>{a.name}</h3>
            <div className="detail-line">
              <Phone size={14} />
              {a.phone}
            </div>
            <div className="detail-line">
              <MapPin size={14} />
              <span>
                {streetLine(a)}
                <br />
                {placeLine(a)}
              </span>
            </div>
            <div className="card-actions">
              {s.defaultSender !== a.id ? (
                <button className="text-link" onClick={() => onDefault(a.id)}>
                  <Star size={14} />
                  {t("Jadikan utama")}
                </button>
              ) : (
                <span className="muted flex-label">
                  <CheckCheck size={15} />
                  {t("Profil default")}
                </span>
              )}
              <div>
                <button
                  className="icon-btn"
                  title={t("Edit profil")}
                  onClick={() => onEdit(a)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="icon-btn danger"
                  title={t("Hapus profil")}
                  onClick={() => onDelete(a)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>
      {!s.senders.length && (
        <Empty
          title="Buat profil pengirimmu"
          detail="Simpan alamat asal agar tidak perlu mengetiknya lagi."
        >
          <button className="btn" onClick={onAdd}>
            {t("Tambah profil")}
          </button>
        </Empty>
      )}
    </>
  );
}
export function Preferences({
  format,
  customPaper,
  onSave,
}: {
  format: Format;
  customPaper?: PaperSize;
  onSave: (f: Format, size: PaperSize) => void;
}) {
  const [v, setV] = useState(format);
  const [size, setSize] = useState(customPaper ?? defaultPaper);
  const [paperValid, setPaperValid] = useState(true);
  const [paperReset, setPaperReset] = useState(0);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {t("PENGATURAN WORKSPACE")}
          </div>
          <h1>{t("Preferensi printer")}</h1>
          <p>{t("Sesuaikan format label dengan printer yang kamu gunakan.")}</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <div className="panel-head">
          <div>
            <div className="section-title">
              <Settings2 size={18} />
              <h2>{t("Format cetak default")}</h2>
            </div>
            <p>
              {t("Format ini akan digunakan pada label baru. Kamu bisa mengubahnya di editor.")}
            </p>
          </div>
        </div>
        <div className="format-options">
          {(["thermal", "a4"] as Format[]).map((f) => (
            <button
              className={"format-option " + (v === f ? "chosen" : "")}
              key={f}
              onClick={() => {setV(f); setPaperValid(true); setPaperReset(n => n + 1);}}
              aria-pressed={v === f}
            >
              <span className="radio-circle">{v === f && <span />}</span>
              <div className={"paper-diagram " + f}>
                <span />
                <i />
                <i />
                <i />
                <b />
              </div>
              <h3>
                {t(f === "thermal" ? "Printer thermal" : "Printer standar A4")}
              </h3>
              <strong>
                {f === "thermal" ? "100 × 150 mm" : "210 × 297 mm"}
              </strong>
              <p>
                {t(f === "thermal"
                  ? "Satu label per lembar, tanpa margin. Cocok untuk printer label thermal."
                  : "Label 100 × 150 mm di kiri atas kertas A4, dengan margin 10 mm.")}
              </p>
            </button>
          ))}
        </div>
        <PaperSizeControls key={paperReset} format={v} customPaper={size} onValid={setPaperValid} onChange={(format, next) => {setSize(next); setV(format);}} />
        <div className="pref-note">
          <Printer size={16} />
          <p>
            {t("Gunakan skala")} <strong>{t("100% / ukuran aktual")}</strong> {t("dan nonaktifkan header serta footer pada dialog cetak browser.")}
          </p>
        </div>
        <div className="modal-actions">
          <button className="btn dark" disabled={!paperValid} onClick={() => onSave(v, size)}>
            <Check size={16} />
            {t("Simpan preferensi")}
          </button>
        </div>
      </section>
    </>
  );
}
export function Drafts({entries, latest, onResume, newLabel, onDelete}: {entries: Entry[]; latest: Entry | null; onResume: (entry: Entry) => void; newLabel: () => void; onDelete: (ids: string[]) => void}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string[] | null>(null);
  const rows = [...entries];
  if (latest && !rows.some(d => d.id === latest.id)) rows.push(latest);
  rows.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const selectedIds = rows.filter(d => selected.includes(d.id)).map(d => d.id);
  return <>
    <div className="page-heading"><div>
      <div className="eyebrow"><span className="eyebrow-line"/>WORKSPACE</div>
      <h1>{t('Draf')}</h1><p>{t('Lihat dan lanjutkan label yang tersimpan otomatis.')}</p>
    </div><button className="btn dark" onClick={newLabel}><Plus size={16}/>{t('Buat label baru')}</button></div>
    {rows.length > 0 && <div className="library-toolbar"><span className="muted" role="status">{selectedIds.length} {t('dipilih')}</span><button className="btn danger-btn" disabled={!selectedIds.length} onClick={() => setPending(selectedIds)}><Trash2 size={14}/>{t('Hapus pilihan')}</button></div>}
    <div className="panel table-wrap">{rows.length ? <table>
      <thead><tr><th><input type="checkbox" aria-label={t('Pilih semua draf')} checked={selectedIds.length === rows.length} ref={el => {if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < rows.length;}} onChange={e => setSelected(e.target.checked ? rows.map(d => d.id) : [])}/></th><th>{t('Label / penerima')}</th><th>{t('Terakhir disimpan')}</th><th>Format</th><th>{t('Aksi')}</th></tr></thead>
      <tbody>{rows.map(d => <tr key={d.id}>
        <td><input type="checkbox" aria-label={`${t('Pilih draf')}: ${d.recipient.name.trim() || d.id}`} checked={selected.includes(d.id)} onChange={e => setSelected(e.target.checked ? [...selected, d.id] : selected.filter(id => id !== d.id))}/></td>
        <td><button className="table-person" onClick={() => onResume(d)}><span className="history-icon"><FileText size={18}/></span><span><strong>{d.recipient.name.trim() || t('Draf tanpa nama')}</strong><small>{d.id}</small></span></button></td>
        <td>{dateLabel(d.date, true)}</td><td><span className="plain-tag">{formatName(d.format, d.customPaper)}</span></td>
        <td><button className="text-link" onClick={() => onResume(d)}>{t('Lanjutkan draf')}<ArrowRight size={14}/></button></td>
      </tr>)}</tbody>
    </table> : <Empty title="Belum ada draf" detail="Mulai label baru. Drafmu akan tersimpan otomatis di sini."/>}</div>
    {pending && <Modal title="Hapus draf yang dipilih?" sub={`${t('Jumlah draf yang akan dihapus')}: ${pending.length}. ${t('Tindakan ini tidak dapat dibatalkan.')}`} onClose={() => setPending(null)}><div className="modal-actions"><button className="btn" onClick={() => setPending(null)}>{t('Batal')}</button><button className="btn danger-btn" onClick={() => {onDelete(pending); setPending(null); setSelected([]);}}><Trash2 size={15}/>{t('Ya, hapus')}</button></div></Modal>}
  </>;
}
export function History({
  s,
  onView,
  onReprint,
  onDelete,
  newLabel,
}: {
  s: Store;
  onView: (h: Entry) => void;
  onReprint: (h: Entry) => void;
  onDelete: (h: Entry) => void;
  newLabel: () => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = s.history.filter(
    (h) =>
      (filter === "all" || h.format === filter) &&
      [h.id, h.recipient.name, h.recipient.city]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {t("AKTIVITAS WORKSPACE")}
          </div>
          <h1>{t("Riwayat cetak")}</h1>
          <p>{t("Lihat kembali, periksa, dan cetak ulang label pengirimanmu.")}</p>
        </div>
        <button className="btn dark" onClick={newLabel}>
          <Plus size={16} />
          {t("Buat label baru")}
        </button>
      </div>
      <div className="library-toolbar">
        <div className="search-input">
          <Search size={16} />
          <input
            aria-label={t("Cari riwayat")}
            placeholder={t("Cari penerima atau nomor label…")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          aria-label={t("Filter format cetak")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t("Semua format")}</option>
          <option value="thermal">Thermal</option>
          <option value="a4">A4</option>
          <option value="custom">{t("Templat & ukuran khusus")}</option>
        </select>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("Label / penerima")}</th>
              <th>{t("Tanggal cetak")}</th>
              <th>Format</th>
              <th>{t("Jumlah")}</th>
              <th>{t("Aksi")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <td>
                  <button className="table-person" onClick={() => onView(h)}>
                    <span className="history-icon">
                      <FileText size={18} />
                    </span>
                    <span>
                      <strong>{h.recipient.name}</strong>
                      <small>{h.id}</small>
                    </span>
                  </button>
                </td>
                <td>{dateLabel(h.date, true)}</td>
                <td>
                  <span className="plain-tag">{formatName(h.format, h.customPaper)}</span>
                </td>
                <td>{h.copies} {h.copies === 1 ? 'label' : t("label")}</td>
                <td>
                  <div className="flex-label">
                    <button
                      className="icon-btn"
                      title={t("Lihat label")}
                      onClick={() => onView(h)}
                    >
                      <BookUser size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      title={t("Cetak ulang")}
                      onClick={() => onReprint(h)}
                    >
                      <Printer size={15} />
                    </button>
                    <button
                      className="icon-btn danger"
                      title={t("Hapus riwayat")}
                      onClick={() => onDelete(h)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <Empty
            title="Belum ada riwayat yang cocok"
            detail="Hasil cetak yang dikonfirmasi akan tersimpan di sini."
          />
        )}
      </div>
    </>
  );
}
