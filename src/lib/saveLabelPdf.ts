import { PDFDocument, rgb } from 'pdf-lib';
import { toPng } from 'html-to-image';
import { paperSize, labelDocumentName, type Entry } from './data';

// Render only a copy of the label, independent of preview zoom and mobile tab visibility.
export async function saveLabelPdf(entry: Entry, label: HTMLElement) {
  const page = paperSize(entry.format, entry.customPaper);
  const width = entry.format === 'custom' ? Math.min(page.width, page.height * 2 / 3) : 100;
  const height = width * 1.5;
  const x = entry.format === 'a4' ? 10 : (page.width - width) / 2;
  const top = entry.format === 'a4' ? 10 : (page.height - height) / 2;
  const pt = (mm: number) => mm * 72 / 25.4;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none';
  Object.assign(label.style, { width: `${width}mm`, height: `${height}mm`, border: 'none', boxShadow: 'none' });
  host.append(label); document.body.append(host);
  try {
    await document.fonts.ready;
    const pixels = Math.min(300 / 96, 4096 / label.getBoundingClientRect().height);
    const image = await toPng(label, { backgroundColor: '#ffffff', pixelRatio: pixels });
    const pdf = await PDFDocument.create();
    const title = labelDocumentName(entry);
    pdf.setTitle(title);
    const artwork = await pdf.embedPng(image);
    for (let i = 0; i < Math.max(1, Math.min(20, entry.copies)); i++) {
      const sheet = pdf.addPage([pt(page.width), pt(page.height)]);
      const box = { x: pt(x), y: pt(page.height - top - height), width: pt(width), height: pt(height) };
      sheet.drawImage(artwork, box);
      if (entry.format === 'a4') sheet.drawRectangle({ ...box, borderColor: rgb(.67,.67,.67), borderWidth: pt(.2), borderDashArray: [2,2] });
    }
    const bytes = await pdf.save();
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${title}.pdf`;
    document.body.append(link);
    try { link.click(); } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60000); }
  } finally { host.remove(); }
}
