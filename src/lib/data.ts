import { locale, t } from "./language";
export type Address = {
  id: string;
  name: string;
  phone: string;
  officeHousingName?: string;
  street: string;
  building: string;
  rt: string;
  rw: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postal: string;
  tag: string;
  color: string;
};
export type Format = "thermal" | "a4" | "custom";
export type PaperUnit = "mm" | "in";
// Physical sizes are always stored in mm. The unit is a display preference.
export type PaperSize = { width: number; height: number; unit?: PaperUnit; template?: string; name?: string };
export type SavedPaperSize = PaperSize & { id: string; name: string; unit: PaperUnit };
export const paperTemplates = [
  { id: 'a5', name: 'A5', width: 148, height: 210, unit: 'mm' },
  { id: 'a6', name: 'A6', width: 105, height: 148, unit: 'mm' },
  { id: 'letter', name: 'US Letter', width: 215.9, height: 279.4, unit: 'in' },
  { id: '4x6', name: 'Thermal 4 × 6', width: 101.6, height: 152.4, unit: 'in' },
  { id: '4x4', name: 'Thermal 4 × 4', width: 101.6, height: 101.6, unit: 'in' },
  { id: '3x2', name: 'Thermal 3 × 2', width: 76.2, height: 50.8, unit: 'in' },
  { id: '80x100', name: 'Thermal 80 × 100', width: 80, height: 100, unit: 'mm' },
  { id: 'a7', name: 'A7', width: 74, height: 105, unit: 'mm' },
  { id: 'legal', name: 'US Legal', width: 215.9, height: 355.6, unit: 'in' },
  { id: '2x3', name: 'Thermal 2 × 3', width: 50.8, height: 76.2, unit: 'in' },
  { id: '4x8', name: 'Thermal 4 × 8', width: 101.6, height: 203.2, unit: 'in' },
  { id: '58x100', name: 'Thermal 58 × 100', width: 58, height: 100, unit: 'mm' },
] as const;
export const templateName = (size?: PaperSize) => paperTemplates.find(p => p.id === size?.template)?.name || size?.name;
export const defaultPaper: PaperSize = { width: 100, height: 150 };
export const paperSize = (f: Format, custom?: PaperSize): PaperSize => {
  const fixed = f === "a4" ? { width: 210, height: 297 } : defaultPaper;
  if (f === "custom" && custom && [custom.width, custom.height].every(n => Number.isFinite(n) && n >= 20 && n <= 1000)) return custom;
  return custom?.width === fixed.width && custom.height === fixed.height ? { ...fixed, unit: custom.unit } : fixed;
};
export const dimensionText = (size: PaperSize) => {
  const factor = size.unit === 'in' ? 25.4 : 1;
  const n = (v: number) => Number((v / factor).toFixed(4));
  return `${n(size.width)} × ${n(size.height)} ${size.unit || 'mm'}`;
};
export const orientationText = (size: PaperSize) => t(size.width > size.height ? "Lanskap" : size.width === size.height ? "Persegi" : "Potret");
export type Entry = {
  id: string;
  showAddressType?: boolean;
  showLabelNumber?: boolean;
  fontSizePercent?: number;
  reference?: string;
  date: string;
  sender: Address;
  recipient: Address;
  format: Format;
  customPaper?: PaperSize;
  copies: number;
  note: string;
};
export const labelDocumentName = (entry: Entry) => {
  const name = entry.recipient.name.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, " ").trim();
  return `Labelin - ${name || entry.id}`;
};
export type Store = {
  drafts?: Entry[];
  paperPresets?: SavedPaperSize[];
  cleanStart?: true;
  addresses: Address[];
  senders: Address[];
  defaultSender: string;
  format: Format;
  customPaper?: PaperSize;
  history: Entry[];
};
export type User = {
  cloudId?: string;
  name: string;
  email: string;
  provider: "local" | "google";
};
export const blank = (): Address => ({
  id: crypto.randomUUID(),
  name: "",
  phone: "",
  street: "",
  building: "",
  rt: "",
  rw: "",
  village: "",
  district: "",
  city: "",
  province: "",
  postal: "",
  tag: "Rumah",
  color: "lilac",
});
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
export const streetLine = (a: Address) =>
  [
    a.officeHousingName?.trim(),
    a.street,
    a.building,
    [a.rt && `RT ${a.rt}`, a.rw && `RW ${a.rw}`].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(", ");
export const placeLine = (a: Address) =>
  [a.city, a.province].filter(Boolean).join(", ") +
  (a.postal ? " " + a.postal : "");
export const formatName = (f: Format, custom?: PaperSize) =>
  `${f === "custom" ? (templateName(custom) || t('Khusus')) + ' · ' : f === 'thermal' ? 'Thermal ' : 'A4 · '}${dimensionText(paperSize(f, custom))}`;
export const provinces =
  "Aceh|Sumatera Utara|Sumatera Barat|Riau|Kepulauan Riau|Jambi|Sumatera Selatan|Kepulauan Bangka Belitung|Bengkulu|Lampung|DKI Jakarta|Banten|Jawa Barat|Jawa Tengah|DI Yogyakarta|Jawa Timur|Bali|Nusa Tenggara Barat|Nusa Tenggara Timur|Kalimantan Barat|Kalimantan Tengah|Kalimantan Selatan|Kalimantan Timur|Kalimantan Utara|Sulawesi Utara|Gorontalo|Sulawesi Tengah|Sulawesi Barat|Sulawesi Selatan|Sulawesi Tenggara|Maluku|Maluku Utara|Papua|Papua Barat|Papua Selatan|Papua Tengah|Papua Pegunungan|Papua Barat Daya".split(
    "|",
  );
const person = (
  id: string,
  name: string,
  street: string,
  city: string,
  province: string,
  postal: string,
  tag: string,
  color: string,
  rt: string,
  rw: string,
  phone: string,
): Address => ({
  ...blank(),
  id,
  name,
  street,
  city,
  province,
  postal,
  tag,
  color,
  rt,
  rw,
  phone,
});
// Used only to identify untouched records from the old demo, never to populate a workspace.
function legacyDemo(): Store {
  const addresses = [
    person(
      "nadia",
      "Nadia Putri",
      "Jl. Melati No. 24",
      "Bandung",
      "Jawa Barat",
      "40123",
      "Rumah",
      "lilac",
      "002",
      "004",
      "0812 3456 7801",
    ),
    person(
      "bima",
      "Bima Pratama",
      "Jl. Jenderal Sudirman Kav. 52",
      "Jakarta Selatan",
      "DKI Jakarta",
      "12190",
      "Kantor",
      "peach",
      "005",
      "003",
      "0813 2345 6702",
    ),
    person(
      "siti",
      "Siti Rahma",
      "Jl. Kaliurang Km. 5 No. 12",
      "Sleman",
      "DI Yogyakarta",
      "55281",
      "Rumah",
      "mint",
      "003",
      "002",
      "0857 4567 8903",
    ),
    person(
      "dimas",
      "Dimas Saputra",
      "Jl. Raya Darmo No. 86",
      "Surabaya",
      "Jawa Timur",
      "60264",
      "Rumah",
      "blue",
      "004",
      "006",
      "0812 6789 0104",
    ),
    person(
      "rina",
      "Rina Lestari",
      "Jl. Diponegoro No. 18",
      "Semarang",
      "Jawa Tengah",
      "50241",
      "Kantor",
      "pink",
      "002",
      "001",
      "0821 2345 6705",
    ),
    person(
      "adi",
      "Adi Nugroho",
      "Jl. Ahmad Yani No. 7",
      "Malang",
      "Jawa Timur",
      "65125",
      "Rumah",
      "sand",
      "003",
      "007",
      "0813 4567 8906",
    ),
    person(
      "dewi",
      "Dewi Anggraini",
      "Jl. Teuku Umar No. 20",
      "Denpasar",
      "Bali",
      "80114",
      "Lainnya",
      "lilac",
      "001",
      "004",
      "0852 5678 9007",
    ),
    person(
      "rizky",
      "Rizky Maulana",
      "Jl. Gatot Subroto No. 11",
      "Medan",
      "Sumatera Utara",
      "20112",
      "Kantor",
      "mint",
      "003",
      "008",
      "0812 7890 1208",
    ),
  ];
  const senders = [
    person(
      "alya",
      "Alya Ramadhani",
      "Jl. Cipete Raya No. 18",
      "Jakarta Selatan",
      "DKI Jakarta",
      "12410",
      "Rumah",
      "lime",
      "003",
      "005",
      "0812 3456 7890",
    ),
    person(
      "studio",
      "Studio Alya",
      "Jl. Kemang Selatan No. 8",
      "Jakarta Selatan",
      "DKI Jakarta",
      "12560",
      "Kantor",
      "peach",
      "002",
      "003",
      "0812 3456 7891",
    ),
  ];
  senders[0].village = "Cipete Selatan";
  senders[0].district = "Cilandak";
  addresses[1].building = "Gedung B, Lantai 3";
  return {
    addresses,
    senders,
    defaultSender: "alya",
    format: "thermal",
    history: Array.from({ length: 12 }, (_, i) => ({
      id: `LBL-${String(1024 - i)}`,
      date: new Date(Date.now() - i * 86400000 - 3600000).toISOString(),
      sender: senders[0],
      recipient: addresses[i % 8],
      format: i % 3 === 2 ? "a4" : "thermal",
      copies: (i % 3) + 1,
      note: "",
    })),
  };
}
export function load<T>(key: string, fallback: () => T): T {
  try {
    const v = localStorage.getItem("labelin:" + key);
    return v ? JSON.parse(v) : fallback();
  } catch {
    return fallback();
  }
}
export const save = (key: string, value: unknown) =>
  localStorage.setItem("labelin:" + key, JSON.stringify(value));
export async function persistSnapshot(key: string, value: unknown) {
  try {
    const serialized = JSON.stringify(value);
    if (localStorage.getItem('labelin:'+key) !== serialized) {
      localStorage.setItem('labelin:'+key,serialized);
      window.dispatchEvent(new CustomEvent('labelin:local-write', { detail: key }));
    }
    return true;
  } catch {
    return false;
  }
}
export const workspaceId = (u: User | null) =>
  u?.cloudId ? `cloud:${u.cloudId}` : u ? `${u.provider}:${u.email}` : "demo";
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function readSession(): User | null {
  const u = load<User | null>("session", () => null);
  return u && typeof u.email === "string" && u.email.trim() && typeof u.name === "string" &&
    (u.provider === "local" || u.provider === "google") ? u : null;
}
export const makeEntry = (s: Store, recipient?: Address): Entry => ({
  id: "LBL-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
  date: new Date().toISOString(),
  sender: {
    ...(s.senders.find((a) => a.id === s.defaultSender) ||
      s.senders[0] ||
      blank()),
  },
  recipient: { ...(recipient || blank()) },
  format: s.format,
  customPaper: s.customPaper,
  copies: 1,
  note: "",
});
export function getStore(user: User | null) {
  const saved = load<Store | null>("workspace:" + workspaceId(user), () => null);
  if (!saved) return { addresses: [], senders: [], defaultSender: "", format: "thermal", history: [], cleanStart: true } satisfies Store;
  if (user || saved.cleanStart) return saved;
  // Keep the old guest storage key, real contacts, edited examples, drafts, and preferences.
  const demo = legacyDemo();
  const unchanged = (a: Address, b: Address) => (Object.keys(b) as (keyof Address)[]).every(k => a[k] === b[k]);
  const addresses = saved.addresses.filter(a => !demo.addresses.some(b => unchanged(a, b)));
  const senders = saved.senders.filter(a => !demo.senders.some(b => unchanged(a, b)));
  const history = saved.history.filter(h => !demo.history.some(b => h.id === b.id && !h.reference && h.format === b.format && h.copies === b.copies && h.note === b.note && unchanged(h.sender, b.sender) && unchanged(h.recipient, b.recipient)));
  return { ...saved, addresses, senders, history, cleanStart: true, defaultSender: senders.some(a => a.id === saved.defaultSender) ? saved.defaultSender : senders[0]?.id || "" } satisfies Store;
}
export const dateLabel = (date: string, short = false) =>
  new Intl.DateTimeFormat(locale(), {
    day: "numeric",
    month: short ? "short" : "long",
    year: "numeric",
  }).format(new Date(date));
