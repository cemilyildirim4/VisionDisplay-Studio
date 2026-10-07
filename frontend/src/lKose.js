/**
 * L TİPİ EKRANIN KÖŞE GEOMETRİSİ — KÜPÜN İKİ YÜZÜ.
 *
 * L tipi şimdiye kadar 2B bir siluetti: ekran şeridi ortadan kırılmış bir
 * çevron biçimine kırpılıyor, iki kanat farklı parlaklıkta boyanıyordu. Köşe
 * hissi oradan geliyordu ama yerleşim açısından düz ekrandan farkı yoktu —
 * tek duvara, tek düzleme oturuyordu.
 *
 * Oysa L tipi bir KÖŞE ürünü: bir kanadı ön duvarda, öteki kanadı o duvarın
 * döndüğü yan duvarda durur. İki yüz, bir küpün iki yüzü gibi.
 *
 * İÇ MEKÂN ÇİZİMİNİN GEOMETRİSİ (bkz. Salon.jsx):
 *   • Tek kaçış noktalı perspektif; kaçış noktası tuvalin merkezi (cx, cy).
 *   • Arka duvar, merkezde duran bir dikdörtgen (duvarWm × duvarHm metre).
 *   • Yan duvarlar arka duvarın sol/sağ kenarından izleyiciye doğru açılıyor;
 *     ön çerçeve, arka duvarın kaçış noktası etrafında k katı büyütülmüş hâli.
 *
 * DERİNLİK NASIL PROJEKSİYONA ÇEVRİLİYOR. Tek kaçış noktalı bir çizimde
 * kameradan d kadar yakındaki bir nokta, kaçış noktası etrafında
 *
 *     s(d) = f / (f − d)
 *
 * katı büyür. f, kameranın arka duvara uzaklığı. Elimizde doğrudan f yok ama
 * ön çerçevenin ölçeği (k) ve odanın derinliği (D) var: ön çerçeve odanın ön
 * yüzü olduğuna göre s(D) = k, buradan
 *
 *     f = D · k / (k − 1)
 *
 * Yani yan kanadın derinliği metre olarak veriliyor, ekrandaki yeri bu
 * bağıntıdan çıkıyor. Kanat uzaklaştıkça kısalıyor — gerçek perspektif,
 * uydurma bir kısaltma değil.
 *
 * KÖŞE SEÇİMİ. Sol köşede yan kanat ekranın SOLUNDA kalır ve içeriğin sol
 * parçasını gösterir; sağ köşede ayna simetriği. İçerik iki kanatta kesintisiz
 * devam ediyor: toplam genişlik ön + yan, her kanat kendi dilimini çiziyor.
 */

/* Oda derinliği verilmezse: arka duvar genişliği kadar derin bir oda. */
export const VARSAYILAN_ODA_DERINLIGI_ORANI = 1

/**
 * L tipi ekranın iki kanadının tuvaldeki dörtgenleri.
 *
 * @param tuvalW,tuvalH  tuval ölçüsü (px)
 * @param pxPerM         çizim ölçeği
 * @param duvarWm,duvarHm arka duvarın gerçek ölçüsü (m)
 * @param kose           'sol' | 'sag'
 * @param onM            ön duvardaki kanadın genişliği (m)
 * @param yanM           yan duvardaki kanadın derinliği (m)
 * @param boyM           ekranın yüksekliği (m)
 * @param odaDerinlikM   odanın derinliği (m); yoksa duvar genişliği kadar
 *
 * @returns {{on:{koseler,wPx,hPx,kaydir}, yan:{koseler,wPx,hPx,kaydir}, toplamWpx:number}}
 *          ya da geçersiz girdide null. `kaydir`, kanadın içerik şeridindeki
 *          yatay başlangıcı (px) — içerik iki kanatta kesintisiz aksın diye.
 */
export function lKoseGeometri({
  tuvalW,
  tuvalH,
  pxPerM,
  duvarWm,
  duvarHm,
  kose = 'sol',
  onM,
  yanM,
  boyM,
  odaDerinlikM,
}) {
  if (!(tuvalW > 0) || !(tuvalH > 0) || !(pxPerM > 0)) return null
  if (!(duvarWm > 0) || !(duvarHm > 0)) return null
  if (!(onM > 0) || !(yanM > 0) || !(boyM > 0)) return null

  const m = pxPerM
  const cx = tuvalW / 2
  const cy = tuvalH / 2
  const duvarW = duvarWm * m
  const duvarH = duvarHm * m
  const duvarSol = cx - duvarW / 2
  const duvarSag = cx + duvarW / 2

  /* Salon.jsx ile BİREBİR aynı k; ayrışırsa ekran duvarla hizalanmaz. */
  const k = Math.max(tuvalW / duvarW, tuvalH / duvarH) * 1.06
  if (!(k > 1)) return null

  const D = odaDerinlikM > 0 ? odaDerinlikM : duvarWm * VARSAYILAN_ODA_DERINLIGI_ORANI
  const f = (D * k) / (k - 1)
  /* Kanat odadan derinse kamera düzlemini geçer; o kadarına izin yok. */
  const yanDerinlik = Math.min(yanM, f * 0.85)

  const hPx = boyM * m
  const ust = cy - hPx / 2
  const alt = cy + hPx / 2

  const solMu = kose !== 'sag'
  const xk = solMu ? duvarSol : duvarSag
  /* Ön kanat köşeden duvarın İÇİNE doğru uzuyor. */
  const xa = solMu ? xk + onM * m : xk - onM * m

  /* Yan duvardaki bir nokta: derinlik d, arka duvar düzlemindeki yüksekliği y. */
  const yanNokta = (d, y) => {
    const s = f / (f - d)
    return { x: cx + (xk - cx) * s, y: cy + (y - cy) * s }
  }

  const onPx = onM * m
  const yanPx = yanM * m
  const toplamWpx = onPx + yanPx

  const onKanat = solMu
    ? [
        { x: xk, y: ust },
        { x: xa, y: ust },
        { x: xa, y: alt },
        { x: xk, y: alt },
      ]
    : [
        { x: xa, y: ust },
        { x: xk, y: ust },
        { x: xk, y: alt },
        { x: xa, y: alt },
      ]

  const yakinUst = yanNokta(yanDerinlik, ust)
  const yakinAlt = yanNokta(yanDerinlik, alt)
  const koseUst = { x: xk, y: ust }
  const koseAlt = { x: xk, y: alt }

  /*
   * Yan kanadın köşe sırası içeriğin AKIŞINA göre: sol köşede içeriğin sol
   * ucu yakın uçta, sağ ucu köşede. Sağ köşede tersi.
   */
  const yanKanat = solMu
    ? [yakinUst, koseUst, koseAlt, yakinAlt]
    : [koseUst, yakinUst, yakinAlt, koseAlt]

  return {
    on: { koseler: onKanat, wPx: onPx, hPx, kaydir: solMu ? yanPx : 0 },
    yan: { koseler: yanKanat, wPx: yanPx, hPx, kaydir: solMu ? 0 : onPx },
    toplamWpx,
    kose: solMu ? 'sol' : 'sag',
  }
}
