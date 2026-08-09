/**
 * Minimal hand-rolled PDF generator — no external dependency, same
 * reasoning as csv.ts (no PDF library needed at this scale). Produces a
 * simple multi-page report: a title, then one or more sections, each a
 * heading followed by a left-aligned table drawn at fixed column
 * x-positions. This is a data export, not a general layout engine — no
 * text wrapping, no font-metric-based centering. Good enough to close the
 * "no PDF export" gap noted in docs/DECISIONS.md and web/README.md.
 */

const PAGE_WIDTH = 612; // US Letter, points (72pt/inch)
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const LINE_HEIGHT = 16;
const FONT_SIZE = 9;
const HEADING_FONT_SIZE = 13;
const TITLE_FONT_SIZE = 18;

export interface PdfSection {
  heading: string;
  columns: string[];
  /** Column widths in points, laid out left-to-right starting at the left margin. */
  columnWidths: number[];
  rows: (string | number)[][];
}

function escapePdfText(value: string): string {
  // Helvetica here only covers WinAnsi-ish text; strip anything outside
  // printable ASCII rather than risk corrupting the content stream.
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7e]/g, "?");
}

interface TextFragment {
  x: number;
  y: number;
  size: number;
  bold?: boolean;
  text: string;
}

function layoutPages(title: string, sections: PdfSection[]): TextFragment[][] {
  const pages: TextFragment[][] = [[]];
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    pages.push([]);
    y = PAGE_HEIGHT - MARGIN;
  };
  const currentPage = () => pages[pages.length - 1];
  const ensureSpace = (need: number) => {
    if (y - need < MARGIN) newPage();
  };
  const addLine = (x: number, size: number, text: string) => {
    currentPage().push({ x, y, size, text: escapePdfText(text) });
  };

  addLine(MARGIN, TITLE_FONT_SIZE, title);
  y -= LINE_HEIGHT * 2;

  for (const section of sections) {
    ensureSpace(LINE_HEIGHT * 3);
    addLine(MARGIN, HEADING_FONT_SIZE, section.heading);
    y -= LINE_HEIGHT * 1.5;

    if (section.rows.length === 0) {
      addLine(MARGIN, FONT_SIZE, "No data yet.");
      y -= LINE_HEIGHT * 2;
      continue;
    }

    ensureSpace(LINE_HEIGHT);
    let x = MARGIN;
    section.columns.forEach((col, i) => {
      addLine(x, FONT_SIZE, col);
      x += section.columnWidths[i] ?? 60;
    });
    y -= LINE_HEIGHT;

    for (const row of section.rows) {
      ensureSpace(LINE_HEIGHT);
      x = MARGIN;
      row.forEach((cell, i) => {
        addLine(x, FONT_SIZE, String(cell));
        x += section.columnWidths[i] ?? 60;
      });
      y -= LINE_HEIGHT;
    }

    y -= LINE_HEIGHT;
  }

  return pages;
}

export function buildPdf(title: string, sections: PdfSection[]): Buffer {
  const pages = layoutPages(title, sections);

  // Object 1: Catalog, 2: Pages, 3: Font. Then one Page + one Content
  // object per page, ids assigned in ascending order starting at 4 — the
  // xref table below depends on objects being serialized in exactly this
  // ascending id order.
  const objects: string[] = [];
  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];
  let nextId = 4;
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(nextId++);
    contentObjIds.push(nextId++);
  }

  const kids = pageObjIds.map((id) => `${id} 0 R`).join(" ");

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);
  objects.push(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  pages.forEach((fragments, i) => {
    const pageId = pageObjIds[i];
    const contentId = contentObjIds[i];

    let stream = "BT\n";
    for (const f of fragments) {
      stream += `/F1 ${f.size} Tf\n1 0 0 1 ${f.x.toFixed(2)} ${f.y.toFixed(2)} Tm\n(${f.text}) Tj\n`;
    }
    stream += "ET\n";

    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf-8")} >>\nstream\n${stream}endstream\nendobj\n`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += obj;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf-8");
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += xref;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf-8");
}

export function pdfResponse(filename: string, pdf: Buffer): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
