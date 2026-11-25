import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookUser,
  Check,
  ChevronDown,
  CircleUserRound,
  Download,
  Eye,
  FileCheck2,
  FileText,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Save,
  ScanLine,
  X,
} from "lucide-react";
import {
  type Entry,
  type Store,
  type Address,
  makeEntry,
  formatName,
  paperSize,
  dimensionText,
  orientationText,
  persistSnapshot,
} from "../lib/data";
import { Fields } from "../components/AddressForm";
import { Logo, Modal, LanguageSwitch } from "../components/UI";
import { t } from "../lib/language";
import { Label } from "../components/Label";
import { PaperSizeControls } from "../components/PaperSizeDialog";
export default function Editor({
  initial,
  s,
  onBack,
  onPrint,
  onSaveAddress,
  onSaveDraft,
  draftKey,
  notify,
}: {
  initial: Entry;
  s: Store;
  onBack: () => void;
  onPrint: (e: Entry) => void;
  onSaveAddress: (a: Address) => void;
  onSaveDraft: (entry: Entry) => void;
  draftKey: string;
  notify: (m: string) => void;
}) {
  const [e, setE] = useState(initial);
  const fontSizes = [80, 90, 100, 110, 125];
  const fontSize = e.fontSizePercent ?? 100;
  const [zoom, setZoom] = useState(100);
  const previewRef = useRef<HTMLDivElement>(null);
  const adjustZoom = useCallback((delta: number) => setZoom(z => Math.min(300, Math.max(70, z + delta))), []);
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    let accumulated = 0;
    const onWheel = (event: WheelEvent) => {
      if (!event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 80 : 1);
      if (Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
      accumulated += delta;
      if (Math.abs(accumulated) >= 40) {
        adjustZoom(-Math.sign(accumulated) * 10);
        accumulated = 0;
      }
    };
    preview.addEventListener('wheel', onWheel, { passive: false });
    return () => preview.removeEventListener('wheel', onWheel);
  }, [adjustZoom]);
  const [focus, setFocus] = useState(false);
  const [paperValid, setPaperValid] = useState(true);
  const paper = paperSize(e.format, e.customPaper);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [reset, setReset] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [senderOpen, setSenderOpen] = useState(!initial.sender.name);
  useEffect(() => {
    let active = true;
    onSaveDraft(e);
    persistSnapshot(draftKey, e).then((ok) => {
      if (active) setSaveError(!ok);
    });
    return () => {
      active = false;
    };
  }, [e, draftKey, onSaveDraft]);
  const change = (v: Partial<Entry>) => setE((x) => ({ ...x, ...v, date: new Date().toISOString() }));
  const saveRecipient = () => {
    const group = document.querySelector("#recipient-fields");
    if (!group) return;
    const input = [
      ...group.querySelectorAll<HTMLInputElement>("input, select, textarea"),
    ].find((i) => !i.checkValidity());
    if (input) {
      input.reportValidity();
      return;
    }
    onSaveAddress({ ...e.recipient });
    notify("Alamat penerima tersimpan di buku alamat.");
  };
  return (
    <div className="editor">
      <header className="editor-header">
        <button
          className="icon-btn"
          title={t("Kembali ke dashboard")}
          onClick={onBack}
        >
          <ArrowLeft size={19} />
        </button>
        <Logo />
        <span className="vertical-rule" />
        <strong>{t("Editor label")}</strong>
        <div className="editor-header-end">
          <LanguageSwitch />
          <span className="saved-note">
            <FileCheck2 size={14} />
            {t(saveError ? "Draf belum tersimpan" : "Draf tersimpan")}
          </span>
          <button className="btn dark" type="submit" form="label-editor" disabled={!paperValid}>
            <Printer size={16} />
            {t("Cetak label")}
          </button>
        </div>
      </header>
      <div className="mobile-editor-tabs">
        <button
          className={!mobilePreview ? "selected" : ""}
          onClick={() => setMobilePreview(false)}
        >
          <FileText size={15} />
          {t("Detail label")}
        </button>
        <button
          className={mobilePreview ? "selected" : ""}
          onClick={() => setMobilePreview(true)}
        >
          <Eye size={15} />
          {t("Pratinjau")}
        </button>
      </div>
      <div className="editor-columns">
        <form
          id="label-editor"
          className={"editor-form " + (mobilePreview ? "mobile-hidden" : "")}
          onSubmit={async (ev) => {
            ev.preventDefault();
            if (!paperValid) { setMobilePreview(true); return; }
            if (((ev.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === 'pdf') {
              if (savingPdf) return;
              setSavingPdf(true);
              try {
                const label = previewRef.current?.querySelector<HTMLElement>('.paper-label');
                if (!label) throw new Error('Label unavailable');
                const snapshot = label.cloneNode(true) as HTMLElement;
                const { saveLabelPdf } = await import('../lib/saveLabelPdf');
                await saveLabelPdf(e, snapshot);
              } catch { notify(t('PDF tidak dapat disimpan. Silakan coba lagi.')); }
              finally { setSavingPdf(false); }
              return;
            }
            onPrint({ ...e, date: new Date().toISOString() });
          }}
          onInvalidCapture={(ev) => {
            const element = ev.target as HTMLInputElement;
            const d = element.closest("details");
            if (d) d.open = true;
            setMobilePreview(false);
            setTimeout(() => element.focus(), 20);
          }}
        >
          <div className="editor-form-heading">
            <div className="eyebrow">
              <ScanLine size={13} />
              LABEL STUDIO
            </div>
            <h1>{t("Detail pengiriman")}</h1>
            <p>{t("Isi alamat, periksa label, lalu cetak.")}</p>
          </div>
          <details
            className="sender-details"
            open={senderOpen}
            onToggle={(ev) => setSenderOpen(ev.currentTarget.open)}
          >
            <summary>
              <span className="step-num">01</span>
              <div>
                <h3>{t("Pengirim")}</h3>
                <small>{e.sender.name || t("Lengkapi alamat pengirim")}</small>
              </div>
              <ChevronDown size={16} />
            </summary>
            <div className="sender-fields">
              {s.senders.length > 0 && (
                <label className="field pick-field">
                  <span>
                    <CircleUserRound size={14} />
                    {t("Profil tersimpan")}
                  </span>
                  <select
                    value={
                      s.senders.find((a) => a.id === e.sender.id)?.id || ""
                    }
                    onChange={(ev) => {
                      const a = s.senders.find((x) => x.id === ev.target.value);
                      if (a) change({ sender: { ...a } });
                    }}
                  >
                    <option value="" disabled>
                      {t("Pilih profil pengirim")}
                    </option>
                    {s.senders.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.name}
                        {a.id === s.defaultSender ? " — " + t("Utama") : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Fields
                prefix="sender"
                value={e.sender}
                onChange={(sender) => change({ sender })}
              />
            </div>
          </details>
          <section className="recipient-section">
            <div className="form-section-title">
              <span className="step-num">02</span>
              <div>
                <h3>{t("Penerima")}</h3>
                <small>{t("Alamat tujuan pengiriman")}</small>
              </div>
              <MapPin size={18} />
            </div>
            {s.addresses.length > 0 && (
              <label className="address-picker">
                <BookUser size={16} />
                <select
                  aria-label={t("Pilih dari buku alamat")}
                  value=""
                  onChange={(ev) => {
                    const a = s.addresses.find((x) => x.id === ev.target.value);
                    if (a) change({ recipient: { ...a } });
                  }}
                >
                  <option value="" disabled>
                    {t("Pilih dari buku alamat")}
                  </option>
                  {s.addresses.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name} · {a.city}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
            )}
            <div id="recipient-fields">
              <Fields
                prefix="recipient"
                value={e.recipient}
                onChange={(recipient) => change({ recipient })}
              />
            </div>
            <button
              type="button"
              className="text-link save-address-link"
              onClick={saveRecipient}
            >
              <Save size={14} />
              {t("Simpan penerima ke buku alamat")}
            </button>
          </section>
          <div className="editor-extras">
            <label className="field">
              <span>
                {t("Catatan pengiriman")} <small>{t("Opsional")}</small>
              </span>
              <textarea
                rows={2}
                value={e.note}
                maxLength={120}
                placeholder={t("Contoh: titipkan ke resepsionis")}
                onChange={(ev) => change({ note: ev.target.value })}
              />
            </label>
            <div className="copies-line">
              <label htmlFor="copies">{t("Jumlah salinan")}</label>
              <input
                id="copies"
                type="number"
                min="1"
                max="20"
                required
                value={e.copies}
                onChange={(ev) => change({ copies: Number(ev.target.value) })}
              />
            </div>
          </div>
          <div className="editor-bottom">
            <button
              type="button"
              className="text-link muted"
              onClick={() => setReset(true)}
            >
              <RotateCcw size={14} />
              {t("Mulai label baru")}
            </button>
            <button className="btn dark" disabled={!paperValid}>
              <Printer size={15} />
              {t("Cetak label")}
            </button>
          </div>
        </form>
        <aside
          className={
            "preview-column " + (!mobilePreview ? "mobile-hidden" : "")
          }
        >
          <div className="preview-top">
            <div className="section-title">
              <Eye size={17} />
              <h2>{t("Pratinjau label")}</h2>
              <span className="live-pill">
                <i />
                Live
              </span>
            </div>
            <button
              className="icon-btn"
              title={t("Perbesar pratinjau")}
              onClick={() => setFocus(true)}
            >
              <Maximize2 size={16} />
            </button>
          </div>
          <div className="preview-stage">
            <PaperSizeControls key={e.id} format={e.format} customPaper={e.customPaper} onValid={setPaperValid} onChange={(format, customPaper) => change({format, customPaper})} />
            <div className="flex items-center gap-3">
            <span id="label-font-size" style={{fontSize:12, marginBottom:10}}>
              {t('Ukuran huruf label')}
            </span>
            <div className="zoom-control" role="group" aria-labelledby="label-font-size">
              <button type="button" title={t('Perkecil ukuran huruf')} disabled={fontSize <= 80} onClick={() => change({fontSizePercent: fontSizes.filter(size => size < fontSize).at(-1) ?? 80})}>
                <Minus size={14} />
              </button>
              <span aria-live="polite">{fontSize}%</span>
              <button type="button" title={t('Perbesar ukuran huruf')} disabled={fontSize >= 125} onClick={() => change({fontSizePercent: fontSizes.find(size => size > fontSize) ?? 125})}>
                <Plus size={14} />
              </button>
            </div>
            <div className="zoom-control">
              <button
                title={t("Perkecil")}
                disabled={zoom <= 70}
                onClick={() => adjustZoom(-10)}
              >
                <Minus size={14} />
              </button>
              <span>{zoom}%</span>
              <button
                title={t("Perbesar")}
                disabled={zoom >= 300}
                onClick={() => adjustZoom(10)}
              >
                <Plus size={14} />
              </button>
            </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3">
            <label className="flex-label" style={{fontSize:12, marginBottom:12, cursor:'pointer'}}>
              <input type="checkbox" checked={e.showAddressType !== false} onChange={ev => change({showAddressType: ev.target.checked})} />
              {t('Tampilkan jenis alamat')}
            </label>
            <label className="flex-label" style={{fontSize:12, marginBottom:12, cursor:'pointer'}}>
              <input type="checkbox" checked={e.showLabelNumber !== false} onChange={ev => change({showLabelNumber: ev.target.checked})} />
              {t('Tampilkan nomor LBL')}
            </label>
            </div>
            <div className="sheet-scroll" ref={previewRef}>
              <div
                className={"preview-sheet " + e.format}
                style={{ width: `${3.04 * zoom * (e.format === 'custom' ? Math.min(paper.width / 100, 1.35) : 1)}px`, maxWidth: zoom > 100 ? 'none' : undefined }}
              >
                <Label entry={e} />
              </div>
            </div>
            <span className="dimension-line">
              {dimensionText(paper)} &nbsp;·&nbsp; {orientationText(paper).toUpperCase()}
            </span>
          </div>
          <div className="preview-caption">
            <Printer size={15} />
            <span>
              {formatName(e.format, e.customPaper)}
              <small>{t("Gunakan skala 100% saat mencetak.")}</small>
            </span>
            <button className="btn" style={{marginLeft:'auto'}} type="submit" form="label-editor" value="pdf" disabled={!paperValid || savingPdf}>
              <Download size={15}/>{t(savingPdf ? 'Menyiapkan PDF…' : 'Simpan PDF')}
            </button>
          </div>
        </aside>
      </div>
      {focus && (
        <Modal
          title="Pratinjau label"
          sub={formatName(e.format, e.customPaper)}
          onClose={() => setFocus(false)}
        >
          <div className="full-preview">
            <Label entry={e} />
          </div>
        </Modal>
      )}
      {reset && (
        <Modal
          title="Mulai label baru?"
          sub="Isi draf saat ini akan diganti dengan label kosong."
          onClose={() => setReset(false)}
        >
          <div className="modal-actions">
            <button className="btn" onClick={() => setReset(false)}>
              <X size={14} />
              {t("Batal")}
            </button>
            <button
              className="btn dark"
              onClick={() => {
                setE(makeEntry(s));
                setPaperValid(true);
                setReset(false);
                document.querySelector(".editor-form")?.scrollTo(0, 0);
              }}
            >
              <Check size={14} />
              {t("Mulai baru")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
