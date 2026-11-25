import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  ArrowUpRight,
  BookOpen,
  Check,
  House,
  Building2,
  MapPin,
  Globe2,
} from "lucide-react";
import { initials, type Address } from "../lib/data";
import { useLanguage, setLanguage, t } from "../lib/language";
export function LanguageSwitch() {
  const selected = useLanguage();
  return <div className="language-switch" role="group" aria-label="Bahasa / Language">
    <Globe2 size={13} aria-hidden="true" />
    <button type="button" lang="id" aria-label="Bahasa Indonesia (ID)" aria-pressed={selected === 'id'} onClick={() => setLanguage('id')}>ID</button>
    <button type="button" lang="en" aria-label="English (EN)" aria-pressed={selected === 'en'} onClick={() => setLanguage('en')}>English</button>
  </div>;
}
export function Logo() {
  return (
    <span className="brand">
      <img src="/favicon.svg" alt="" />
      <span>
        Labelin<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
export function Avatar({
  a,
  small = false,
}: {
  a: Pick<Address, "name" | "color">;
  small?: boolean;
}) {
  return (
    <span className={`avatar ${a.color} ${small ? "small" : ""}`}>
      {initials(a.name) || "—"}
    </span>
  );
}
export function Tag({ value }: { value: string }) {
  const I = value === "Rumah" ? House : value === "Kantor" ? Building2 : MapPin;
  return (
    <span className={"tag tag-" + value.toLowerCase()}>
      <I size={10} />
      {t(value)}
    </span>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {typeof children === 'string' ? t(children) : children}
      <ArrowUpRight size={14} />
    </button>
  );
}
export function Modal({
  title,
  sub,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-label={t(title)}
    >
      <div className="modal-head">
        <div>
          <h2>{t(title)}</h2>
          {sub && <p>{t(sub)}</p>}
        </div>
        <button className="icon-btn" onClick={onClose} title={t('Tutup')}>
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BookOpen size={26} />
      </span>
      <h3>{t(title)}</h3>
      <p>{t(detail)}</p>
      {children}
    </div>
  );
}
export function Toast({ text }: { text: string }) {
  return text ? (
    <div className="toast" role="status">
      <Check size={15} />
      {t(text)}
    </div>
  ) : null;
}
