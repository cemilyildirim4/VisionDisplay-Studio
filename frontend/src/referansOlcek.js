/**
 * ÖLÇEK REFERANSI — fotoğrafta gerçek ölçüsü BİLİNEN bir dikdörtgen.
 *
 * NEDEN BÖYLE BİR ŞEY GEREKİYOR
 *
 * Tek bir fotoğraftan gerçek dünya santimetresi çıkarmak matematiksel olarak
 * imkânsızdır. 1 metrelik bir kutunun 2 metreden çekilmiş fotoğrafı, 2
 * metrelik bir kutunun 4 metreden çekilmiş fotoğrafıyla piksel piksel aynıdır.
 * Görüntü AÇI bilgisi taşır, UZUNLUK bilgisi taşımaz.
 *
 * Bu yüzden ölçek dışarıdan gelmek zorunda. Kamera mesafesi, odak uzaklığı ya
 * da görüş açısı varsayımı bir çözüm değil — hepsi tahmindir ve bu projede
 * daha önce tam olarak bu yüzden tutmadı. Tek dürüst kaynak, kullanıcının
 * fotoğrafta gösterdiği, gerçek ölçüsünü BİLDİĞİ bir nesnedir.
 *
 * YÖNTEM
 *
 * Kullanıcı bir dikdörtgenin dört köşesini işaretler ve gerçek en/boyunu
 * yazar. Düz bir düzlemin kameradaki izdüşümü her zaman bir HOMOGRAFİDİR;
 * dört nokta eşlemesi onu tek biçimde belirler (8 bilinmeyen, 4 nokta × 2
 * koordinat = 8 denklem). Dolayısıyla sonuç yaklaşık değil, KESİNDİR.
 *
 * Perspektif de kendiliğinden çözülür: homografi düzlemin her noktasında
 * doğru ölçeği verir. Gerçek bir ölçümde (bkz. referansOlcek.test.mjs) aynı
 * fotoğrafın bir ucunda 1 cm = 50,18 piksel, öbür ucunda 54,00 piksel çıktı —
 * %7,6 fark. Tek bir ortalama px/cm kullanmak bu kadar hata demek.
 *
 * ÜÇ ŞART (kod denetleyemez, kullanıcıya söylenmeli)
 *
 *   1. Referans gerçekte dikdörtgen olmalı.
 *   2. Ölçülecek şeyle AYNI DÜZLEMDE olmalı. Masadaki bir kataloğu referans
 *      alıp çantanın üstündeki bir şeyi ölçmek yanlış sonuç verir.
 *   3. Dört köşesi de kadrajın içinde olmalı.
 *
 * KOORDİNAT SİSTEMLERİ
 *
 *   DÜNYA    : referans düzleminde santimetre. (0,0) referansın sol üst köşesi
 *   GÖRSEL   : fotoğrafın ORİJİNAL pikseli (naturalWidth × naturalHeight)
 *   TUVAL    : ekranda çizilen piksel — pencere boyutuyla değişir
 *
 * Ölçüm her zaman DÜNYA ↔ GÖRSEL arasında yapılır. Tuval yalnızca gösterim
 * içindir ve hiçbir fiziksel hesaba girmez; pencere büyüyüp küçülünce metre
 * değişmesin diye.
 */

import { duvarDunyasi, dunyaDortgeni } from './homografi.js'

/** Referansın kenarı bundan kısaysa ölçek güvenilmez (orijinal görsel pikseli). */
const EN_AZ_KENAR_PX = 24

/** Gerçek ölçü bundan küçükse yazım hatasıdır (santimetre). */
const EN_AZ_OLCU_CM = 0.5

/**
 * Referans verisinin biçimi — tek kaynak burasıdır.
 *
 * @typedef {Object} Referans
 * @property {Array<{x:number,y:number}>} koseler ORİJİNAL görsel pikseli,
 *           sırayla: sol üst, sağ üst, sağ alt, sol alt
 * @property {number} enCm  dikdörtgenin gerçek genişliği (cm)
 * @property {number} boyCm dikdörtgenin gerçek yüksekliği (cm)
 */

/** Boş bir referans — kullanıcı henüz işaretlemediğinde. */
export function bosReferans() {
  return { koseler: null, enCm: 0, boyCm: 0 }
}

/**
 * Referans kullanılabilir mi?
 *
 * Eksik ya da bozuk bir referansla kalibrasyon kurmak, sessizce yanlış ölçü
 * üretmek demek olurdu. Burada ne eksikse adıyla söyleniyor ki arayüz
 * kullanıcıya doğru cümleyi kurabilsin.
 *
 * @returns {{tamam: boolean, sebep: string|null}}
 */
