// Derived from prospector-contrato/references/gerar-docx.py.
// Reimplemented in pure Node so the protected web CRM returns the same Word artifact
// without Python and without a new dependency: a minimal OOXML package inside a stored ZIP.
export const contractDocxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const escapeXml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
const text = (value) => String(value ?? "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
const money = (value) => { const amount = Number(value); return Number.isFinite(amount) ? amount.toFixed(2) : String(value ?? ""); };
const stamp = (value) => { const date = new Date(String(value ?? "")); return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10); };

export function contractDocxFilename(contractId) {
  const safe = String(contractId ?? "").replace(/[^A-Za-z0-9._-]+/g, "").replace(/^\.+/, "");
  return `contrato-${safe || "dattaseller"}.docx`;
}

const run = (value, { bold = false, halfPoints = 22 } = {}) => `<w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${halfPoints}"/><w:szCs w:val="${halfPoints}"/></w:rPr><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`;
const paragraph = (value, options) => `<w:p>${run(value, options)}</w:p>`;
const block = (label, value) => text(value).map((line, index) => paragraph(index === 0 ? `${label}: ${line}` : line));

function documentXml(fields) {
  const body = [
    paragraph("Contrato de prestação de serviços", { bold: true, halfPoints: 32 }),
    ...block("Cliente", fields.clientName),
    ...(text(fields.company).length ? block("Empresa", fields.company) : []),
    ...(text(fields.city).length ? block("Cidade", fields.city) : []),
    ...block("Oferta", fields.offerName),
    paragraph(`Valor: ${String(fields.currency ?? "").trim()} ${money(fields.value)}`),
    ...block("Condições", fields.terms && text(fields.terms).length ? fields.terms : "a confirmar"),
    paragraph(`Situação: ${fields.status}`),
    picture(fields),
    paragraph("Documento gerado pelo fluxo DattaSeller. Revisão humana obrigatória antes da assinatura.", { halfPoints: 18 }),
  ].filter(Boolean);
  return `${XML_HEADER}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418"/></w:sectPr></w:body></w:document>`;
}

function picture(fields) {
  const parts = [fields.sellerName && `Operador: ${fields.sellerName}`, stamp(fields.generatedAt) && `Emitido em ${stamp(fields.generatedAt)}`, fields.reference && `Referência ${fields.reference}`].filter(Boolean);
  return parts.length ? paragraph(parts.join(" · "), { halfPoints: 18 }) : "";
}

const CONTENT_TYPES = `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
const ROOT_RELS = `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (0xedb88320 ^ (value >>> 1)) >>> 0 : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => { let value = 0xffffffff; for (let index = 0; index < bytes.length; index += 1) value = CRC_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; };
const encode = (value) => new TextEncoder().encode(value);
const concat = (chunks) => { const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0), merged = new Uint8Array(total); let at = 0; for (const chunk of chunks) { merged.set(chunk, at); at += chunk.length; } return merged; };

// Stored (uncompressed) entries keep the writer deterministic: no zlib, no timestamp drift.
function zipStore(entries) {
  const chunks = [], central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encode(entry.name), data = encode(entry.xml), crc = crc32(data), size = data.length;
    const local = new Uint8Array(30 + name.length), localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); localView.setUint16(4, 20, true); localView.setUint16(6, 0x0800, true); localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true); localView.setUint16(12, 0x0021, true);
    localView.setUint32(14, crc, true); localView.setUint32(18, size, true); localView.setUint32(22, size, true);
    localView.setUint16(26, name.length, true); localView.setUint16(28, 0, true);
    local.set(name, 30);
    chunks.push(local, data);
    const directory = new Uint8Array(46 + name.length), directoryView = new DataView(directory.buffer);
    directoryView.setUint32(0, 0x02014b50, true); directoryView.setUint16(4, 20, true); directoryView.setUint16(6, 20, true);
    directoryView.setUint16(8, 0x0800, true); directoryView.setUint16(10, 0, true);
    directoryView.setUint16(12, 0, true); directoryView.setUint16(14, 0x0021, true);
    directoryView.setUint32(16, crc, true); directoryView.setUint32(20, size, true); directoryView.setUint32(24, size, true);
    directoryView.setUint16(28, name.length, true); directoryView.setUint32(42, offset, true);
    directory.set(name, 46);
    central.push(directory);
    offset += local.length + size;
  }
  const end = new Uint8Array(22), endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true); endView.setUint16(10, entries.length, true);
  endView.setUint32(12, central.reduce((sum, chunk) => sum + chunk.length, 0), true); endView.setUint32(16, offset, true);
  return concat([...chunks, ...central, end]);
}

export function renderContractDocx(fields = {}) {
  const document = { clientName: fields.clientName ?? "", company: fields.company, city: fields.city, offerName: fields.offerName ?? "", currency: fields.currency ?? "", value: fields.value, terms: fields.terms, status: fields.status ?? "generated", sellerName: fields.sellerName, generatedAt: fields.generatedAt, reference: fields.reference };
  return zipStore([
    { name: "[Content_Types].xml", xml: CONTENT_TYPES },
    { name: "_rels/.rels", xml: ROOT_RELS },
    { name: "word/document.xml", xml: documentXml(document) },
  ]);
}
