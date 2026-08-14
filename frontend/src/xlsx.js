/*
 * KÜÇÜK XLSX YAZICI — tek sayfalık tablo için, bağımlılıksız.
 *
 * Neden CSV değil: teknik özellikleri CSV olarak indirince Excel her açılışta
 * "bu biçimde bazı özellikler kaybolabilir" uyarısı veriyor, sütun genişlikleri
 * yok, "1.920 x 480" gibi değerleri kendi kafasına göre sayı/tarih sanabiliyor.
 * Gerçek bir .xlsx'te bunların hiçbiri olmuyor.
 *
 * Neden hazır kütüphane değil: xlsx/exceljs projede yok ve tek bir tablo için
 * yüzlerce kilobayt bağımlılık eklemeye değmez. Bir .xlsx zaten sıkıştırılmış
 * bir ZIP içinde birkaç XML dosyasıdır; aşağıdaki yazıcı dosyaları SIKIŞTIRMADAN
 * (store, method 0) paketler — tablo birkaç kilobayt olduğu için sıkıştırmanın
 * kazancı yok, kodun yarısı ise deflate'e gidecekti.
 */

// ---- ZIP (store-only) ----

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zipStore(files) {
  const enc = new TextEncoder()
  const parts = []
  const central = []
  let offset = 0

  const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff]
  const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]

  for (const { name, data } of files) {
    const nameBytes = enc.encode(name)
    const body = typeof data === 'string' ? enc.encode(data) : data
    const crc = crc32(body)

    // Yerel başlık. Tarih/saat alanları 0 bırakılıyor: Excel bakmıyor ve
    // sabit değer, aynı içerikten hep aynı dosyanın çıkmasını sağlıyor.
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(body.length), ...u32(body.length),
      ...u16(nameBytes.length), ...u16(0),
      ...nameBytes,
    ])
    parts.push(local, body)

    central.push(new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(body.length), ...u32(body.length),
      ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0),
      ...u32(offset),
      ...nameBytes,
    ]))
    offset += local.length + body.length
  }

  const centralSize = central.reduce((a, c) => a + c.length, 0)
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(files.length), ...u16(files.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ])

  return new Blob([...parts, ...central, end], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ---- XLSX ----

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Excel XML'i denetim karakterlerinde dosyayı bozuk sayıyor
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')

const colName = (i) => {
  let s = ''
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s
  return s
}

/**
 * Satır dizisini tek sayfalık .xlsx Blob'una çevirir.
 *
 * @param {Array<Array<string|number>>} rows Ilk satır başlık kabul edilir.
 * @param {{ sheetName?: string, colWidths?: number[] }} [opts]
 */
export function rowsToXlsxBlob(rows, opts = {}) {
  const sheetName = (opts.sheetName || 'Sayfa1').slice(0, 31).replace(/[[\]:*?/\\]/g, '-')
  const widths = opts.colWidths || []

  const sheetRows = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) => {
          const ref = `${colName(c)}${r + 1}`
          // Sayı gibi görünen ama sayı OLMAYAN değerler (belge no, "1.920 x 480",
          // model kodu) metin olarak yazılıyor; yoksa Excel onları biçimlendirip
          // bozuyor. Sayı sayılması için gerçekten sayı tipinde olması gerekiyor.
          if (typeof v === 'number' && Number.isFinite(v))
            return `<c r="${ref}"><v>${v}</v></c>`
          // t="inlineStr": paylaşılan dizge tablosu gerekmiyor, dosya tek parça kalıyor
          const style = r === 0 ? ' s="1"' : ''
          return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(v)}</t></is></c>`
        })
        .join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')

  const cols = widths.length
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    cols +
    `<sheetData>${sheetRows}</sheetData></worksheet>`

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`

  // Tek biçem: başlık satırı kalın. (s="1" bu xf'e denk gelir.)
  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="1"><fill><patternFill patternType="none"/></fill></fills>` +
    `<borders count="1"><border/></borders>` +
    `<cellStyleXfs count="1"><xf/></cellStyleXfs>` +
    `<cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" applyFont="1"/></cellXfs>` +
    `</styleSheet>`

  return zipStore([
    {
      name: '[Content_Types].xml',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    },
    {
      name: '_rels/.rels',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    },
    { name: 'xl/workbook.xml', data: workbook },
    { name: 'xl/styles.xml', data: styles },
    { name: 'xl/worksheets/sheet1.xml', data: sheet },
  ])
}