export function referansDenetle(ref) {
  if (!ref) return { tamam: false, sebep: 'yok' }
  const k = ref.koseler
  if (!Array.isArray(k) || k.length !== 4) return { tamam: false, sebep: 'koseYok' }
  if (k.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return { tamam: false, sebep: 'koseBozuk' }
  if (!(ref.enCm > EN_AZ_OLCU_CM) || !(ref.boyCm > EN_AZ_OLCU_CM))
    return { tamam: false, sebep: 'olcuYok' }

  /* Kenarlar ölçülemeyecek kadar kısaysa birkaç piksellik okuma hatası bile
     ölçeği uçurur: 10 pikselde yapılan 2 piksellik hata %20'dir. */
  const uz = (a, b) => Math.hypot(k[b].x - k[a].x, k[b].y - k[a].y)
  const kenarlar = [uz(0, 1), uz(1, 2), uz(2, 3), uz(3, 0)]
  if (Math.min(...kenarlar) < EN_AZ_KENAR_PX) return { tamam: false, sebep: 'kucuk' }

  /* Dışbükey değilse dörtgen kendi üstüne katlanmıştır; homografi ters döner. */
  let arti = 0
  let eksi = 0
  for (let i = 0; i < 4; i++) {
    const a = k[i]
    const b = k[(i + 1) % 4]
    const c = k[(i + 2) % 4]
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (z > 0) arti++
    else if (z < 0) eksi++
  }
  if (arti !== 0 && eksi !== 0) return { tamam: false, sebep: 'katlanmis' }

  return { tamam: true, sebep: null }
}

/**
 * Referanstan kalibrasyon kurar.
 *
 * Dönen nesne DÜNYA (cm) ile GÖRSEL (orijinal piksel) arasındaki iki yönlü
 * dönüşümdür. Tuval/CSS/zoom buraya hiç girmez.
 *
 * @param {Referans} ref
 * @returns {Object|null} kalibrasyon ya da kurulamadıysa null
 */
export function kalibrasyonKur(ref) {
  if (!referansDenetle(ref).tamam) return null
  const d = duvarDunyasi(ref.koseler, ref.enCm, ref.boyCm)
  if (!d) return null

  return {
    enCm: ref.enCm,
    boyCm: ref.boyCm,
    /** Düzlemde (xCm, yCm) → orijinal görsel pikseli. */
    cmdenGorsele: (xCm, yCm) => d.ileri(xCm, yCm),
    /** Orijinal görsel pikseli → düzlemde santimetre. */
    gorseldenCm: (px, py) => d.geri(px, py),
    /**
     * Düzlemde duran bir dikdörtgenin fotoğraftaki DÖRT köşesi.
     *
     * Dört köşe ayrı ayrı dönüştürülüyor: perspektifte kutunun kenarları eşit
     * uzunlukta görünmek zorunda değil, bu yüzden x/y/en/boy ile bir CSS
     * dikdörtgeni kurmak yetmez.
     */
    kutuDortgeni: (xCm, yCm, enCm, boyCm) => dunyaDortgeni(d, xCm, yCm, enCm, boyCm),
    /**
     * O noktada 1 cm kaç piksel eder — yatay ve dikey ayrı.
     *
     * Perspektifte bu değer düzlemin her yerinde farklıdır; tek bir global
     * px/cm diye bir şey yoktur. Arayüzde bir sayı gösterilecekse hangi
     * noktada ölçüldüğü söylenmeli.
     */
    yerelOlcek: (xCm, yCm) => {
      const a = d.ileri(xCm, yCm)
      const bx = d.ileri(xCm + 1, yCm)
      const by = d.ileri(xCm, yCm + 1)
      if (!a || !bx || !by) return null
      return {
        x: Math.hypot(bx.x - a.x, bx.y - a.y),
        y: Math.hypot(by.x - a.x, by.y - a.y),
      }
    },
  }
}

/**
 * Bir kutuyu referans dikdörtgenin ortasına yerleştiren konum (cm).
 *
 * Kutu referanstan büyükse ortalama yine de anlamlı: kutu referansı taşar ve
 * iki yana eşit taşar. Ölçüyü küçültmek yanlış olurdu — kullanıcının girdiği
 * fiziksel ölçü değişmemeli.
 */
export function merkezeYerlestir(kalibrasyon, enCm, boyCm) {
  if (!kalibrasyon || !(enCm > 0) || !(boyCm > 0)) return null
  return {
    x: (kalibrasyon.enCm - enCm) / 2,
    y: (kalibrasyon.boyCm - boyCm) / 2,
  }
}

/**
 * TUVAL ↔ GÖRSEL — yalnızca gösterim için.
 *
 * Fotoğraf tuvale sığdırılarak çiziliyor (bkz. sahneler.js → fotoYerlesim) ve
 * ayrıca bir yakınlık çarpanı olabiliyor. Bu iki dönüşüm o yerleşimi geri
 * alıp orijinal görsel pikseline iner. Fiziksel hesap buraya HİÇ bakmaz;
 * pencere boyutu değiştiğinde metre değişmesin diye.
 *
 * @param {{sol:number, ust:number, s:number}} fotoYer
 * @param {number} yakinlik tuval merkezine göre ölçek (1 = yok)
 * @param {{w:number,h:number}} tuvalBoyut
 */
export function tuvaldenGorsele(nokta, fotoYer, yakinlik, tuvalBoyut) {
  if (!nokta || !(fotoYer?.s > 0) || !(tuvalBoyut?.w > 0)) return null
  const z = yakinlik > 0 ? yakinlik : 1
  const mX = tuvalBoyut.w / 2
  const mY = tuvalBoyut.h / 2
  return {
    x: (mX + (nokta.x - mX) / z - fotoYer.sol) / fotoYer.s,
    y: (mY + (nokta.y - mY) / z - fotoYer.ust) / fotoYer.s,
  }
}

/** tuvaldenGorsele'nin tersi. */
export function gorseldenTuvale(nokta, fotoYer, yakinlik, tuvalBoyut) {
  if (!nokta || !(fotoYer?.s > 0) || !(tuvalBoyut?.w > 0)) return null
  const z = yakinlik > 0 ? yakinlik : 1
  const mX = tuvalBoyut.w / 2
  const mY = tuvalBoyut.h / 2
  return {
    x: mX + (fotoYer.sol + nokta.x * fotoYer.s - mX) * z,
    y: mY + (fotoYer.ust + nokta.y * fotoYer.s - mY) * z,
  }
}

/** Metre ↔ santimetre: tasarım tarafı metre, referans tarafı santimetre konuşuyor. */
export const mToCm = (m) => m * 100
export const cmToM = (cm) => cm / 100
