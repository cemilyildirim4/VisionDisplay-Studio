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

  /*
   * KÖŞE NEREDE: duvarın solunda, sağında ya da TAM ORTASINDA.
   *
   * 'orta' mekânın kendi köşesine değil, duvarın ortasına kurulan serbest bir
   * köşe: ekran duvardan öne doğru katlanıyor. Yön olarak sol köşe gibi
   * davranıyor (ön kanat sağa, yan kanat izleyiciye doğru), yalnızca dikişin
   * yeri duvarın ortası.
   */
  const ortaMi = kose === 'orta'
  const solMu = kose !== 'sag'
  const xk = ortaMi ? cx : solMu ? duvarSol : duvarSag
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

  /*
   * ORTA — KÖŞE TAM KARŞIDA, İKİ KANAT DA GÖRÜNÜR.
   *
   * Sol ve sağ köşede dikiş duvarın kenarında ve bir kanat duvarda düz
   * duruyor. Ortada ise köşe serbest: dikiş izleyiciye en YAKIN nokta ve iki
   * kanat oradan geriye, sağa ve sola açılıyor — küpün köşesine karşıdan
   * bakmak gibi. İlk denemede orta, dikişi ortaya alıp kanadı yine yana
   * katlıyordu; o da duvara yapışık bir kırım veriyordu, köşe görünmüyordu.
   *
   * 90 derecelik bir köşeye tam karşıdan bakıldığında her kanat 45 derece
   * duruyor: w genişliğindeki bir kanat yanda w/√2 kadar yer kaplıyor ve
   * dikiş izleyiciye w/√2 kadar yaklaşıyor. Dikiş tek bir nokta olduğu için
   * derinliği iki kanadın büyüğüne göre seçiliyor; küçük kanadın uzak ucu da
   * kendi payınca geride kalıyor.
   */
  if (ortaMi) {
    const KOK2 = Math.SQRT2
    const yanYer = (yanM * m) / KOK2
    const onYer = (onM * m) / KOK2
    const dikisDerinlik = Math.max(onM, yanM) / KOK2
    const yanUcDerinlik = Math.max(0, dikisDerinlik - yanM / KOK2)
    const onUcDerinlik = Math.max(0, dikisDerinlik - onM / KOK2)

    const nokta = (xDuvar, derinlik, y) => {
      const s2 = f / (f - Math.min(derinlik, f * 0.85))
      return { x: kx + (xDuvar - kx) * s2, y: ky + (y - ky) * s2 }
    }
    const dikisUst = nokta(cx, dikisDerinlik, ust)
    const dikisAlt = nokta(cx, dikisDerinlik, alt)
    const yanUcUst = nokta(cx - yanYer, yanUcDerinlik, ust)
    const yanUcAlt = nokta(cx - yanYer, yanUcDerinlik, alt)
    const onUcUst = nokta(cx + onYer, onUcDerinlik, ust)
    const onUcAlt = nokta(cx + onYer, onUcDerinlik, alt)

    return {
      /* Sol kanat içeriğin sol parçası: uzak uçtan dikişe. */
      yan: {
        koseler: [yanUcUst, dikisUst, dikisAlt, yanUcAlt],
        wPx: yanM * m,
        hPx,
        kaydir: 0,
      },
      /* Sağ kanat dikişten uzak uca. */
      on: {
        koseler: [dikisUst, onUcUst, onUcAlt, dikisAlt],
        wPx: onM * m,
        hPx,
        kaydir: yanM * m,
      },
      toplamWpx,
      kose: 'orta',
    }
  }

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
/*
 * YAN YÜZÜN KÖŞE SIRASI İÇERİĞE GÖRE.
 *
 * kutuGovdesi yüzleri DIŞA DÖNÜK sırayla veriyor; o sıra görünürlük hesabı
 * için doğru ama içerik için değil. İçerik kanada bir dilim olarak çiziliyor
 * ve sol üst köşesinin nerede olduğunu bilmek zorunda: sol kanatta içeriğin
 * sol ucu YAKIN uçta, sağ kanatta köşede. Sıra düzeltilmezse görüntü bir
 * kanatta doksan derece dönük çıkıyor.
 */
function icerikSirasi(k, kose) {
  return kose === 'sag' ? k : [k[3], k[0], k[1], k[2]]
}

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
  const k = icerikSirasi(yuz.koseler, istenen).map(yapistir)
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
export { icerikSirasi }

