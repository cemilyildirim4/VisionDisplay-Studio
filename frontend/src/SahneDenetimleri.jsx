/**
 * FOTOĞRAFLI MEKÂNLARIN DENETİM PANELİ (iç ve dış mekân ortak).
 *
 * İki şey ayarlanıyor:
 *
 *   • ÖLÇÜ — metre kutusu yerine kabin sayısı. Ekranın gerçek ölçüsü
 *     uygulamada kabin ızgarasından çıkıyor ve tek kaynak orası; buraya ayrı
 *     bir metre durumu koymak, aynı ekranın iki farklı ölçüsü olması demekti.
 *     Kullanıcı metreyi yine görüyor.
 *
 *   • İZLEME MESAFESİ — fotoğrafa ne kadar yaklaşıldığı. Fotoğraf belli bir
 *     noktadan çekilmiş; o nokta varsayılan mesafedir. Mesafe kısaldıkça
 *     sahnenin tamamı (arka plan + ekran BİRLİKTE) büyüyor, yani izleyici
 *     ekrana doğru yürümüş oluyor. Ekran tek başına büyümediği için ölçü
 *     bilgisi bozulmuyor: 3 m'lik ekran 3 m olarak kalıyor, sadece yakından
 *     görünüyor.
 *
 *     Fotoğrafın çekildiği noktadan daha geriye gidilemiyor — orada görüntü
 *     yok. Bu yüzden denetim yalnızca yaklaştırıyor.
 */

import { useLang } from './useLang.js'

function OlcuSatiri({ etiket, deger, enCok, kabinM, degistir, toplamM }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12px] text-white/70">{etiket}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${etiket}-azalt`}
          onClick={() => degistir(Math.max(1, deger - 1))}
          className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[15px] leading-none"
        >
          −
        </button>
        <span className="text-white text-[12.5px] font-semibold tabular-nums w-[74px] text-center">
          {toplamM.toFixed(2)} m
          <span className="block text-[10px] font-normal text-white/50">
            {deger} × {(kabinM * 100).toFixed(0)} cm
          </span>
        </span>
        <button
          type="button"
          aria-label={`${etiket}-arttir`}
          onClick={() => degistir(Math.min(enCok, deger + 1))}
          className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[15px] leading-none"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function SahneDenetimleri({
  cols,
  rows,
  colsMax,
  rowsMax,
  cwM,
  chM,
  onCols,
  onRows,
  wm,
  hm,
  mesafe,
  enYakinMesafe,
  enUzakMesafe,
  onMesafe,
}) {
  const { t } = useLang()

  /* Adım mesafeyle büyüsün: 3 m'de 25 cm, 18 m'de 2 m mantıklı bir sıçrama. */
  const adim = mesafe > 12 ? 2 : mesafe > 5 ? 1 : 0.25
  const kaydir = (yon) => {
    const yeni = Math.round((mesafe + yon * adim) * 100) / 100
    onMesafe(Math.max(enYakinMesafe, Math.min(enUzakMesafe, yeni)))
  }

  return (
    <div className="rounded-2xl bg-black/70 backdrop-blur px-3 py-2 w-[236px]">
      <OlcuSatiri
        etiket={t('avm.width')}
        deger={cols}
        enCok={colsMax}
        kabinM={cwM}
        degistir={onCols}
        toplamM={wm}
      />
      <OlcuSatiri
        etiket={t('avm.height')}
        deger={rows}
        enCok={rowsMax}
        kabinM={chM}
        degistir={onRows}
        toplamM={hm}
      />

      <div className="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between gap-3 py-1">
        <span className="text-[12px] text-white/70">{t('scene.distance')}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="mesafe-azalt"
            onClick={() => kaydir(-1)}
            disabled={mesafe <= enYakinMesafe + 1e-6}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-35 text-white text-[15px] leading-none"
          >
            −
          </button>
          <span className="text-white text-[12.5px] font-semibold tabular-nums w-[74px] text-center">
            {mesafe.toFixed(mesafe < 10 ? 1 : 0)} m
            <span className="block text-[10px] font-normal text-white/50">{t('scene.fromHere')}</span>
          </span>
          <button
            type="button"
            aria-label="mesafe-arttir"
            onClick={() => kaydir(1)}
            disabled={mesafe >= enUzakMesafe - 1e-6}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-35 text-white text-[15px] leading-none"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
