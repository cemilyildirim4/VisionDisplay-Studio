/*
 * KAMERA GEOMETRİSİNDEN GERÇEK PİKSEL/SANTİM.
 *
 * Tek bir fotoğraf kendi başına UZUNLUK taşımaz, açı taşır. 2 m uzaktaki 1
 * m'lik bir nesne, 4 m uzaktaki 2 m'lik nesneyle piksel piksel aynıdır. Bu
 * belirsizliği kırmanın iki dürüst yolu var:
 *   1) Ölçüm düzleminde uzunluğu BİLİNEN bir nesne (referans) — kaldırıldı.
 *   2) Kameranın odak uzaklığı + düzleme olan MESAFE — bu dosya.
 *
 * İkincisinin matematiği kesindir, tahmin içermez:
 *
 *   f_piksel = odakUzaklığı_mm × görselinKöşegeni_px / sensörKöşegeni_mm
 *   px/cm    = f_piksel / mesafe_cm
 *
 * HESAP KÖŞEGEN ÜZERİNDEN YAPILIYOR, KENAR ÜZERİNDEN DEĞİL.
 *
 * "35 mm eşdeğeri odak uzaklığı" tanım gereği KÖŞEGEN oranıyla verilir:
 *   f35 = f_gerçek × (köşegen35 / köşegenSensör),  köşegen35 = √(36² + 24²)
 * Buradan piksel karşılığı türetilince sensör ölçüleri sadeleşiyor:
 *   f_piksel = f_gerçek × W_px / sensörW
 *            = f35 × (köşegenSensör/köşegen35) × W_px / sensörW
 *            = f35 × köşegen_px / köşegen35          (sensörW/köşegenSensör = W_px/köşegen_px)
 *
 * Bir ara burada "uzunKenar_px / 36" kullanılıyordu. O yalnızca sensör oranı
 * 3:2 iken (36:24) doğru; başka oranlarda sapıyor:
 *   4:3  -> ölçek %4,01 KÜÇÜK çıkıyor
 *   16:9 -> ölçek %4,75 BÜYÜK çıkıyor
 * Telefonlar çoğunlukla 4:3 çektiği için bu, tipik fotoğrafta %4'lük
 * sistematik bir hataydı. Köşegen yöntemi en/boy oranından bağımsız.
 *
 * BURADA VARSAYIM YOK. Gerekli alan yoksa işlev null döner ve EKSİĞİ söyler;
 * ortalama görüş açısı, sabit katsayı ya da "tipik telefon" değeri
 * ÜRETİLMEZ. Eksik veriyle çizilen kutu, ölçü gibi görünen bir yalandır.
 *
 * GEÇERLİLİK ŞARTLARI — çağıran taraf bilmek zorunda:
 *   - px/cm yalnızca optik eksene DİK düzlemde geçerli. Başlangıç kutusu
 *     eksenlere paralel bir dikdörtgen olduğu için bu şart kendiliğinden
 *     sağlanıyor; kullanıcı köşeleri çekip perspektif verdiğinde kutu artık
 *     dik düzlemde değil ve o andan sonra px/cm tek bir sayı değil.
 *   - Mesafe, lensten ölçüm DÜZLEMİNE olan dik uzaklık.
 *   - Fotoğraf çekimden sonra KIRPILMAMIŞ olmalı. Yeniden boyutlandırma
 *     sorun değil (f_piksel aynı oranda ölçeklenir), kırpma ölçeği bozar.
 */

/*
 * 35 mm tam kare (full-frame) kadrajın köşegeni: 36 × 24 mm -> 43,2666 mm.
 * "35 mm eşdeğeri" bu köşegene göre tanımlıdır.
 */
const DIAG35_MM = Math.hypot(36, 24)

