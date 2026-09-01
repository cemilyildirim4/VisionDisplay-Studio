/**
 * AÇIYI ELLE AYARLAMA — fare/parmakla perspektif verme.
 *
 * NEDEN: otomatik açı yalnızca fotoğrafta ölçülebildiğinde uygulanıyor
 * (bir panonun dört kenarı bulunduğunda). Boş bir duvarda ölçecek bir şey
 * yok; oraya tahminle açı vermek ekranı havada yatırıyordu. Karar
 * kullanıcının: açı kipini açıp sürüklüyor, gördüğü şeye göre ayarlıyor.
 *
 * NASIL:
 *   • YATAY sürükleme → yatay dönme (yaw). Ekranın bir kenarı yaklaşıyor,
 *     öteki uzaklaşıyor: yüzeyi dikey ekseninde çevirmek gibi.
 *   • DİKEY sürükleme → dikey dönme (tilt). Üst kenar yaklaşıyor ya da
 *     uzaklaşıyor: yüzeyi yatay ekseninde çevirmek gibi.
 *
 * Katman yalnızca sürükleme yakalıyor; çizimi App yapıyor (dörtgene
 * uygulanan ölçekler orada). Böylece açı, dört köşe yerleşimiyle ve
 * taşımayla birlikte tek bir dönüşümde birleşiyor.
 */

import { useRef } from 'react'

/** Sürükleme mesafesini dereceye çeviren katsayı (piksel başına). */
const DERECE_PX = 0.22

/** Açı sınırları — ötesinde ekran fiziksel olarak anlamsız görünüyor. */
export const ACI_SINIR = 42

export default function AciSecici({ yaw, tilt, onDegis, tuvalW, tuvalH }) {
  const surukleRef = useRef(null)

  const indi = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukleRef.current = { x: e.clientX, y: e.clientY, yaw, tilt }
  }

  const hareket = (e) => {
    const s = surukleRef.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    const sinirla = (v) => Math.max(-ACI_SINIR, Math.min(ACI_SINIR, v))
    onDegis({
      yaw: sinirla(s.yaw + dx * DERECE_PX),
      tilt: sinirla(s.tilt - dy * DERECE_PX),
    })
  }

  const kalkti = (e) => {
    surukleRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  return (
    <div
      data-pdf-gizle
      className="absolute inset-0 z-30"
      style={{ touchAction: 'none', cursor: 'ew-resize' }}
      onPointerDown={indi}
      onPointerMove={hareket}
      onPointerUp={kalkti}
      onPointerCancel={kalkti}
    >
      {/* Ne yapıldığını söyleyen küçük bir ipucu; PDF'e girmiyor. */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 text-white text-[12px] px-3 py-1.5">
        Sürükleyin: yatay → yana çevir, dikey → öne/arkaya yatır ({Math.round(yaw)}° / {Math.round(tilt)}°)
      </div>
      <svg width={tuvalW} height={tuvalH} className="absolute inset-0 pointer-events-none">
        <rect x="1" y="1" width={Math.max(0, tuvalW - 2)} height={Math.max(0, tuvalH - 2)} fill="none" stroke="#2962ad" strokeWidth="2" strokeDasharray="8 6" />
      </svg>
    </div>
  )
}
