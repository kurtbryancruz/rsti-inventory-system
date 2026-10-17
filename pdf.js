// Builds the A4 pull-out PDF for a release (server side, so it is a real PDF file).
const PDFDocument = require('pdfkit');

const BLUE = '#2660a2', INK = '#14263d', MUT = '#5d6f86', LINE = '#c9d5e3', HEAD = '#eef3f9';
const num = n => Number(n).toLocaleString('en');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
const crypto = require('crypto');

// Signature photos usually have a lot of empty margin, which makes the signature look tiny.
// Decode the image, find where the ink is, cut everything else away and make the paper
// background transparent, so the signature can be drawn big and sit right on the line.
const sigCache = new Map();
function prepSig(dataUrl) {
  const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  const key = crypto.createHash('md5').update(dataUrl).digest('hex');
  if (sigCache.has(key)) return sigCache.get(key);
  const raw = Buffer.from(m[2], 'base64');
  let out = raw;
  try {
    const im = m[1] === 'png' ? PNG.sync.read(raw) : jpeg.decode(raw, { useTArray: true, formatAsRGBA: true });
    const { width: W, height: H, data: d } = im;
    // Paper colour: the average of the four corners, unless they are transparent.
    const cs = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].map(([x, y]) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; });
    const clear = cs.filter(c => c[3] < 30).length >= 2;
    const bg = [0, 1, 2].map(k => cs.reduce((a, c) => a + c[k], 0) / 4);
    // How much each pixel is "ink" (0-255): transparent paper -> its alpha, solid paper -> distance from the paper colour.
    const ink = i => clear ? d[i + 3] : Math.min(255, Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])) * 2);
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ink((y * W + x) * 4) > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 >= x0 && y1 >= y0) {
      const pad = 2; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
      const w = x1 - x0 + 1, h = y1 - y0 + 1, o = new PNG({ width: w, height: h });
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = ((y + y0) * W + (x + x0)) * 4, j = (y * w + x) * 4, a = ink(i);
        o.data[j] = d[i]; o.data[j + 1] = d[i + 1]; o.data[j + 2] = d[i + 2]; o.data[j + 3] = a < 25 ? 0 : clear ? d[i + 3] : a;
      }
      out = PNG.sync.write(o);
    }
  } catch (e) { out = raw; }   // could not read it: use the picture as it is
  sigCache.set(key, out);
  if (sigCache.size > 50) sigCache.delete(sigCache.keys().next().value);
  return out;
}
const img = d => { const m = /^data:image\/(?:png|jpeg);base64,(.+)$/.exec(d || ''); return m ? Buffer.from(m[1], 'base64') : null; };

