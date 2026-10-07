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
  /* Salon ile AYNI kaçış noktası; ayrışırsa ekran duvarla hizalanmaz. */
  kacisKaymasi = 0,
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
  const kx = cx + (Number(kacisKaymasi) || 0)
  const ky = cy

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
    return { x: kx + (xk - kx) * s, y: ky + (y - ky) * s }
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

/*
 * FOTOĞRAFLI MEKÂNDA KÖŞE — DURUŞTAN KATLAMA.
 *
 * Çizilmiş iç mekânda köşe hazırdı: arka duvarın kenarı bir köşe, yan duvarın
 * perspektifi de çizimden biliniyor. Kullanıcının kendi fotoğrafında ise böyle
 * bir çizim yok; elimizde yalnızca ölçülmüş bir DÜZLEM var.
 *
 * Ama o düzlemin duruşu çıkarılabiliyor (bkz. durusaOturt): dörtgene en çok
 * benzeyen dönme/çevirme/yatırma. Duruş bilinince ikinci kanat bir tahmin
 * değil, basit bir geometri: ön kanadı dikiş kenarından 90 derece katlamak.
 * Katlanmış yüzü çizen hesap zaten var — kutuGovdesi kabinin yan yüzünü tam
 * olarak böyle üretiyor; tek fark derinliğin kabin derinliği değil, yan
 * kanadın genişliği olması.
 *
 * SON ADIM: YAPIŞTIRMA. Elle bozulmuş bir dörtgen gerçek bir dikdörtgenin
 * görüntüsü olmak zorunda değil, dolayısıyla bulunan duruşun ön yüzü ekrandaki
 * dörtgene tam oturmayabiliyor. Aradaki fark bir düzlem dönüşümü; aynı
 * homografi yan kanada da uygulanınca kanat ön kanada birebir yapışıyor.
 */

/**
 * Ön kanattan 90 derece katlanmış yan kanat.
 *
 * @param on          ön kanadın dörtgeni (normalize fotoğraf koordinatı)
 * @param enCm,boyCm  ön kanadın gerçek ölçüsü
 * @param yanCm       yan kanadın derinliği (santim)
 * @param kose        'sol' | 'sag' — hangi kenardan katlanacağı
 * @param arac        { durusaOturt, kutuGovdesi, duvarDunyasi }
 * @returns yan kanadın dörtgeni (normalize) ya da görünmüyorsa null
 */
export function lKoseYanKanat({
  on,
  enCm,
  boyCm,
  yanCm,
  pxCm,
  gorselW,
  gorselH,
  mesafeCm,
  kose,
  arac,
}) {
  if (!Array.isArray(on) || on.length !== 4) return null
  if (!(enCm > 0) || !(boyCm > 0) || !(yanCm > 0)) return null
  if (!arac?.durusaOturt || !arac?.kutuGovdesi || !arac?.duvarDunyasi) return null

  const merkez = {
    cx: on.reduce((t, p) => t + p.x, 0) / 4,
    cy: on.reduce((t, p) => t + p.y, 0) / 4,
  }
  const poz = arac.durusaOturt(
    on,
    enCm,
    boyCm,
    pxCm,
    gorselW,
    gorselH,
    { ...merkez, roll: 0, yaw: 0, pitch: 0 },
    mesafeCm,
  )
  if (!poz) return null

  const govde = arac.kutuGovdesi(
    enCm,
    boyCm,
    yanCm,
    pxCm,
    gorselW,
    gorselH,
    poz.merkez,
    poz.roll,
    poz.yawRad,
    poz.pitchRad,
    mesafeCm,
  )
  if (!govde) return null

  const istenen = kose === 'sag' ? 'sag' : 'sol'
  const yuz = govde.yuzler.find((y) => y.ad === istenen)
  if (!yuz) return null

  /* Bulunan ön yüzü ekrandaki dörtgene taşıyan homografi; aynısı kanada da. */
  const olcek = (k) => k.map((p) => ({ x: p.x * gorselW, y: p.y * gorselH }))
  const A = arac.duvarDunyasi(olcek(govde.on), 1, 1)
  const B = arac.duvarDunyasi(olcek(on), 1, 1)
  if (!A || !B) return null
  const yapistir = (p) => {
    const u = A.geri(p.x * gorselW, p.y * gorselH)
    const q = u && B.ileri(u.x, u.y)
    return q ? { x: q.x / gorselW, y: q.y / gorselH } : null
  }
  const k = yuz.koseler.map(yapistir)
  return k.some((q) => !q) ? null : k
}

/*
 * CEPHENİN DÖNEN YAN YÜZÜ.
 *
 * Dış mekân bugüne kadar düz bir cepheydi: tam karşıdan görünen bir
 * dikdörtgen, derinlik yok. L tipi bir KÖŞE ürünü olduğu için ikinci kanadın
 * oturacağı bir yüzey gerekiyor — bina köşeden dönmeli.
 *
 * Yan yüz, cephenin köşe kenarından izleyiciye doğru kaçan bir yamuk. Hesap
 * iç mekândakiyle AYNI: kaçış noktası, k katı ön çerçeve ve s(d) = f/(f−d)
 * derinlik ölçeği. İkisi aynı formülü kullandığı için iç ve dış mekânda köşe
 * aynı mantıkla okunuyor.
 *
 * Yalnızca L tipi seçiliyken çiziliyor; düz ve kavisli ekranlarda cephe
 * eskisi gibi düz kalıyor.
 */
export function cepheYanYuzu({
  tuvalW,
  tuvalH,
  pxPerM,
  duvarWm,
  duvarHm,
  kose = 'sol',
  derinlikM,
  kacisKaymasi = 0,
  odaDerinlikM,
}) {
  if (!(tuvalW > 0) || !(tuvalH > 0) || !(pxPerM > 0)) return null
  if (!(duvarWm > 0) || !(duvarHm > 0) || !(derinlikM > 0)) return null

  const m = pxPerM
  const cx = tuvalW / 2
  const cy = tuvalH / 2
  const duvarW = duvarWm * m
  const duvarH = duvarHm * m
  const duvarSol = cx - duvarW / 2
  const duvarSag = cx + duvarW / 2
  const tavanY = cy - duvarH / 2
  const tabanY = cy + duvarH / 2

  const k = Math.max(tuvalW / duvarW, tuvalH / duvarH) * 1.06
  if (!(k > 1)) return null
  const kx = cx + (Number(kacisKaymasi) || 0)
  const ky = cy
  const D = odaDerinlikM > 0 ? odaDerinlikM : duvarWm
  const f = (D * k) / (k - 1)
  const d = Math.min(derinlikM, f * 0.85)

  const solMu = kose !== 'sag'
  const xk = solMu ? duvarSol : duvarSag
  const nokta = (derinlik, y) => {
    const s = f / (f - derinlik)
    return { x: kx + (xk - kx) * s, y: ky + (y - ky) * s }
  }

  /* Köşe kenarı (derinlik 0) ve yakın uç (derinlik d), yukarıdan aşağıya. */
  const koseUst = { x: xk, y: tavanY }
  const koseAlt = { x: xk, y: tabanY }
  const yakinUst = nokta(d, tavanY)
  const yakinAlt = nokta(d, tabanY)

  return solMu
    ? [yakinUst, koseUst, koseAlt, yakinAlt]
    : [koseUst, yakinUst, yakinAlt, koseAlt]
}