/* Okunan EXIF etiketleri. Gerisi bu hesapta işe yaramıyor. */
const ETIKET = {
  0x010f: 'marka',
  0x0110: 'model',
  0x0112: 'yon',
  0x8769: '_exifIfd',
  0x920a: 'odakMm',
  0xa405: 'odak35Mm',
  0xa20e: 'sensorXYogunluk',
  0xa20f: 'sensorYYogunluk',
  0xa210: 'sensorBirim',
  0xa002: 'exifW',
  0xa003: 'exifH',
  0xa434: 'lens',
}

/* EXIF tür kodlarının bayt boyu. */
const TUR_BOYU = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8, 11: 4, 12: 8 }

/* APP1 segmenti dosyanın başındadır; tamamını okumak gerekmiyor. */
const OKUNACAK_BAYT = 256 * 1024

/**
 * JPEG'in APP1/Exif bloğunu ayrıştırır.
 *
 * Kütüphane eklenmedi: gereken alanlar on kadar etiket ve TIFF IFD yapısı yüz
 * satırdan kısa. Dışarıdan bir ayrıştırıcı, bu hesabın en kritik adımını
 * okunamayan bir kara kutuya taşırdı.
 *
 * @returns {Promise<object|null>} alanlar, ya da EXIF yoksa { yok: true }
 */
export async function exifOku(dosya) {
  if (!dosya || typeof dosya.arrayBuffer !== 'function') return null
  const parca = dosya.slice(0, Math.min(OKUNACAK_BAYT, dosya.size))
  const ab = await parca.arrayBuffer()
  const b = new DataView(ab)
  if (b.byteLength < 4) return { yok: true, sebep: 'dosya çok küçük' }
  if (b.getUint16(0) !== 0xffd8) return { yok: true, sebep: 'JPEG değil' }

  /* APP1'i bul: segmentler ff<marker><uzunluk> diye zincirleniyor. */
  let i = 2
  let tiff = -1
  while (i + 4 <= b.byteLength) {
    if (b.getUint8(i) !== 0xff) break
    const marker = b.getUint8(i + 1)
    /* Görüntü verisi başladıysa EXIF yok. */
    if (marker === 0xda || marker === 0xd9) break
    const uz = b.getUint16(i + 2)
    if (uz < 2) break
    if (marker === 0xe1 && i + 10 <= b.byteLength) {
      let imza = ''
      for (let k = 0; k < 4; k++) imza += String.fromCharCode(b.getUint8(i + 4 + k))
      if (imza === 'Exif') {
        tiff = i + 10
        break
      }
    }
    i += 2 + uz
  }
  if (tiff < 0) return { yok: true, sebep: 'APP1/Exif segmenti yok' }
  if (tiff + 8 > b.byteLength) return { yok: true, sebep: 'Exif bloğu kesik' }

  /* TIFF başlığı bayt sırasını söylüyor: MM büyük uçlu, II küçük uçlu. */
  const buyuk = b.getUint16(tiff) === 0x4d4d
  const u16 = (o) => b.getUint16(tiff + o, !buyuk)
  const u32 = (o) => b.getUint32(tiff + o, !buyuk)
  const i32 = (o) => b.getInt32(tiff + o, !buyuk)

  const alan = {}
  let derinlik = 0
  const ifdOku = (ofs) => {
    if (derinlik++ > 4 || ofs <= 0 || tiff + ofs + 2 > b.byteLength) return
    const n = u16(ofs)
    if (n > 512) return
    for (let k = 0; k < n; k++) {
      const g = ofs + 2 + k * 12
      if (tiff + g + 12 > b.byteLength) return
      const etiket = u16(g)
      const ad = ETIKET[etiket]
      if (!ad) continue
      const tur = u16(g + 2)
      const say = u32(g + 4)
      const bayt = (TUR_BOYU[tur] || 1) * say
      const veri = bayt <= 4 ? g + 8 : u32(g + 8)
      if (ad === '_exifIfd') {
        /*
         * Alt IFD işaretçisi bir LONG DEĞERİ; 4 bayta sığdığı için alanın
         * içinde duruyor. Burada `veri` (alanın adresi) değil, o adresten
         * OKUNAN sayı gerekiyor — ikisi karıştırılınca ExifIFD hiç
         * ayrıştırılmıyor ve odak uzaklığı alanları sessizce kayboluyor.
         */
        ifdOku(u32(g + 8))
        continue
      }
      if (tiff + veri + Math.max(bayt, 1) > b.byteLength) continue
      try {
        if (tur === 2) {
          let t = ''
          for (let j = 0; j < say; j++) {
            const c = b.getUint8(tiff + veri + j)
            if (!c) break
            t += String.fromCharCode(c)
          }
          alan[ad] = t.trim()
        } else if (tur === 3) alan[ad] = u16(veri)
        else if (tur === 4) alan[ad] = u32(veri)
        else if (tur === 5 || tur === 10) {
          const p = tur === 5 ? u32(veri) : i32(veri)
          const q = tur === 5 ? u32(veri + 4) : i32(veri + 4)
          if (q) alan[ad] = p / q
        }
      } catch {
        /* Bozuk alan atlanıyor; kalanlar hâlâ işe yarar. */
      }
    }
  }
  ifdOku(u32(4))
  return Object.keys(alan).length ? alan : { yok: true, sebep: 'Exif bloğu boş' }
}

