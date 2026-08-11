/**
 * ÖRNEK PANO — bizim kendi mekân görselimiz.
 *
 * Referans: dış mekân LED reklam panosu (yol kenarı totem). İnce koyu bir
 * kasa, kasanın içine KENARLARA TAM OTURAN ekran, altında tek kare direk;
 * arkasında gökyüzü ve zemin.
 *
 * Fotoğraf DEĞİL, çizim. Sebebi: hazır bir fotoğrafın panosu sabit ölçüdedir;
 * müşteri kabin ekleyip ekranı büyüttüğünde fotoğraftaki pano olduğu yerde
 * kalır ve ölçüler tutmaz. Burada panonun her parçası ekranın ölçüsünden
 * türüyor — ekran büyüdükçe kasa, direk ve taban da onunla büyüyor, oranlar
 * hiç bozulmuyor.
 *
 * Ekranın ARKASINA çizilir; kasanın ortası kasıtlı boştur, gerçek ekran
 * oraya oturur.
 *
 * NOT: Bir ara kasanın içinde ekranın çevresinde beyaz bir "yerleştirme
 * payı" vardı. Kaldırıldı — gerçek LED panolarda ekran kasayı kenarına kadar
 * doldurur, arada beyaz bir yüzey olmaz.
 */

import { useState } from 'react'

// Hepsi EKRAN genişliğine/yüksekliğine orandır; sabit piksel yok ki
// her ölçekte aynı görünsün.
const KASA = 0.016 // ekranı saran koyu kasanın kalınlığı
const KASA_ALT = 0.05 // kasanın alt kenarı (montaj profili) daha kalın
const BOYUN_H = 0.05 // kasa ile direk arasındaki bağlantı
const DIREK_W = 0.075
const DIREK_H = 0.95
const TABAN_W = 0.17
const TABAN_H = 0.045

/**
 * Panonun kapladığı toplam kutu ve ekranın o kutu içindeki yeri.
 *
 * Dışa açık: ölçeği seçerken panonun TAMAMININ (direği ve tabanı dahil) ne
 * kadar yer tuttuğunu önceden bilmek gerekiyor.
 */
export function panoOlculeri(wPx, hPx) {
  const kasa = Math.max(2, wPx * KASA)
  const kasaAlt = Math.max(4, wPx * KASA_ALT)
  const boyunH = Math.max(3, hPx * BOYUN_H)
  const direkW = Math.max(6, wPx * DIREK_W)
  const direkH = hPx * DIREK_H
  const tabanW = Math.max(16, wPx * TABAN_W)
  const tabanH = Math.max(4, hPx * TABAN_H)
  return {
    kasa,
    kasaAlt,
    boyunH,
    direkW,
    direkH,
    tabanW,
    tabanH,
    W: Math.max(wPx + kasa * 2, tabanW),
    H: kasa + hPx + kasaAlt + boyunH + direkH + tabanH,
    ekranUst: kasa, // ekranın üst kenarının kutu içindeki yeri
  }
}

/*
 * GERÇEK FOTOĞRAF ARKA PLAN (isteğe bağlı).
 *
 * public/ içine bu adla bir fotoğraf konursa arka plan olarak o kullanılır;
 * yoksa aşağıdaki çizilmiş gökyüzüne düşülür. Böylece fotoğrafı devreye
 * almak için tek yapılacak dosyayı kopyalamak — kodda değişiklik gerekmiyor.
 *
 * Fotoğrafta PANO OLMAMALI: kasa, direk ve ekran vektör olarak çiziliyor ve
 * tasarımla birlikte büyüyor. Fotoğraf yalnızca çevreyi (gökyüzü, yol,
 * zemin) verir. Bkz. yedekler/pano-arkaplan-promptu.md
 */
const ARKAPLAN_YOLU = '/pano-arkaplan.jpg'

/**
 * Arka plandaki manzaranın GERÇEK genişliği (metre). Panonun ölçeği buradan
 * çıkıyor: pano artık tuvale sığdırılmıyor, bu manzaranın üzerine gerçek
 * ölçüsüyle çiziliyor. Böylece 2 m'lik tasarımla 10 m'lik tasarım tuvalde
 * gerçekten farklı büyüklükte görünüyor.
 *
 * 22 m: yol kenarından çekilmiş bir manzarada kadraja giren genişlik. Tahmini
 * bir değer — fotoğrafta ölçüsü bilinen bir nesne yok. Ölçü BİLGİSİ zaten
 * ekranın kendi etiketlerinden okunuyor; buranın işi büyüklük hissini doğru
 * yönde vermek.
 */
export const PANO_SAHNE_EN_M = 22

