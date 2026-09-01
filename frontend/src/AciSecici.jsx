/**
 * AÇI VERME — fareyle sürükleyerek, ama KOLAY.
 *
 * İlk sürüm serbest sürüklemeydi: iki eksen aynı anda değişiyor, her piksel
 * 0,22° ediyordu; kullanıcı istediği açıyı tutturamıyordu. Sonra hazır açı
 * düğmeleri denendi, o da istenmedi. Bu sürüm sürüklemeyi koruyup üç şeyle
 * kolaylaştırıyor:
 *
 *   • EKSEN KİLİDİ — hareket hangi yönde başladıysa o eksende kalıyor.
 *     Yana sürüklerken ekran bir de öne arkaya yatmıyor.
 *   • YUMUŞAK ORAN — piksel başına 0,08°; küçük düzeltme yapmak kolay.
 *   • KADEMELİ DURAK — açı 2°'nin katlarına oturuyor; el titremesi
 *     sonuca yansımıyor ve aynı açıyı tekrar tutturmak mümkün.
 *
 * Ekranın ortasındaki tutamak yalnızca "burayı sürükle" demek için var;
 * sürükleme tuvalin her yerinden başlatılabiliyor.
 */

import { useRef, useState } from 'react'

/** Piksel başına derece — küçük tutuldu, ince ayar kolay olsun diye. */
const DERECE_PX = 0.08

/** Açı bu kadar dereceye yuvarlanıyor. */
const KADEME = 2

/** Sınır: ötesinde ekran fiziksel olarak anlamsız görünüyor. */
export const ACI_SINIR = 40

export default function AciSecici({ yaw, tilt, onDegis, tuvalW, tuvalH }) {
  const surukleRef = useRef(null)
  const [aktif, setAktif] = useState(false)

  const indi = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukleRef.current = { x: e.clientX, y: e.clientY, yaw, tilt, eksen: null }
    setAktif(true)
  }

  const hareket = (e) => {
    const s = surukleRef.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y

    /* Eksen kilidi: 6 pikselden sonra yön belli oluyor ve orada kalıyor. */
    if (!s.eksen && Math.hypot(dx, dy) > 6) {
      s.eksen = Math.abs(dx) >= Math.abs(dy) ? 'yatay' : 'dikey'
    }
    if (!s.eksen) return

    const kademele = (v) =>
      Math.max(-ACI_SINIR, Math.min(ACI_SINIR, Math.round(v / KADEME) * KADEME))

    if (s.eksen === 'yatay') onDegis({ yaw: kademele(s.yaw + dx * DERECE_PX), tilt: s.tilt })
    else onDegis({ yaw: s.yaw, tilt: kademele(s.tilt - dy * DERECE_PX) })
  }

  const kalkti = (e) => {
    surukleRef.current = null
    setAktif(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  return (
    <div
      data-pdf-gizle
      className="absolute inset-0 z-30"
      style={{ touchAction: 'none', cursor: aktif ? 'grabbing' : 'grab' }}
      onPointerDown={indi}
      onPointerMove={hareket}
      onPointerUp={kalkti}
      onPointerCancel={kalkti}
    >
      <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 text-white text-[12px] px-3 py-1.5 whitespace-nowrap">
        Sürükleyin — yana: {yaw > 0 ? 'sağdan' : yaw < 0 ? 'soldan' : 'karşıdan'} {Math.abs(Math.round(yaw))}° · yukarı/aşağı:{' '}
        {tilt > 0 ? 'aşağıdan' : tilt < 0 ? 'yukarıdan' : 'göz hizası'} {Math.abs(Math.round(tilt))}°
      </div>

      {/* Tutamak: nereden başlanacağını gösteriyor, sürükleme her yerden çalışıyor. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95 shadow-lg border-2 border-brand flex items-center justify-center"
        style={{ width: 52, height: 52 }}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#2962ad" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18" />
          <path d="M6 9l-3 3 3 3" />
          <path d="M18 9l3 3-3 3" />
        </svg>
      </div>

      <svg width={tuvalW} height={tuvalH} className="absolute inset-0 pointer-events-none">
        <rect x="1" y="1" width={Math.max(0, tuvalW - 2)} height={Math.max(0, tuvalH - 2)} fill="none" stroke="#2962ad" strokeWidth="2" strokeDasharray="8 6" />
      </svg>
    </div>
  )
}