/**
 * Sensörün mm ölçüleri — EXIF'te varsa.
 *
 * FocalPlaneXResolution, sensör düzlemindeki piksel/birim yoğunluğu. Sensörün
 * X kenarı = exifW / yoğunluk, birim de ayrı bir etiketten.
 *
 * KÖŞEGEN DE DÖNÜYOR, çünkü f_piksel köşegen üzerinden hesaplanıyor. Dikey
 * çekilmiş ya da tarayıcının EXIF yönüne göre döndürdüğü fotoğrafta görselin
 * genişliği sensörün X kenarına karşılık gelmeyebiliyor; köşegen dönmeden
 * etkilenmediği için bu belirsizliği ortadan kaldırıyor.
 *
 * Y yoğunluğu yoksa sensörün en/boy oranı görüntünün EXIF oranına eşit
 * sayılıyor — bu bir tahmin değil, aynı sensörün aynı piksel aralığına sahip
 * olmasının sonucu (kare piksel).
 */
function sensorOlculeriMm(exif) {
  const yogX = Number(exif?.sensorXYogunluk)
  const pxW = Number(exif?.exifW)
  const pxH = Number(exif?.exifH)
  if (!(yogX > 0) || !(pxW > 0)) return null
  /* 2 = inç, 3 = cm, 4 = mm. Belirtilmemişse EXIF varsayılanı inç. */
  const birim = Number(exif?.sensorBirim) || 2
  const mmKatsayi = birim === 3 ? 10 : birim === 4 ? 1 : 25.4
  const wMm = (pxW / yogX) * mmKatsayi
  /* Akla yatkınlık: 1 mm'den küçük ya da 100 mm'den büyük sensör yok. */
  if (!(wMm > 1 && wMm < 100)) return null
  const yogY = Number(exif?.sensorYYogunluk)
  const hMm = yogY > 0 && pxH > 0 ? (pxH / yogY) * mmKatsayi : pxH > 0 ? (wMm * pxH) / pxW : null
  if (!(hMm > 0.5 && hMm < 100)) return null
  return { wMm, hMm, diagMm: Math.hypot(wMm, hMm) }
}

/**
 * Odak uzaklığını PİKSEL olarak verir.
 *
 * @param exif exifOku çıktısı
 * @param gorselW yüklenen görselin gerçek piksel genişliği (naturalWidth)
 * @param gorselH naturalHeight
 */
