import { useContext, useState } from "react";
import { Plus } from 'lucide-react';
import { PaperLibrary } from '../lib/paperLibrary';
import { Modal } from './UI';
import { paperSize, paperTemplates, dimensionText, type Format, type PaperUnit, type PaperSize } from "../lib/data";
import { t } from "../lib/language";
export function PaperSizeControls({ format, customPaper, onChange, onValid }: {
  format: Format;
  customPaper?: PaperSize;
  onChange: (format: Format, size: PaperSize) => void;
  onValid?: (valid: boolean) => void;
}) {
  const size = paperSize(format, customPaper);
  const library = useContext(PaperLibrary);
  const [presetName, setPresetName] = useState<string | null>(null);
  const name = presetName?.trim() || '';
  const duplicate = !!name && [...(library?.sizes || []), ...paperTemplates].some(p => p.name.toLowerCase() === name.toLowerCase());
  const unit = size.unit || 'mm';
  const factor = unit === 'in' ? 25.4 : 1;
  const signature = (f: Format, s: PaperSize) => [f, s.width, s.height, s.unit || 'mm', s.template || ''].join(':');
  const base = signature(format, size);
  const [draft, setDraft] = useState<{base: string; width: string; height: string} | null>(null);
  const display = (n: number) => String(Number((n / factor).toFixed(8)));
  // Preserve partial input while typing without passing invalid dimensions to the printer.
  const values = draft?.base === base ? draft : { width: display(size.width), height: display(size.height) };
  const selected = format === 'custom' ? size.template || 'custom' : format;
  const toMm = (text: string) => Number((Number(text) * factor).toFixed(6));
  const valid = (text: string) => text !== '' && toMm(text) >= 20 && toMm(text) <= 1000;
  const commit = (f: Format, next: PaperSize) => { setDraft(null); onValid?.(true); onChange(f, next); };
  const choose = (id: string) => {
    if (id === 'thermal' || id === 'a4') return commit(id, paperSize(id));
    const saved = library?.sizes.find(item => item.id === id);
    if (saved) return commit('custom', {width: saved.width, height: saved.height, unit: saved.unit, template: saved.id, name: saved.name});
    const p = paperTemplates.find(item => item.id === id);
    commit('custom', p ? {width: p.width, height: p.height, template: p.id, unit: p.unit} : {...size, template: undefined, name: undefined});
  };
  const input = (key: 'width' | 'height', label: string) => <label className="field"><span>{t(label)} ({unit})</span><input
    type="number" inputMode="decimal" min={20 / factor} max={1000 / factor} step="any" required
    value={values[key]} aria-invalid={!valid(values[key])} onChange={event => {
      const next = {...values, [key]: event.target.value};
      const ok = valid(next.width) && valid(next.height);
      onValid?.(ok);
      if (ok) {
        const paper = {width: toMm(next.width), height: toMm(next.height), unit};
        setDraft({...next, base: signature('custom', paper)}); onChange('custom', paper);
      } else setDraft({...next, base});
    }} /></label>;
  return <div className="paper-controls">
    <label className="field"><span>{t('Templat kertas')}</span><select aria-label={t('Templat kertas')} value={selected} onChange={event => choose(event.target.value)}>
      <option value="thermal">Thermal · 100 × 150 mm</option><option value="a4">A4 · 210 × 297 mm</option>
      {paperTemplates.map(p => <option key={p.id} value={p.id}>{p.name} · {dimensionText(p)}</option>)}
      {!!library?.sizes.length && <optgroup label={t('Ukuran tersimpan')}>{library.sizes.map(p => <option key={p.id} value={p.id}>{p.name} · {dimensionText(p)}</option>)}</optgroup>}
      <option value="custom">{t('Ukuran khusus')}</option>
    </select></label>
    <div className="paper-shortcuts" role="group" aria-label={t('Pilihan cepat')}>
      {([['a6','A6'],['2x3','2 × 3 in'],['4x6','4 × 6 in'],['4x8','4 × 8 in'],['legal','US Legal']] as const).map(([id, label]) =>
        <button type="button" key={id} aria-pressed={selected === id} onClick={() => choose(id)}>{label}</button>)}
    </div>
    <div className="paper-measurements">{input('width', 'Lebar')}{input('height', 'Tinggi')}
      <div className="field"><span>{t('Satuan')}</span><div className="paper-units" role="group" aria-label={t('Satuan')}>
        {(['mm','in'] as PaperUnit[]).map(u => <button type="button" key={u} aria-label={t(u === 'mm' ? 'Milimeter (mm)' : 'Inci (in)')} aria-pressed={unit === u} onClick={() => commit(format, {...size, unit: u})}>{u}</button>)}
      </div></div>
    </div>
    {(!valid(values.width) || !valid(values.height)) && <small role="alert" className="paper-error">{t('Rentang per sisi')}: {unit === 'mm' ? '20–1000 mm' : '0.787402–39.370078 in'}</small>}
    <button type="button" className="text-link" style={{justifySelf:'start'}} disabled={!valid(values.width) || !valid(values.height)} onClick={() => setPresetName('')}><Plus size={13}/>{t('Simpan ukuran ke daftar')}</button>
    {presetName !== null && library && <Modal title="Simpan ukuran kertas" sub={dimensionText(size)} onClose={() => setPresetName(null)}>
      <form onSubmit={event => {
        event.preventDefault();
        if (!name || duplicate || !valid(values.width) || !valid(values.height)) return;
        const preset = {id: 'user-'+crypto.randomUUID(), name, width: size.width, height: size.height, unit};
        library.add(preset);
        commit('custom', {width: preset.width, height: preset.height, unit, template: preset.id, name});
        setPresetName(null);
      }}>
        <div className="modal-body"><label className="field"><span>{t('Nama ukuran')}</span><input autoFocus required maxLength={60} value={presetName} onChange={event => setPresetName(event.target.value)} /></label>
          {duplicate && <small role="alert" className="paper-error">{t('Nama ukuran sudah digunakan.')}</small>}
        </div>
        <div className="modal-actions"><button type="button" className="btn" onClick={() => setPresetName(null)}>{t('Batal')}</button><button className="btn dark" disabled={!name || duplicate}>{t('Tambahkan ke daftar')}</button></div>
      </form>
    </Modal>}
  </div>;
}
