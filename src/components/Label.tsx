import type { CSSProperties } from "react";
import { Package, Phone } from "lucide-react";
import { t } from "../lib/language";
import { type Address, type Entry, streetLine, placeLine, paperSize } from "../lib/data";
function AddressLines({ a, showAddressType = true }: { a: Address; showAddressType?: boolean }) {
  const { officeHousingName, ...address } = a;
  const place = placeLine(a).trim();
  return (
    <>
      <strong className="label-name">{a.name || t("Nama penerima")}</strong>
      <div className="label-phone">
        <Phone size={10} />
        {a.phone || t("Nomor telepon")}
      </div>
      {showAddressType && a.tag && <p><strong>{t(a.tag)}</strong></p>}
      {officeHousingName?.trim() && <p>{officeHousingName.trim()}</p>}
      <p>{streetLine(address) || t("Alamat jalan, gedung, RT/RW")}</p>
      {(a.village || a.district) && (
        <p>
          {[
            a.village && `Kel. ${a.village}`,
            a.district && `Kec. ${a.district}`,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
      {place && <p className="label-city">{place}</p>}
    </>
  );
}
export function Label({ entry: e }: { entry: Entry }) {
  const reference = e.reference || e.id;
  const length =
    [e.sender, e.recipient].reduce(
      (n, a) =>
        n +
        streetLine(a).length +
        placeLine(a).length +
        a.name.length +
        a.district.length +
        a.village.length,
      0,
    ) + e.note.length;
  const size = paperSize(e.format, e.customPaper);
  const custom = e.format === "custom";
  const label = (
    <div className={"paper-label " + (length > 480 ? "dense" : "")} style={custom ? {width: `${Math.min(100, size.height / size.width * 200 / 3)}%`} : undefined}>
      <div className="label-inner" style={{'--label-text-scale': Math.max(80, Math.min(125, e.fontSizePercent ?? 100)) / 100} as CSSProperties}>
        <div className="label-heading">
          <Package />
          <strong>{t("LABEL PENGIRIMAN")}</strong>
          <b>IDN</b>
        </div>
        <div className="label-from">
          <span className="label-overline">{t("DARI / PENGIRIM")}</span>
          <AddressLines a={e.sender} showAddressType={e.showAddressType} />
        </div>
        <div className="label-to">
          <span className="label-overline">{t("KEPADA / PENERIMA")}</span>
          <AddressLines a={e.recipient} showAddressType={e.showAddressType} />
        </div>
        {e.note && (
          <div className="label-note">
            <b>{t("Catatan")}</b>
            <p>{e.note}</p>
          </div>
        )}
        {e.showLabelNumber !== false && <div className="label-reference">{reference}</div>}
        <div className="label-bottom" style={e.showLabelNumber === false ? { marginTop: 'auto' } : undefined}>
          <strong>Labelin.</strong>
          <span>{t("Referensi pribadi · bukan resi")}</span>
        </div>
      </div>
    </div>
  );
  return custom ? <div className="custom-paper" style={{aspectRatio: `${size.width} / ${size.height}`}}>{label}</div> : label;
}