/**
 * İÇ BÜKEY KÖŞE — odanın köşesine bakar gibi.
 *
 * NEDEN AYRI BİR HESAP. Fotoğraflı mekânda köşe şimdiye kadar ÜRÜNÜN
 * gövdesinden türüyordu (kutuGovdesi): bir kutuyu çevirip ön ve yan yüzünü
 * almak. O kutunun köşesi DIŞA dönüktür — kutuya dışarıdan bakarsınız, dikiş
 * izleyiciye en yakın noktadır. Oysa iç L tipi ekran bir odanın köşesini
 * SARIYOR: dikiş en uzaktaki nokta, iki kanat oradan izleyiciye doğru
 * açılıyor. Ekranda tam tersi görünüyordu.
 *
 * Hesap doğrudan: dikiş zaten elimizde (kullanıcı işaretledi ya da öneriden
 * geldi) ve onun ekrandaki boyu, ekranın gerçek boyuna bölününce o
 * derinlikteki ölçeği veriyor. Kanatlar 90 derecelik köşenin iki yüzü olduğu
 * için her biri 45 derece duruyor: w genişliğindeki bir kanat yanda w/√2
 * kadar yer kaplıyor ve ucu izleyiciye w/√2 kadar yaklaşıyor. Yaklaşma
 * perspektifte büyüme demek — bunu f/(f−d) veriyor.
 *
 * @param {{x:number,y:number}} ust  dikişin üst ucu (tuval pikseli)
 * @param {{x:number,y:number}} alt  dikişin alt ucu (tuval pikseli)
 * @param {number} solM  sol kanadın gerçek genişliği (m)
 * @param {number} sagM  sağ kanadın gerçek genişliği (m)
 * @param {number} boyM  ekranın gerçek yüksekliği (m)
 * @param {number} mesafeM  kameranın köşeden uzaklığı (m)
 */