// r: release data (see GET /api/releases/:id). Returns a PDFDocument stream; the caller pipes it.
function releasePdf(r, company) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: 'Pull-out PO-' + String(r.id).padStart(6, '0'), Author: company } });
  const L = 40, W = doc.page.width - 80, B = doc.page.height - 50;
  const no = 'PO-' + String(r.id).padStart(6, '0');
  const when = new Date(r.t).toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' });

  // Header
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(18).text(company, L, 40, { width: W - 150 });
  doc.fillColor(INK).font('Helvetica').fontSize(11).text('Stock pull-out form', L, doc.y + 2);
  doc.font('Helvetica-Bold').fontSize(13).text(no, L, 40, { width: W, align: 'right' });
  doc.font('Helvetica').fontSize(9.5).fillColor(MUT).text(when, L, 58, { width: W, align: 'right' });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5).text('Status: APPROVED', L, 72, { width: W, align: 'right' });
  const hy = Math.max(doc.y, 92) + 4;
  doc.moveTo(L, hy).lineTo(L + W, hy).lineWidth(1.5).strokeColor(BLUE).stroke();

  // Details block (label above value)
  let y = hy + 14;
  const field = (label, value, x, w, big) => {
    doc.fillColor(MUT).font('Helvetica').fontSize(8.5).text(label.toUpperCase(), x, y, { width: w });
    doc.fillColor(INK).font(big ? 'Helvetica-Bold' : 'Helvetica').fontSize(11).text(value || '-', x, doc.y + 1, { width: w });
    return doc.y;
  };
  const half = (W - 20) / 2;
  let a = field('Transaction type', r.type, L, half, true), b = field('Client or reference', r.c, L + half + 20, half);
  y = Math.max(a, b) + 10;
  if (r.target) { y = field('Blended into (finished product)', r.target, L, W, true) + 10; }
  y = field('Purpose / notes', r.n, L, W) + 10;
  a = field('Requested by', r.req_name, L, half, true); b = field('Approved by', r.rel_name + (r.same ? ' (admin, self-approved)' : ''), L + half + 20, half, true);
  y = Math.max(a, b) + 16;

  // Items table
  const rp = r.items.some(i => i.into);
  const cols = rp
    ? [['#', 24, 'left'], ['Item', 150, 'left'], ['SKU', 80, 'left'], ['Warehouse', 80, 'left'], ['Quantity', 70, 'right'], ['Repacked into', 0, 'left']]
    : [['#', 24, 'left'], ['Item', 200, 'left'], ['SKU', 100, 'left'], ['Warehouse', 100, 'left'], ['Quantity', 0, 'right']];
  const used = cols.reduce((s, c) => s + c[1], 0);
  cols[cols.length - 1][1] = W - used;
  const pad = 5;
  const row = (cells, head) => {
    doc.font(head ? 'Helvetica-Bold' : 'Helvetica').fontSize(head ? 8.5 : 10);
    const h = Math.max(...cells.map((t, k) => doc.heightOfString(String(t), { width: cols[k][1] - pad * 2 }))) + pad * 2;
    if (y + h > B) { doc.addPage(); y = 40; }
    let x = L;
    cells.forEach((t, k) => {
      if (head) doc.rect(x, y, cols[k][1], h).fillAndStroke(HEAD, LINE); else doc.rect(x, y, cols[k][1], h).strokeColor(LINE).lineWidth(0.7).stroke();
      doc.fillColor(INK).text(String(t), x + pad, y + pad, { width: cols[k][1] - pad * 2, align: cols[k][2] });
      x += cols[k][1];
    });
    y += h;
  };
  row(cols.map(c => c[0]), true);
  r.items.forEach((i, k) => row(rp ? [k + 1, i.n, i.sku || '-', i.w || '-', `${num(i.q)} ${i.u}`, i.into || '-'] : [k + 1, i.n, i.sku || '-', i.w || '-', `${num(i.q)} ${i.u}`]));
  doc.fillColor(MUT).font('Helvetica').fontSize(9).text(`${r.items.length} item${r.items.length === 1 ? '' : 's'} released`, L, y + 6, { width: W });
  y = doc.y + 30;

  // Signatures: requested by, approved by, received by.
  // From top to bottom: the signature (cropped, centred), 5 pt of space, the printed name, the line, then the role.
  // The signature is 25% smaller than the full box so it never touches the name.
  const SIG_H = 46, GAP = 5, NAME_H = 14;
  if (y + SIG_H + GAP + NAME_H + 45 > B) { doc.addPage(); y = 40; }
  y += 20;
  const gap = 24, sw = (W - gap * 2) / 3;
  const sig = (x, name, role, sigImg) => {
    const buf = prepSig(sigImg), nameY = y + SIG_H + GAP, ly = nameY + NAME_H;
    if (buf) { try { doc.image(buf, x + (sw - (sw - 12) * 0.75) / 2, y, { fit: [(sw - 12) * 0.75, SIG_H], align: 'center', valign: 'bottom' }); } catch (e) { /* bad image: leave it out */ } }
    if (name) {
      let fs = 10; doc.font('Helvetica-Bold');
      while (fs > 7 && doc.fontSize(fs).widthOfString(name) > sw) fs -= 0.5;   // long names shrink to fit on one line
      doc.fillColor(INK).fontSize(fs).text(name, x, nameY, { width: sw, align: 'center', lineBreak: false });
    }
    doc.moveTo(x, ly).lineTo(x + sw, ly).lineWidth(0.8).strokeColor(INK).stroke();
    doc.fillColor(MUT).font('Helvetica').fontSize(8.5).text(role, x, ly + 4, { width: sw, align: 'center' });
  };
  sig(L, r.req_name, 'Requested by', r.req_sig);
  sig(L + sw + gap, r.rel_name, r.same ? 'Approved by (admin)' : 'Approved and released by (admin)', r.rel_sig);
  sig(L + (sw + gap) * 2, '', 'Received by (signature over printed name)', '');
  return doc;
}
module.exports = { releasePdf };
