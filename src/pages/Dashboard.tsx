import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  BookUser,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  ContactRound,
  FileStack,
  MapPin,
  Phone,
  Plus,
  Printer,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Avatar, Empty, Tag, TextLink } from "../components/UI";
import { PaperSizeControls } from "../components/PaperSizeDialog";
import { t, locale } from "../lib/language";
import {
  type Store,
  type Address,
  streetLine,
  placeLine,
  dateLabel,
  formatName,
  type Format,
  type PaperSize,
} from "../lib/data";
type Props = {
  s: Store;
  onPaperChange: (format: Format, size: PaperSize) => void;
  go: (p: string) => void;
  newLabel: (a?: Address) => void;
  resume?: () => void;
  add: () => void;
  openAddress: (a: Address) => void;
};
export default function Dashboard({
  s,
  onPaperChange,
  go,
  newLabel,
  resume,
  add,
  openAddress,
}: Props) {
  const [paperValid, setPaperValid] = useState(true);
  const sender =
    s.senders.find((a) => a.id === s.defaultSender) || s.senders[0];
  const metrics = [
    {
      name: "Alamat tersimpan",
      value: s.addresses.length,
      unit: "alamat",
      icon: BookUser,
      color: "lime",
      page: "addresses",
    },
    {
      name: "Label tercetak",
      value: s.history.reduce((n, h) => n + h.copies, 0),
      unit: "label",
      icon: Printer,
      color: "lilac",
      page: "history",
    },
    {
      name: "Profil pengirim",
      value: s.senders.length,
      unit: "profil",
      icon: ContactRound,
      color: "peach",
      page: "senders",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {t("RINGKASAN WORKSPACE")}
          </div>
          <h1>Dashboard</h1>
          <p>{t("Selamat datang kembali. Yuk, siapkan kirimanmu hari ini.")}</p>
        </div>
        <div className="date-pill">
          <CalendarDays size={14} />
          {new Intl.DateTimeFormat(locale(), {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date())}
        </div>
      </div>
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-content">
          <span className="studio-badge">
            <ScanLine size={12} />
            LABEL STUDIO
          </span>
          <h2>{t("Buat label. Siap kirim.")}</h2>
          <p>
            {t("Label pengiriman rapi, tanpa ribet. Buat dan cetak dalam sekejap.")}
          </p>
          <button className="btn dark hero-btn" disabled={!paperValid} onClick={() => newLabel()}>
            <Plus size={17} />
            {t("Buat label baru")}
            <ArrowRight size={15} />
          </button>
          <button className="resume-draft" onClick={() => document.getElementById('dashboard-paper')?.querySelector('select')?.focus()}><SlidersHorizontal size={13}/>{t('Ukuran kertas')}</button>
          {resume && (
            <button className="resume-draft" onClick={resume}>
              {t("Lanjutkan draf")} <ArrowUpRight size={12} />
            </button>
          )}
        </div>
        <div className="hero-art">
          <img
            src="/printer-illustration.svg"
            alt={t("Ilustrasi printer thermal dengan label alamat dan paket")}
          />
          <span>FIG. 01 &nbsp; / &nbsp; THERMAL PRINTER</span>
        </div>
      </section>
      <div className="metrics">
        {metrics.map((m) => (
          <button key={m.name} className="metric" onClick={() => go(m.page)}>
            <span className={"metric-icon " + m.color}>
              <m.icon size={22} strokeWidth={1.65} />
            </span>
            <span className="metric-copy">
              <span className="metric-label">{t(m.name)}</span>
              <span className="metric-value">
                {String(m.value).padStart(2, "0")}
                <small>{t(m.unit)}</small>
              </span>
            </span>
            <ArrowUpRight className="metric-arrow" size={15} />
          </button>
        ))}
      </div>
      <div className="dash-columns">
        <section className="panel address-panel">
          <div className="panel-head">
            <div>
              <div className="section-title">
                <BookUser size={19} />
                <h2>{t("Buku alamat")}</h2>
              </div>
              <p>{t("Alamat tujuan yang kamu simpan.")}</p>
            </div>
            <TextLink onClick={() => go("addresses")}>Lihat semua</TextLink>
          </div>
          <div className="address-rows">
            {s.addresses.slice(0, 4).map((a) => (
              <button
                key={a.id}
                className="address-row"
                onClick={() => openAddress(a)}
              >
                <Avatar a={a} />
                <div className="address-main">
                  <div className="name-line">
                    <strong>{a.name}</strong>
                    <Tag value={a.tag} />
                  </div>
                  <span>
                    {a.street}, {a.city}
                  </span>
                </div>
                <ChevronRight size={16} className="row-chevron" />
              </button>
            ))}
            {!s.addresses.length && (
              <Empty
                title="Buku alamat masih kosong"
                detail="Simpan alamat tujuan pertamamu."
              />
            )}
          </div>
          <button className="add-address" onClick={add}>
            <Plus size={15} />
            {t("Tambah alamat")}
          </button>
        </section>
        <div className="dash-right">
          <section className="panel sender-panel">
            <div className="panel-head compact">
              <div className="section-title">
                <CircleUserRound size={18} />
                <h2>{t("Pengirim utama")}</h2>
              </div>
              <button
                className="icon-btn small-icon"
                title={t("Kelola profil pengirim")}
                onClick={() => go("senders")}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
            {sender ? (
              <div className="sender-content">
                <div className="sender-name">
                  <Avatar a={sender} small />
                  <div>
                    <strong>{sender.name}</strong>
                    <span className="default-tag">
                      <i />
                      Default
                    </span>
                  </div>
                </div>
                <div className="detail-line">
                  <MapPin size={14} />
                  <span>
                    {streetLine(sender)}
                    <br />
                    {placeLine(sender)}
                  </span>
                </div>
                <div className="detail-line">
                  <Phone size={13} />
                  <span>{sender.phone}</span>
                </div>
              </div>
            ) : (
              <div className="sender-content">
                <button className="btn" onClick={() => go("senders")}>
                  {t("Tambah profil pengirim")}
                </button>
              </div>
            )}
          </section>
          <section className="panel print-pref-panel" id="dashboard-paper">
            <div className="panel-head compact">
              <div className="section-title">
                <SlidersHorizontal size={17} />
                <h2>{t("Preferensi cetak")}</h2>
              </div>
              <button
                className="icon-btn small-icon"
                title={t("Ubah preferensi cetak")}
                onClick={() => go("preferences")}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
            <PaperSizeControls format={s.format} customPaper={s.customPaper} onValid={setPaperValid} onChange={onPaperChange} />
          </section>
        </div>
      </div>
      <section className="panel recent-panel">
        <div className="panel-head">
          <div>
            <div className="section-title">
              <FileStack size={18} />
              <h2>{t("Aktivitas terbaru")}</h2>
            </div>
            <p>{t("Riwayat label yang terakhir dicetak.")}</p>
          </div>
          <TextLink onClick={() => go("history")}>Lihat riwayat</TextLink>
        </div>
        <div className="recent-list">
          {s.history.slice(0, 3).map((h) => (
            <button onClick={() => go("history")} key={h.id}>
              <span className="history-icon">
                <Printer size={17} />
              </span>
              <span>
                <strong>{t("Label untuk")} {h.recipient.name}</strong>
                <small>
                  {h.id} &nbsp;·&nbsp; {formatName(h.format, h.customPaper)}
                </small>
              </span>
              <span className="recent-date">{dateLabel(h.date, true)}</span>
            </button>
          ))}
          {!s.history.length && (
            <div className="inline-empty">
              {t("Label yang sudah dicetak akan muncul di sini.")}
            </div>
          )}
        </div>
      </section>
      <footer className="page-footer">
        <span>
          Labelin <span className="foot-dot">/</span> Personal shipping
          workspace
        </span>
        <span>
          <Sparkles size={12} />
          {t("Dibuat untuk kiriman sehari-hari")}
        </span>
      </footer>
    </>
  );
}