export function odakPikseli(exif, gorselW, gorselH) {
  const eksik = []
  if (!exif || exif.yok) {
    return { fpx: null, eksik: ['EXIF bloğu'], sebep: exif?.sebep || 'EXIF yok' }
  }
  if (!(gorselW > 0) || !(gorselH > 0)) return { fpx: null, eksik: ['görsel çözünürlüğü'] }

  /*
   * KIRPMA DENETİMİ.
   *
   * f_piksel görselin uzun kenarına bağlı. EXIF'teki çözünürlük çekim anındaki
   * çözünürlüktür; dosya o günden beri küçültülmüş olabilir (WhatsApp,
   * e-posta). Saf küçültme ölçeği bozmaz: f_piksel aynı oranda küçülür ve
   * zaten gorselW/gorselH ile hesaplandığı için kendiliğinden düzelir.
   *
   * KIRPMA bozar: kadrajın bir kısmı atıldığı için uzun kenar artık aynı
   * görüş açısını kapsamıyor. Kırpmayı en/boy oranının değişmesinden
   * anlıyoruz. Oran korunacak biçimde kırpılmışsa ayırt edilemez — bu yüzden
   * GARANTİ değil, yakalanabilen hataların denetimi.
   */
  let kirpmaSuphesi = false
  if (exif.exifW > 0 && exif.exifH > 0) {
    const exifOran = exif.exifW / exif.exifH
    const gorselOran = gorselW / gorselH
    /* Yön etiketi 5..8 ise görsel 90 derece çevrilmiş sayılıyor. */
    const cevrik = Number(exif.yon) >= 5 && Number(exif.yon) <= 8
    const bekOran = cevrik ? 1 / exifOran : exifOran
    if (Math.abs(bekOran - gorselOran) / gorselOran > 0.01) kirpmaSuphesi = true
  }

  /*
   * Görselin köşegeni. Köşegen, en/boy oranından ve 90 derece dönmeden
   * etkilenmediği için ölçek dönüşümünün doğru dayanağı (bkz. başlık notu).
   */
  const diagPx = Math.hypot(gorselW, gorselH)

  /* 1. YOL: 35 mm eşdeğeri — doğrudan köşegen oranı. */
  const o35 = Number(exif.odak35Mm)
  if (o35 > 0) {
    return { fpx: (o35 * diagPx) / DIAG35_MM, yol: '35mm eşdeğeri', odak35Mm: o35, kirpmaSuphesi }
  }

  /* 2. YOL: gerçek odak uzaklığı + sensör köşegeni. */
  const oMm = Number(exif.odakMm)
  const s = sensorOlculeriMm(exif)
  if (oMm > 0 && s) {
    return {
      fpx: (oMm * diagPx) / s.diagMm,
      yol: 'odak uzaklığı + sensör ölçüsü',
      odakMm: oMm,
      sensorMm: s.wMm,
      sensorBoyMm: s.hMm,
      sensorDiagMm: s.diagMm,
      kirpmaSuphesi,
    }
  }

  if (!(oMm > 0)) eksik.push('odak uzaklığı (FocalLength)')
  if (!(o35 > 0)) eksik.push('35 mm eşdeğeri (FocalLengthIn35mmFilm)')
  if (oMm > 0 && !s) eksik.push('sensör ölçüsü (FocalPlaneXResolution)')
  return { fpx: null, eksik }
}

/**
 * Gerçek piksel/santim.
 *
 * Kare piksel DIŞINDA varsayım yok: aynı sensörde yatay ve dikey piksel
 * aralığı eşit olduğu için pxPerCmX = pxPerCmY. Dijital kameralarda bu
 * istisnasız böyle (anamorfik optik hariç, o da telefonlarda yok).
 *
 * MESAFE, OBJEKTİFİN OPTİK MERKEZİNDEN ölçüm düzlemine olan dik uzaklıktır —
 * gövdenin arkasından, ekrandan ya da ayaktan değil. Yakın çekimde fark
 * oransal olarak büyük: 30 cm'lik bir ölçümde 1 cm'lik kayma %3,3 hata.
 */
