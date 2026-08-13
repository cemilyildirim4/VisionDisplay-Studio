/**
 * "İndirmek" butonunun ürettiği PDF sayfası.
 *
 * NEDEN INLINE STİL: Bu düğüm html2canvas ile görüntüye çevrilir. Tailwind v4
 * renkleri `oklch()` ile üretir, html2canvas ise onu okuyamaz ve renkleri
 * bozuk çizer. Bu yüzden buradaki her renk elle hex olarak yazılmıştır —
 * kasıtlıdır, Tailwind'e çevrilmemelidir.
 *
 * Sayfa A4 dikey oranında (794 × 1123 px @ 96dpi) tasarlandı.
 */

import { DASH, fmt, computeSpecs, computeControl } from './specsData.js'
import { BRAND } from './brand.js'
import { PdfBrandHeader } from './BrandChrome.jsx'

const INK = BRAND.ink
const MUTED = BRAND.muted
const LINE = BRAND.line
const PAGE_W = 794

function Row({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        padding: '5px 0',
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <span style={{ fontSize: 11, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: INK, textAlign: 'right', whiteSpace: 'pre-line' }}>
        {value}
      </span>
    </div>
  )
}

function Group({ title, children }) {
  return (
    <div
      style={{
        breakInside: 'avoid',
        marginBottom: 12,
        border: `1px solid ${LINE}`,
        borderRadius: 8,
        padding: '10px 12px',
        background: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <span style={{ width: 3, height: 13, borderRadius: 2, background: BRAND.blue, display: 'block' }} />
        <h3 style={{ fontSize: 11.5, fontWeight: 700, color: INK, margin: 0 }}>{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  )
}

/**
 * PDF'e çevrilecek düğüm. Ekranda görünmez (ekran dışına konumlandırılır),
 * yalnızca html2canvas okur.
 */
export default function SpecsPdf({
  innerRef,
  t,
  model,
  cols,
  rows,
  sboxRedundancy,
  screenType,
  isVideoWall,
  /*
   * RAPOR BİLGİLERİ (isteğe bağlı)
   *
   * "PDF olarak dışa aktar" akışı bu belgeyi tek sayfa olarak üretiyor: eskiden
   * ayrı bir ilk sayfada duran müşteri ve yapılandırma bilgileri buraya, aynı
   * kart düzenine taşındı. İki ayrı tasarım dili yerine tek belge.
   *
   * Verilmezse (ekrandaki inceleme pop-up'ı) bu bloklar hiç basılmaz.
   */
  rapor = null,
}) {
  const s = computeSpecs(model, cols, rows)
  if (!s) return null

  const k = computeControl(model, s)
  const total = s.total
  const depthM = (model.depthMm || 0) / 1000
  const circuitText = (c) => `${c.circuits} ${t('sp.circuit')} · ${t('sp.perCircuit')}: ${c.perCircuit}`
  const today = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    // Dış kap ekran dışında; ÖLÇÜLEN düğüm içerideki normal akışlı div.
    // html2canvas sabit konumlu bir kökü yanlış ölçebiliyor (ExportModal da böyle yapar).
    <div style={{ position: 'fixed', left: -20000, top: 0, width: PAGE_W, background: '#ffffff' }}>
    <div
      ref={innerRef}
      style={{
        width: PAGE_W,
        padding: '34px 40px 28px',
        background: '#ffffff',
        color: INK,
        fontFamily: 'Poppins, system-ui, Segoe UI, Roboto, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <PdfBrandHeader
        productLine={t('sp.title')}
        right={
          <div style={{ textAlign: 'right', fontSize: 10.5, color: MUTED, lineHeight: 1.7 }}>
            <div>
              <span style={{ color: INK, fontWeight: 600 }}>{model.modelCode}</span>
            </div>
            <div>
              {cols} × {rows} · {fmt(total)} {t('sp.unit')}
            </div>
            <div>{rapor ? `${t('exp.docNo')}: ${rapor.belgeNo}` : today}</div>
            {rapor && <div>{rapor.tarih}</div>}
          </div>
        }
      />

      <div style={{ height: 18 }} />

      {/* Öne çıkan değerler */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {[
          { k: t('sp.lengthHeight'), v: `${fmt(s.W, 2)} × ${fmt(s.H, 2)} m` },
          { k: t('sp.resolution'), v: `${fmt(s.resW)} × ${fmt(s.resH)}` },
          { k: t('sp.weight'), v: `${fmt(s.weight, 1)} kg` },
          { k: t('sp.viewingDistance'), v: `${fmt(s.viewDist, 1)} m` },
        ].map((m) => (
          <div
            key={m.k}
            style={{
              flex: 1,
              background: BRAND.blueTint,
              border: `1px solid #dbe5f5`,
              borderLeft: `3px solid ${BRAND.orange}`,
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>{m.k}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: BRAND.blue, marginTop: 3 }}>{m.v}</div>
          </div>
        ))}
      </div>

      {/*
        Ayrıntılar — iki sütun.

        CSS sütun akışı (columns: 2) yerine ELLE iki sütun: otomatik akışta
        blokların hangi sütuna düşeceği içerik yüksekliğine göre değişiyordu,
        bu yüzden sol sütunun altında boşluk kalırken sağ sütun doluyordu.
        Blokları elle dağıtınca "Güç Kablosu" o boşluğa, fiyat kutusu da onun
        boşalttığı yere yerleşiyor.
      */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
        {/* --- Rapor blokları: yalnızca dışa aktarma akışında --- */}
        {rapor && (
          <Group title={t('exp.secCustomer')}>
            <Row label={t('exp.customer')} value={rapor.customer || DASH} />
            <Row label={t('exp.phone')} value={rapor.phone || DASH} />
            <Row label={t('exp.email')} value={rapor.email || DASH} />
            <Row label={t('exp.address')} value={rapor.address || DASH} />
            {rapor.message && <Row label={t('exp.message')} value={rapor.message} />}
          </Group>
        )}

        {rapor && (
          <Group title={t('exp.secConfig')}>
            <Row label={t('sp.model')} value={rapor.modelCode || DASH} />
            <Row label={t('exp.layout')} value={rapor.layout} />
            <Row label={t('exp.wallLabel')} value={rapor.wall || DASH} />
            <Row label={t('exp.screenSize')} value={rapor.screenSize} />
            <Row label={t('exp.signal')} value={rapor.signal || DASH} />
            <Row label={t('exp.pixels')} value={rapor.pixels} />
          </Group>
        )}

        {/*
          Ekran dökümü yalnızca çoklu düzende: tek ekranda aynı bilgi zaten
          yukarıdaki yapılandırma bloğunda yazıyor.
        */}
        {rapor && rapor.screens && rapor.screens.length > 0 && (
          <Group title={t('exp.secScreens')}>
            {rapor.screens.map((s, i) => (
              <Row key={i} label={`${String(i + 1).padStart(2, '0')} · ${s.tip}`} value={`${s.grid} · ${s.olcu} · ${s.adet}`} />
            ))}
          </Group>
        )}

        <Group title={t('sp.screenConfigLxh')}>
          <Row label={t('sp.lengthHeight')} value={`${cols} ${t('sp.unit')} × ${rows} ${t('sp.unit')}`} />
          <Row label={t('sp.totalScreens')} value={`${fmt(total)} ${t('sp.unit')}`} />
        </Group>

        <Group title={t('sp.screenSpecs')}>
          <Row
            label={isVideoWall ? t('sp.lengthHeightDepth') : t('sp.lengthHeight')}
            value={
              isVideoWall
                ? `${fmt(s.W, 3)} × ${fmt(s.H, 3)} × ${fmt(depthM, 2)} m`
                : `${fmt(s.W, 3)} × ${fmt(s.H, 3)} m`
            }
          />
          <Row label={t('sp.area')} value={`${fmt(s.area, 3)} m²`} />
          <Row label={t('sp.diagonal')} value={`${fmt(s.diagIn, 1)} ${t('sp.inch')}`} />
          <Row label={t('sp.weightCabinets')} value={`${fmt(s.weight, 1)} kg`} />
          <Row label={t('sp.viewingDistance')} value={`${fmt(s.viewDist, 1)} m`} />
        </Group>

        <Group title={t('sp.optical')}>
          <Row label={t('sp.resolution')} value={`${fmt(s.resW)} × ${fmt(s.resH)}`} />
          {k && <Row label={t('sp.totalPixels')} value={`${fmt(k.mpx, 2)} Mpx`} />}
          {k && <Row label={t('sp.aspectRatio')} value={k.aspect} />}
          {k && <Row label={t('sp.resStandard')} value={k.standart} />}
          <Row label={t('col.pitch')} value={`${model.pixelPitchMm} mm`} />
          <Row label={t('col.maxBrightness')} value={`${fmt(model.brightnessNits)} nit`} />
        </Group>

        {/*
          KONTROL SİSTEMİ — eskiden yalnızca backend'in ürettiği resmi
          şartnamede vardı; iki belge birleştirildiği için buraya taşındı.
        */}
        {k && (
          <Group title={t('sp.control')}>
            <Row label={t('sp.rj45')} value={`${k.portText} ${t('sp.port')}`} />
            <Row label={t('sp.mediaPlayer')} value={k.mediaBox} />
            <Row label={t('sp.processor')} value={k.processor} />
          </Group>
        )}

        {/* Güç Kablosu sol sütunun dibindeki boşluğa alındı */}
        {!isVideoWall && (
          <Group title={t('sp.powerCord')}>
            <Row label="110V" value={model.powerCord110Code || DASH} />
            <Row label="220V" value={model.powerCord220Code || DASH} />
          </Group>
        )}
        </div>

        {/* ---------------------------------------------------- SAĞ SÜTUN */}
        <div style={{ flex: 1, minWidth: 0 }}>
        <Group title={t('sp.power')}>
          <Row label={t('sp.max')} value={`${fmt(s.pMax)} ${t('sp.watt')}`} />
          <Row label={t('sp.typical')} value={`${fmt(s.pTyp)} ${t('sp.watt')}`} />
          {!isVideoWall && (
            <>
              <Row label={`110V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c110_20)} />
              <Row label={`208V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c208_20)} />
              <Row label={`230V 13A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_13)} />
              <Row label={`230V 16A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_16)} />
            </>
          )}
        </Group>

        {!isVideoWall && (
          <Group title={t('sp.heat')}>
            <Row label={t('sp.max')} value={`${fmt(s.btuMax)} BTU`} />
            <Row label={t('sp.typical')} value={`${fmt(s.btuTyp)} BTU`} />
          </Group>
        )}

        <Group title={t('sp.customerSelection')}>
          <Row label={t('screen.type')} value={t(`screen.${screenType}`)} />
          <Row label={t('sbox.heading')} value={sboxRedundancy === 'yes' ? t('common.yes') : t('common.no')} />
        </Group>

        {!isVideoWall && (
          <>
            <Group title={t('sp.ledCabinets')}>
              <Row label={t('sp.cabinetCount')} value={`${fmt(total)} ${t('sp.unit')}`} />
              <Row label={t('sp.spareCabinets')} value={`0 ${t('sp.unit')}`} />
              <Row label={`${t('sp.totalCabinets')} (${model.modelCode})`} value={`${fmt(total)} ${t('sp.units')}`} />
            </Group>

            <Group title={t('sp.sbox')}>
              <Row label={t('sp.model')} value={model.sboxCode || DASH} />
              <Row label={t('sp.spare')} value={`${sboxRedundancy === 'yes' ? 1 : 0} ${t('sp.unit')}`} />
            </Group>

            <Group title={t('sp.jig')}>
              <Row label={t('sp.model')} value={model.jigCode || DASH} />
            </Group>
          </>
        )}

        {/*
          Fiyat kutusu, Güç Kablosu'nun boşalttığı yere — sağ sütunun altına,
          sağa yaslı. Her zaman basılır; birim fiyat tanımsızsa 0 görünür.
        */}
        {k && (
          <div
            style={{
              width: 200,
              marginLeft: 'auto',
              background: BRAND.blueTint,
              border: `1px solid #dbe5f5`,
              borderLeft: `3px solid ${BRAND.orange}`,
              borderRadius: 8,
              padding: '10px 12px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {t('sp.estimatedPrice')}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.blue, marginTop: 3 }}>${fmt(k.fiyat, 2)}</div>
          </div>
        )}
        </div>
      </div>

      {/* Dipnotlar */}
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${LINE}`, fontSize: 8.5, color: '#9ca3af', lineHeight: 1.6 }}>
        <div>{t('sp.footnote1')}</div>
        <div>{t('sp.footnote2')}</div>
        <div>{t('sp.footnote3')}</div>
        <div>{t('sp.footnote4')}</div>
      </div>
    </div>
    </div>
  )
}
