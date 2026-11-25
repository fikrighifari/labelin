import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { type Address, provinces } from "../lib/data";
import { Modal } from "./UI";
import { t } from "../lib/language";

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const groups = (value: string) => value.match(/\d{1,4}/g)?.join("-") || "";
  if (!raw.trimStart().startsWith("+")) return groups(digits);
  if (digits.startsWith("62")) return ["+62", digits.slice(2, 5), groups(digits.slice(5))].filter(Boolean).join("-");
  return "+" + groups(digits);
}

export function Fields({
  value: a,
  onChange,
  prefix = "addr",
}: {
  value: Address;
  onChange: (a: Address) => void;
  prefix?: string;
}) {
  const set = (k: keyof Address, v: string) => onChange({ ...a, [k]: v });
  const field = (
    k: keyof Address,
    label: string,
    placeholder: string,
    required = false,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="field" htmlFor={`${prefix}-${k}`}>
      <span>
        {t(label)}
        {required && <b> *</b>}
      </span>
      <input
        id={`${prefix}-${k}`}
        value={a[k] ?? ""}
        placeholder={t(placeholder)}
        required={required}
        maxLength={100}
        onChange={(e) => set(k, e.target.value)}
        {...extra}
      />
    </label>
  );
  return (
    <div className="fields">
      <div className="field-grid">
        {field("name", "Nama lengkap", "Nama penerima atau pengirim", true)}
        {field("phone", "Nomor telepon", "0821-2305-6578", true, {
          type: "tel",
          onChange: (event) => {
            const input = event.currentTarget;
            const raw = input.value;
            const formatted = formatPhone(raw);
            let remaining = raw.slice(0, input.selectionStart ?? raw.length).replace(/[^\d+]/g, "").length;
            let caret = 0;
            while (caret < formatted.length && remaining > 0) {
              if (formatted[caret++] !== "-") remaining--;
            }
            input.value = formatted;
            input.setSelectionRange(caret, caret);
            set("phone", formatted);
          },
          onKeyDown: (event) => {
            const input = event.currentTarget;
            const pos = input.selectionStart;
            if (pos === null || pos !== input.selectionEnd) return;
            // Skip an automatic separator so deletion still removes a digit.
            if (event.key === "Backspace" && input.value[pos - 1] === "-") input.setSelectionRange(pos - 1, pos - 1);
            if (event.key === "Delete" && input.value[pos] === "-") input.setSelectionRange(pos + 1, pos + 1);
          },
          pattern: "(?=(?:[^0-9]*[0-9]){8,15}[^0-9]*$)[+0-9\\s\\-\\(\\)]{8,22}",
          title: t("Gunakan nomor telepon 8–20 karakter."),
        })}
      </div>
      {field("officeHousingName", "Nama kantor / perumahan", "Nama kantor atau perumahan")}
      <label className="field">
        <span>
          {t("Alamat jalan")} <b>*</b>
        </span>
        <textarea
          rows={2}
          required
          maxLength={200}
          value={a.street}
          placeholder={t("Nama jalan, nomor rumah")}
          onChange={(e) => set("street", e.target.value)}
        />
      </label>
      <div className="building-grid">
        {field("building", "Gedung / unit", "Gedung, lantai, unit")}
        {field("rt", "RT", "001", false, {
          inputMode: "numeric",
          pattern: "[0-9]{1,3}",
          maxLength: 3,
        })}
        {field("rw", "RW", "002", false, {
          inputMode: "numeric",
          pattern: "[0-9]{1,3}",
          maxLength: 3,
        })}
      </div>
      <div className="field-grid">
        {field("village", "Kelurahan / desa", "Kelurahan atau desa")}
        {field("district", "Kecamatan", "Nama kecamatan")}
      </div>
      <div className="field-grid">
        <label className="field">
          <span>
            {t("Provinsi")}
          </span>
          <div className="select-wrap">
            <select
              value={a.province}
              onChange={(e) => set("province", e.target.value)}
            >
              <option value="">{t("Pilih provinsi")}</option>
              {provinces.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </label>
        {field("city", "Kota / kabupaten", "Contoh: Jakarta Selatan")}
      </div>
      <div className="field-grid">
        {field("postal", "Kode pos", "5 digit kode pos", false, {
          inputMode: "numeric",
          pattern: "[0-9]{5}",
          maxLength: 5,
          title: t("Masukkan kode pos 5 digit."),
        })}
        <label className="field">
          <span>{t("Jenis alamat")}</span>
          <div className="select-wrap">
            <select value={a.tag} onChange={(e) => set("tag", e.target.value)}>
              {["Rumah", "Kantor", "Lainnya"].map(tag => <option key={tag} value={tag}>{t(tag)}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>
        </label>
      </div>
    </div>
  );
}
export function AddressModal({
  initial,
  onSave,
  onClose,
  sender = false,
  isNew = false,
}: {
  initial: Address;
  onSave: (a: Address) => void;
  onClose: () => void;
  sender?: boolean;
  isNew?: boolean;
}) {
  const [a, setA] = useState(initial);
  return (
    <Modal
      wide
      title={`${isNew ? "Tambah" : "Edit"} ${sender ? "profil pengirim" : "alamat"}`}
      sub="Lengkapi detail alamat untuk label pengiriman yang akurat."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...a, name: a.name.trim(), street: a.street.trim() });
        }}
      >
        <div className="modal-body">
          <Fields value={a} onChange={setA} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t("Batal")}
          </button>
          <button className="btn dark">
            <Check size={16} />
            {t(sender ? "Simpan profil" : "Simpan alamat")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