export default function Pano({ wPx, hPx, tuvalW, tuvalH }) {
  const [fotoVar, setFotoVar] = useState(true)
  if (!wPx || !hPx || !tuvalW || !tuvalH) return null

  const { kasa, kasaAlt, boyunH, direkW, direkH, tabanW, tabanH, W, H, ekranUst } = panoOlculeri(
    wPx,
    hPx,
  )
  const cx = W / 2

  /*
   * SVG, EKRANIN MERKEZİ tuvalin merkezine gelecek şekilde konumlanır —
   * gerçek ekran da tuvalin merkezinde çizildiği için ikisi tam üst üste
   * oturur.
   */
  const left = tuvalW / 2 - cx
  const top = tuvalH / 2 - (ekranUst + hPx / 2)

  const kasaAltUst = ekranUst + hPx
  const boyunUst = kasaAltUst + kasaAlt
  const direkUst = boyunUst + boyunH
  const tabanUst = direkUst + direkH

  return (
    <>
      {/*
        ARKA PLAN — gökyüzü ve zemin. Panonun kendisinden bağımsız, tuvalin
        tamamını kaplar; pano bunun önünde durur.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#5b9fd4] via-[#a9d2ee] to-[#dceaf5] dark:from-[#1d2c3d] dark:via-[#2b4054] dark:to-[#3c5468]" />
        {/*
          Bulutlar. Sert kenarlı bir leke gibi durmasınlar diye radyal
          geçişli — düz renk + blur denendi, koyu gökyüzünde bulut değil
          gri lekeler gibi görünüyordu.
        */}
        <div
          className="absolute left-[6%] top-[12%] w-[30%] h-[12%] opacity-70 dark:opacity-25"
          style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(255,255,255,0))' }}
        />
        <div
          className="absolute right-[8%] top-[7%] w-[24%] h-[10%] opacity-55 dark:opacity-20"
          style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.8), rgba(255,255,255,0))' }}
        />
        <div
          className="absolute left-[44%] top-[24%] w-[34%] h-[10%] opacity-40 dark:opacity-15"
          style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.75), rgba(255,255,255,0))' }}
        />
        {/* Zemin */}
        <div className="absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-b from-[#9fae90] to-[#75836a] dark:from-[#2f3830] dark:to-[#222a24]" />
        {/* Ufuk çizgisindeki uzak yapı bandı — derinlik hissi */}
        <div className="absolute inset-x-0 bottom-[20%] h-[3%] bg-[#8d9a8b]/60 dark:bg-[#39433a]/70" />

        {/*
          Gerçek fotoğraf varsa çizimin ÜSTÜNü kapatır. Yoksa onError ile
          kapatılıyor ve altındaki çizim görünür kalıyor.
        */}
        {fotoVar && (
          <img
            src={ARKAPLAN_YOLU}
            alt=""
            onError={() => setFotoVar(false)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Koyu temada fotoğraf göz alıyor — hafif karartma */}
        {fotoVar && <div className="absolute inset-0 hidden dark:block bg-black/35" />}
      </div>

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ left, top, width: W, height: H, overflow: 'visible' }}
        viewBox={`0 0 ${W} ${H}`}
      >
        <defs>
          {/* Direğin yuvarlaklık hissi: solda ışık, sağda gölge */}
          <linearGradient id="pano-direk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4d545c" />
            <stop offset="28%" stopColor="#6b737c" />
            <stop offset="100%" stopColor="#31363c" />
          </linearGradient>
          <linearGradient id="pano-kasa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a4046" />
            <stop offset="100%" stopColor="#21262b" />
          </linearGradient>
        </defs>

        {/* Direk */}
        <rect x={cx - direkW / 2} y={direkUst} width={direkW} height={direkH} fill="url(#pano-direk)" />
        {/* Taban */}
        <rect
          x={cx - tabanW / 2}
          y={tabanUst}
          width={tabanW}
          height={tabanH}
          rx={tabanH * 0.3}
          fill="#2b3036"
        />

        {/* Kasa ile direk arasındaki bağlantı — dar bir boyun */}
        <rect
          x={cx - direkW * 0.9}
          y={boyunUst}
          width={direkW * 1.8}
          height={boyunH}
          fill="#333940"
        />

        {/*
          KASA. İçi de doluyor ama sorun değil: gerçek ekran tam oraya oturup
          üstünü kapatıyor. Alt kenar kalın — gerçek panolarda montaj profili
          orada olur.
        */}
        <rect
          x={cx - wPx / 2 - kasa}
          y={0}
          width={wPx + kasa * 2}
          height={kasa + hPx + kasaAlt}
          rx={kasa * 0.4}
          fill="url(#pano-kasa)"
        />
        {/* Üst kenarda ince ışık — metal parlaması */}
        <rect
          x={cx - wPx / 2 - kasa}
          y={0}
          width={wPx + kasa * 2}
          height={Math.max(1, kasa * 0.28)}
          fill="#5b636c"
          opacity="0.8"
        />
        {/* Alt profildeki havalandırma çizgileri */}
        {Array.from({ length: 12 }, (_, i) => {
          const bant = wPx * 0.7
          const x = cx - bant / 2 + (bant * i) / 11
          return (
            <line
              key={i}
              x1={x}
              y1={kasaAltUst + kasaAlt * 0.3}
              x2={x}
              y2={kasaAltUst + kasaAlt * 0.7}
              stroke="#12161a"
              strokeWidth={Math.max(0.5, wPx * 0.0025)}
              opacity="0.6"
            />
          )
        })}
      </svg>
    </>
  )
}