export function icBukeyKose({
  ust,
  alt,
  solM,
  sagM,
  boyM,
  mesafeM,
  aci = 0,
  ufukY = null,
  /* Hangi kanat YAN duvarda: 'sol' | 'sag' | 'orta'. */
  kose = 'sol',
  /*
   * Kullanıcının tuşlarla verdiği şekil, DERECE. Her kanadın ÜST ve ALT
   * kenarı ayrı ayrı: ekranda hizalanacak şey zaten tavan hattı ve zemin
   * hattı, ikisi birbirinden bağımsız.
   */
  solUstAci = 0,
  solAltAci = 0,
  sagUstAci = 0,
  sagAltAci = 0,
}) {
  if (!ust || !alt) return null
  if (!(boyM > 0) || !(solM > 0) || !(sagM > 0)) return null
  const dx = alt.x - ust.x
  const dy = alt.y - ust.y
  const dikisPx = Math.hypot(dx, dy)
  if (!(dikisPx > 2)) return null
  /* Dikiş dik olmak zorunda (yatay çizgide kanatlar üst üste biniyor). */
  if (Math.abs(dy) < dikisPx * 0.5) return null

  /* Dikiş hizasında 1 metre kaç piksel. cm/px sistemi bunun dışında değişmiyor. */
  const m = dikisPx / boyM
  const f = Math.max(0.6, Number(mesafeM) || 3)

  const ux = dx / dikisPx
  const uy = dy / dikisPx
  /* Dikiş yukarıdan aşağıya bakarken bu yön SOL tarafı gösteriyor. */
  const nx = -uy
  const ny = ux
  const cx = (ust.x + alt.x) / 2
  const cy = (ust.y + alt.y) / 2
  const yari = dikisPx / 2
  const yatay = Number.isFinite(ufukY) ? ufukY : cy

  /*
   * ───────────────────────────────────────────────────────────────────────
   * TASARIM KÖŞEYE KENDİ NORMAL GÖRÜNTÜSÜYLE GELİYOR; ŞEKLİ KULLANICI VERİYOR.
   *
   * Burada bir zamanlar yan yüzün perspektifi FOTOĞRAFTAN kestiriliyordu:
   * kadrajın asal noktası, köşe çizgisinden türetilen ufuk, izleme mesafesi
   * ve odak uzunluğu. Matematiği doğruydu ama girdileri değildi — bir
   * fotoğraf açı verir, uzunluk vermez. Kamera eğik tutulmuşsa, fotoğraf
   * kırpılmışsa ya da arka plan tam karşıdan çekilmemişse kanat duvarın
   * hattından sapıyordu. Birçok tur denendi (asal noktaya nişan, ufka nişan,
   * derinlik haritasından düzlem); hiçbiri her karede tutmadı ve her
   * denemede ekranda "havada açılmış bir kapak" görüntüsü kalıyordu.
   *
   * Artık kestirim YOK. İki kanat da işaretlenen köşeye kendi gerçek
   * ölçüsüyle, kısalmasız oturuyor; köşenin duruşunu kullanıcı veriyor —
   * fareyle taşıyarak ve iki tuş takımıyla. Kullanıcı duvarın kendi hattını
   * gözüyle görüyor; bizim tahmin etmeye çalıştığımız şey onun zaten önünde.
   *
   * KANAT BAŞINA İKİ SERBESTLİK, ki her duruş erişilebilir olsun:
   *   EĞİM    — uzak kenarın iki ucu birlikte dönüyor: kanat yukarı/aşağı
   *             yatıyor. Alt kenarı zemin hattına paralel getiren budur.
   *   DARALMA — uçlar TERS yönde dönüyor: uzak kenar kısalıyor, kanat
   *             geriye doğru çekiliyor. Katlanma hissini veren budur.
   * İkisi de sıfırken tasarım düpedüz duruyor, yani "normal kendi görüntüsü".
   * ───────────────────────────────────────────────────────────────────────
   */

  /* Kanadın uzak kenarı: dikişin w metre ötelenmiş kopyası, kısalma yok. */
  const duzYuz = (wM, yon) => {
    const yanal = wM * m
    return [
      { x: ust.x + nx * yanal * yon, y: ust.y + ny * yanal * yon },
      { x: alt.x + nx * yanal * yon, y: alt.y + ny * yanal * yon },
    ]
  }

  /*
   * 'orta' DA ARTIK DÜZ GELİYOR.
   *
   * Burada iki kanadı 45 derece katlayıp izleme mesafesine göre kısaltan bir
   * hesap vardı. Kalan son otomatik perspektifti; kullanıcı her şeyi tuşlarla
   * vermek istiyor, o yüzden o da kalktı. Üç köşe seçeneği de aynı şekilde
   * düz başlıyor, farkları yalnızca hangi kanadın koyu çizildiği.
   */

  /*
   * ───────────────────────────────────────────────────────────────────────
   * ŞEKLİ UYGULA — HER KENAR AYRI AYRI.
   *
   * Önce iki tuş vardı: biri iki kenarı BİRLİKTE çeviriyordu (eğim), öteki
   * TERS yönde (daralma). Matematik olarak yeterliydi ama kullanımı değildi:
   * kullanıcı üst kenarı tavan hattına oturtmak için ikisini birden
   * ayarlamak zorunda kalıyor, alt kenar da nereye düşerse düşüyordu —
   * "üst duvar çizgisine hizaladım ama alt kısımlar aşırı sivri duruyor".
   *
   * Ekranda hizalanacak şey zaten iki ayrı çizgi: tavan hattı ve zemin
   * hattı. Tuşlar da öyle: her kanadın üst kenarı ve alt kenarı bağımsız.
   * İçerideki hesap aynı — her uzak uç dikişin KENDİ ucu etrafında dönüyor.
   *
   * Dönme merkezi neden dikişin ucu: uzak kenarı kendi ortası etrafında
   * çevirmeyi de denedim ve ölçtüm — uzak kenarı DİK olan bir kanatta
   * neredeyse hiçbir şey olmuyor, çünkü uçlar o zaman yanlamasına kayıyor
   * (10 derecede alt kenarın eğimi 0'dan yalnızca −0,008'e gidiyordu).
   * Dikiş ucundan çevrilince kenar gerçekten o kadar derece dönüyor,
   * kanadın eni ve dikişin yeri de yerinde kalıyor.
   *
   * ÇÖKME KORUMASI. İki kenar birbirine doğru çevrilirse uzak kenar önce bir
   * noktaya iner, sonra TERS çevrilir ve kanat kendi içine katlanır. Sonuç
   * dikişin dörtte birinden kısa çıkarsa iki açı da aynı oranda geri
   * alınıyor; kullanıcı sınıra dayandığını görüyor ama bozuk bir şekil
   * hiçbir zaman çizilmiyor.
   * ───────────────────────────────────────────────────────────────────────
   */
  const sekilVer = (kenar, ustAci, altAci) => {
    if (!kenar) return kenar
    const au = ((Number(ustAci) || 0) * Math.PI) / 180
    const aa = ((Number(altAci) || 0) * Math.PI) / 180
    if (!(Math.abs(au) > 1e-6) && !(Math.abs(aa) > 1e-6)) return kenar
    const cevir = (q, merkez, aci2) => {
      const c2 = Math.cos(aci2)
      const s2 = Math.sin(aci2)
      return {
        x: merkez.x + (q.x - merkez.x) * c2 - (q.y - merkez.y) * s2,
        y: merkez.y + (q.x - merkez.x) * s2 + (q.y - merkez.y) * c2,
      }
    }
    const dene = (oran) => [
      cevir(kenar[0], ust, au * oran),
      cevir(kenar[1], alt, aa * oran),
    ]
    const enAz = dikisPx * 0.25
    /*
     * UZUNLUK TEK BASINA YETMIYOR: kenar sifiri gecip TERS donunce boyu
     * yeniden buyuyor ve olcut tekrar saglaniyor. Olculdu: ust +30 / alt -30
     * derecede uzak kenar 120 px (taban), +40'ta 137, +45'te 199 -- ama
     * kanat coktan icine katlanmis oluyor. O yuzden kenarin YONU de
     * bakiliyor: dikisle ayni yone bakmayi birakirsa gecersiz. Iki kosul
     * birlikte tek yonlu, dolayisiyla ikili arama dogru calisiyor.
     */
    const uygun = (d) => {
      const vx = d[1].x - d[0].x
      const vy = d[1].y - d[0].y
      if (!(Math.hypot(vx, vy) >= enAz)) return false
      return vx * dx + vy * dy > 0
    }
    let sonuc = dene(1)
    if (!uygun(sonuc)) {
      let dusuk = 0
      let yuksek = 1
      for (let i = 0; i < 24; i++) {
        const orta = (dusuk + yuksek) / 2
        if (uygun(dene(orta))) dusuk = orta
        else yuksek = orta
      }
      sonuc = dene(dusuk)
    }
    return sonuc
  }

  const ortaMi = kose === 'orta'
  const solKenar = duzYuz(solM, 1)
  const sagKenar = duzYuz(sagM, -1)
  const solSekilli = sekilVer(solKenar, solUstAci, solAltAci)
  const sagSekilli = sekilVer(sagKenar, sagUstAci, sagAltAci)

  /*
   * TAŞIRKEN ŞEKİL AYNEN KALIYOR.
   *
   * Bir ara burada şu vardı: şekil verildiği an iki kenarın buluştuğu nokta
   * (duvarın kaçış noktası) hesaplanıyor, ekran taşındıkça kenarlar hep oraya
   * nişanlanıyordu. Geometrisi doğruydu — ekran yukarı kaydıkça alt kenar
   * düzleşip üst kenar dikleşiyordu, gerçek perspektifte olması gereken de
   * buydu. Ama ekranda "sağ kanadın üstü çıkık duruyor" görüntüsü veriyordu
   * ve kullanıcı ayarladığı şeklin kendiliğinden değişmesini istemiyor.
   *
   * Artık hiçbir otomatik yeniden hesap yok: tuşlarla ne verildiyse o kalıyor,
   * taşımak yalnızca yerini değiştiriyor.
   */
  const [solUst, solAlt] = solSekilli
  const [sagUst, sagAlt] = sagSekilli

  /*
   * KOYU ÇİZİLEN KANAT, GERÇEKTEN DÖNEN KANAT.
   *
   * Gölge artık varsayımdan değil kullanıcının verdiği şekilden: hangi kanat
   * daha çok daraltılmışsa köşeyi dönen odur. İkisi de şekilsizken tasarım
   * düpedüz duruyor; orada bir kanadı karartmak yanlış olurdu, o yüzden
   * karartma hiç uygulanmıyor (bkz. LKoseEkran).
   */
  const solSekil = Math.abs((Number(solUstAci) || 0) - (Number(solAltAci) || 0))
  const sagSekil = Math.abs((Number(sagUstAci) || 0) - (Number(sagAltAci) || 0))
  const sekilliMi = solSekil > 0 || sagSekil > 0

  return {
    /* Sol kanat: uzak ucundan dikişe (soldan sağa). */
    sol: [solUst, ust, alt, solAlt],
    /* Sağ kanat: dikişten uzak uca. */
    sag: [ust, sagUst, sagAlt, alt],
    /* Dikiş hizasındaki ölçek — kanatların piksel ölçüsü buradan. */
    pxPerM: m,
    /* Hangi kanat köşeyi dönüyor — gölge onu izliyor. */
    donenSol: solSekil >= sagSekil,
    /* Düpedüz dururken hiçbir kanat karartılmıyor. */
    karartma: sekilliMi,
  }
}

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

  const ortaMi = kose === 'orta'
  const solMu = kose !== 'sag'
  const xk = ortaMi ? cx : solMu ? duvarSol : duvarSag
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
