/**
 * L TİPİ EKRAN — KÖŞEYE OTURAN İKİ YÜZ.
 *
 * Mekânın köşesini saran L ekran burada çiziliyor: bir kanat ön (arka) duvarda,
 * öteki kanat o duvarın döndüğü yan duvarda. İki kanat da kendi düzleminin
 * perspektifini alıyor; geometrisi lKose.js'te, burada yalnızca çizim var.
 *
 * NEDEN AYRI BİR KATMAN. WallPreview tek bir ŞERİT çiziyor ve ona tek bir
 * dörtgen dönüşümü uyguluyor. Köşede iki ayrı düzlem var, yani iki ayrı
 * dönüşüm; tek şeride sığmıyor. Bu yüzden L köşe kipinde WallPreview'in
 * ekranı gizleniyor ve yerini bu katman alıyor.
 *
 * İÇERİK KESİNTİSİZ. Görüntü iki kanada bölünmüyor, tek bir şerit olarak
 * düşünülüp her kanat kendi DİLİMİNİ çiziyor (backgroundPosition ile). Köşede
 * görüntü devam ediyor — gerçek bir köşe ekranında olduğu gibi.
 *
 * İKİ YÜZ FARKLI AYDINLIKTA. Köşeyi okutan şey bu. Gerçek bir LED küpte de
 * köşede parlak bir çizgi yoktur; bir yüz ışığı alır, komşu yüz gölgede kalır.
 * Yan kanat biraz koyu çiziliyor.
 */

import { koseDonusumu } from './homografi.js'
import { ledDotSize, ledDotsStyle, LED_LIT_FILTER } from './content.js'
import { contentImage } from './WallPreview.jsx'

/* Yan yüzün ışığı: ön yüze göre bu oranda sönük. */
const YAN_KARARTMA = 0.72

export default function LKoseEkran({
  geo,
  tuvalW,
  tuvalH,
  cols,
  rows,
  content,
  contentUrl,
  model,
  /*
   * TAŞIMA — verilirse kanatlar fareye cevap veriyor.
   *
   * Katman normalde fareyi hiç görmüyor (pointerEvents: none): altındaki
   * fotoğrafa ve ölçü araçlarına engel olmasın. Taşıma açıkken yalnızca
   * KANATLAR hedef oluyor; aralarındaki boşluk ve katmanın geri kalanı yine
   * tıklanabilir kalıyor.
   */
  onSurukle = null,
  /* Taşıma serbest mi, yoksa köşe çizgisi boyunca mı — imleç bunu söylüyor. */
  surukleImleci = 'move',
}) {
  if (!geo?.on || !geo?.yan) return null

  const bgImage = content !== 'none' ? contentImage(content, contentUrl) : null
  const yayinda = content !== 'none' && content !== 'led'
  const toplamW = Math.ceil(geo.toplamWpx)
  const toplamH = Math.ceil(geo.on.hPx)

  /* Diyot dokusu kabin ölçüsünden türüyor; iki kanatta da aynı sıklıkta. */
  const kabinW = geo.toplamWpx / Math.max(1, cols)
  const kabinH = geo.on.hPx / Math.max(1, rows)
  const diyot = !yayinda ? ledDotSize(kabinW, kabinH) : null

  const kanatCiz = (kanat, ad, karart) => {
    const d = koseDonusumu(kanat.wPx, kanat.hPx, kanat.koseler)
    if (!d) return null
    return (
      <div
        key={ad}
        onPointerDown={onSurukle || undefined}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: kanat.wPx,
          height: kanat.hPx,
          transform: d,
          transformOrigin: '0 0',
          overflow: 'hidden',
          backgroundColor: '#0a0a0a',
          pointerEvents: onSurukle ? 'auto' : undefined,
          cursor: onSurukle ? surukleImleci : undefined,
          touchAction: onSurukle ? 'none' : undefined,
          /*
            Dilim: içerik tek bir şerit gibi çiziliyor, kanat kendi payını
            negatif konumla gösteriyor. Köşede görüntü kesilmiyor.
          */
          backgroundImage: bgImage || undefined,
          backgroundSize: `${toplamW}px ${toplamH}px`,
          backgroundPosition: `${-kanat.kaydir}px 0px`,
          backgroundRepeat: 'no-repeat',
          filter: karart
            ? `brightness(${YAN_KARARTMA})${yayinda ? ' ' + LED_LIT_FILTER : ''}`
            : yayinda
              ? LED_LIT_FILTER
              : undefined,
        }}
      >
        {diyot && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              ...ledDotsStyle(diyot.dotW, diyot.dotH),
              /* Doku da şeridin tamamına göre kayıyor ki dikişte hizalansın. */
              backgroundPosition: `${-kanat.kaydir}px 0px`,
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      data-tasarim-katman
      className="absolute inset-0"
      style={{ width: tuvalW, height: tuvalH, pointerEvents: 'none' }}
    >
      {kanatCiz(geo.yan, 'yan', true)}
      {kanatCiz(geo.on, 'on', false)}
    </div>
  )
}