export function pikselSantim(fpx, mesafeCm) {
  const d = Number(mesafeCm)
  if (!(fpx > 0) || !(d > 0)) return null
  const pxCm = fpx / d
  return { x: pxCm, y: pxCm }
}

/**
 * Kutunun GERÇEK başlangıç dörtgeni — normalize fotoğraf koordinatında.
 *
 * Mutlak büyüklük fiziksel hesaptan geliyor; "fotoğrafın %60'ı" gibi bir
 * başlangıç boyutu yok. Kutu kadraja sığmıyorsa KÜÇÜLTÜLMÜYOR — ölçü
 * yanlışlanmasın diye olduğu gibi dönüyor ve tasiyor ile bildiriliyor.
 */
export function gercekKutuDortgeni(enCm, boyCm, pxCm, gorselW, gorselH, merkez = { x: 0.5, y: 0.5 }) {
  if (!pxCm || !(enCm > 0) || !(boyCm > 0) || !(gorselW > 0) || !(gorselH > 0)) return null
  const pxW = enCm * pxCm.x
  const pxH = boyCm * pxCm.y
  const nW = pxW / gorselW
  const nH = pxH / gorselH
  const mx = Math.min(1 - nW / 2, Math.max(nW / 2, merkez.x))
  const my = Math.min(1 - nH / 2, Math.max(nH / 2, merkez.y))
  return {
    pxW,
    pxH,
    koseler: [
      { x: mx - nW / 2, y: my - nH / 2 },
      { x: mx + nW / 2, y: my - nH / 2 },
      { x: mx + nW / 2, y: my + nH / 2 },
      { x: mx - nW / 2, y: my + nH / 2 },
    ],
    tasiyor: nW > 1 || nH > 1,
  }
}

/*
 * 96 PPI DENEME MODU — KALİBRASYON DEĞİL.
 *
 * CSS, 1 inç = 96 piksel tanımlar. Buradan sabit bir çevrim çıkıyor:
 *   px = cm × 96 / 2,54 = cm × 37,795276
 *
 * BU BİR FOTOĞRAF KALİBRASYONU DEĞİLDİR ve öyle adlandırılmamalıdır.
 * Fotoğrafın gerçek ölçeğiyle hiçbir ilgisi yok: fotoğraf 30 cm'den de 3
 * metreden de çekilmiş olsa bu sayı aynı kalır. Dolayısıyla bu modda kurulan
 * kutu, fotoğraftaki gerçek bir nesneyle ÖLÇÜ KARŞILAŞTIRMASINA GİRMEZ.
 *
 * Tek işi fiziksel ORAN denetimi: aynı çevrimden geçen 30 × 21 cm kutu ile
 * 32 × 16 cm tasarımın birbirine oranı kesin doğru çıkıyor
 * (1209,45 / 1133,86 = 32/30). Ölçek bilinmediğinde oranın bozulmadığını
 * göstermek için.
 *
 * Gerçek ölçek yalnızca kamera geometrisi + çekim mesafesinden çıkıyor
 * (bkz. odakPikseli / pikselSantim); o zincire dokunulmuyor.
 */
export const PPI96_PX_PER_CM = 96 / 2.54

/** 96 PPI deneme çevrimi. Mesafe almıyor — ölçekten bağımsız olduğu için. */
export function deneme96PikselSantim() {
  return { x: PPI96_PX_PER_CM, y: PPI96_PX_PER_CM }
}

/**
 * Kadrajın o mesafede kapsadığı gerçek alan — kullanıcıya ölçünün akla yatkın
 * olup olmadığını gösteriyor ("30 cm'den 41,5 cm genişlik görüyorsun").
 */
export function kadrajAlani(fpx, mesafeCm, gorselW, gorselH) {
  if (!(fpx > 0) || !(mesafeCm > 0)) return null
  return { enCm: (gorselW * mesafeCm) / fpx, boyCm: (gorselH * mesafeCm) / fpx }
}
