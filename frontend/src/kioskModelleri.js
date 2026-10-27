/**
 * KİOSK MODELLERİ — Masaüstü Bilişim 2026 kataloğu, sayfa 31–35.
 *
 * Eski "kiosk tipi" seçenekleri (dokunmatik, totem, masa, dış mekân)
 * uydurma gövdelerdi: katalogdaki hiçbir ürüne benzemiyorlardı ve
 * müşteriye giden teklifte olmayan bir ürünün resmi çıkıyordu. Buradaki
 * her kayıt katalogdaki bir modelin karşılığı.
 *
 * ÖLÇÜLER HENÜZ GERÇEK DEĞİL.
 *
 * Katalogda santim ölçüsü yok. Bu yüzden gövde EKRANA GÖRE tanımlı:
 * bütün sayılar ekranın kendi genişliğinin ve yüksekliğinin katı. Ekran
 * nereye oturuyorsa gövde onun etrafında büyüyüp küçülüyor.
 *
 * Gerçek ölçüler geldiğinde tek yapılacak iş her kayda `olcu` (cm)
 * yazmak; parçaların yeri zaten oranla verildiği için şekil değişmiyor.
 *
 * KOORDİNAT SİSTEMİ. Ekranın sol üst köşesi (0, 0), sağ alt köşesi
 * (1, 1). Eksi değerler ekranın solunda/üstünde, 1'den büyükler
 * sağında/altında. `taban`, zeminin ekran alt kenarından kaç ekran boyu
 * aşağıda olduğunu söylüyor.
 *
 * PARÇA TÜRLERİ
 *   kutu  — dikdörtgen (kose ile yuvarlatılır)
 *   yamuk — dört köşesi tek tek verilen dörtgen (eğik gövdeler)
 *   yay   — üstü kavisli kapak (MB-T-100)
 *   aygit — kart okuyucu, tuş takımı, fiş yazıcı gibi küçük parçalar
 *
 * Parçalar yazıldıkları sırada çiziliyor: önce arkada kalanlar.
 */

/* Katalogdaki gövde renkleri. */
const ANTRASIT = '#3f4448'
const ANTRASIT_KOYU = '#2a2e31'
const SIYAH = '#1b1d1f'
const SIYAH_ACIK = '#2b2e31'
const BEYAZ = '#e8eaec'
const BEYAZ_KOYU = '#cfd3d7'
const MAVI = '#5c8fa0'
const MAVI_KOYU = '#4a7684'
const AYGIT = '#15171a'
const TARTI = '#93a3ae'
const TARTI_KOYU = '#5f6d78'
const ISIK = '#9fb3c8'
const YESIL = '#7ddc8a'

export const KIOSK_MODELLERI = [
  /* ---------------------------------------------------------- TOTEM */
  {
    /*
     * Koyu gövde, üstte öne taşan kavisli kapak, altta iki ayak ve
     * aralarında kemer boşluğu (katalog s. 32, soldaki).
     */
    kod: 'MB-T-100',
    grup: 'totem',
    zemin: true,
    taban: 0.42,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: -0.14, y: -0.1, en: 1.28, boy: 1.16, renk: ANTRASIT, kose: 0.03 },
      { tur: 'yay', x: -0.2, y: -0.22, en: 1.4, boy: 0.17, renk: ANTRASIT_KOYU },
      /* İki ayak; aralarındaki boşluk kemer gibi açık kalıyor. */
      { tur: 'kutu', x: -0.14, y: 1.06, en: 0.26, boy: 0.36, renk: ANTRASIT },
      { tur: 'kutu', x: 0.88, y: 1.06, en: 0.26, boy: 0.36, renk: ANTRASIT },
      { tur: 'kutu', x: -0.14, y: 1.06, en: 1.28, boy: 0.1, renk: ANTRASIT },
      { tur: 'kutu', x: -0.05, y: -0.04, en: 1.1, boy: 1.08, renk: SIYAH, kose: 0.01 },
    ],
  },
  {
    /*
     * Açık renk yan ve üst kasa, gövde geriye yatık; sağ kenarda koyu
     * şerit, altta öne açılan kama (katalog s. 32, sağdaki).
     */
    kod: 'MB-T-200',
    grup: 'totem',
    zemin: true,
    taban: 0.34,
    olcu: null,
    parcalar: [
      { tur: 'yamuk', nokta: [[-0.12, -0.12], [1.2, -0.2], [1.26, 1.1], [-0.06, 1.14]], renk: BEYAZ },
      { tur: 'kutu', x: 1.02, y: -0.14, en: 0.14, boy: 1.24, renk: SIYAH, kose: 0.01 },
      { tur: 'yamuk', nokta: [[-0.06, 1.1], [1.26, 1.06], [1.34, 1.34], [-0.16, 1.34]], renk: BEYAZ_KOYU },
      { tur: 'kutu', x: -0.06, y: -0.05, en: 1.1, boy: 1.1, renk: SIYAH, kose: 0.01 },
    ],
  },
  {
    /* Düz siyah totem; ekran üstte, altında dolu gövde (s. 33). */
    kod: 'MB-T-300',
    grup: 'totem',
    zemin: true,
    taban: 0.55,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: -0.06, y: -0.05, en: 1.12, boy: 1.6, renk: SIYAH, kose: 0.02 },
      { tur: 'kutu', x: -0.1, y: 1.5, en: 1.2, boy: 0.05, renk: ANTRASIT_KOYU },
      { tur: 'kutu', x: -0.02, y: -0.02, en: 1.04, boy: 1.04, renk: SIYAH_ACIK, kose: 0.01 },
    ],
  },
  {
    /* Üstte taşan düz kapak, ekran gövdenin ortasında (s. 33). */
    kod: 'MB-T-400',
    grup: 'totem',
    zemin: true,
    taban: 0.62,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: -0.12, y: -0.18, en: 1.24, boy: 1.74, renk: SIYAH, kose: 0.02 },
      { tur: 'kutu', x: -0.18, y: -0.24, en: 1.36, boy: 0.08, renk: ANTRASIT_KOYU, kose: 0.01 },
      { tur: 'kutu', x: -0.12, y: 1.5, en: 1.24, boy: 0.12, renk: ANTRASIT_KOYU },
      { tur: 'kutu', x: -0.04, y: -0.03, en: 1.08, boy: 1.06, renk: SIYAH_ACIK, kose: 0.01 },
    ],
  },
  {
    /* Kalın çerçeveli ekran, altında daralan kaide ve taban plakası (s. 33). */
    kod: 'MB-T-500',
    grup: 'totem',
    zemin: true,
    taban: 0.46,
    olcu: null,
    parcalar: [
      { tur: 'yamuk', nokta: [[0.16, 1.02], [0.84, 1.02], [1.02, 1.38], [-0.02, 1.38]], renk: SIYAH },
      { tur: 'kutu', x: -0.12, y: 1.36, en: 1.24, boy: 0.08, renk: ANTRASIT_KOYU, kose: 0.01 },
      { tur: 'kutu', x: -0.1, y: -0.09, en: 1.2, boy: 1.18, renk: SIYAH, kose: 0.03 },
    ],
  },
  {
    /* Kalın çerçeveli ekran, altında alçak ve geniş yuvarlak kaide (s. 33). */
    kod: 'MB-T-600',
    grup: 'totem',
    zemin: true,
    taban: 0.3,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: -0.22, y: 1.04, en: 1.44, boy: 0.2, renk: SIYAH, kose: 0.04 },
      { tur: 'kutu', x: -0.28, y: 1.2, en: 1.56, boy: 0.08, renk: ANTRASIT_KOYU, kose: 0.03 },
      { tur: 'kutu', x: -0.1, y: -0.09, en: 1.2, boy: 1.16, renk: SIYAH, kose: 0.03 },
    ],
  },

  /* ---------------------------------------------------- SELF-SERVİS */
  {
    /*
     * Ekran solda ayrı bir kolda; iki boru ile sağdaki ince beyaz
     * sütuna bağlı. Sütunda kart okuyucu, tuş takımı ve fiş yazıcı
     * (katalog s. 35, soldaki).
     */
    kod: 'MB-CK-100',
    grup: 'self',
    zemin: true,
    taban: 1.55,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: 1.22, y: -0.12, en: 0.46, boy: 2.6, renk: BEYAZ, kose: 0.02 },
      { tur: 'kutu', x: 1.12, y: 2.44, en: 0.66, boy: 0.1, renk: SIYAH, kose: 0.01 },
      /* Ekranı sütuna bağlayan iki boru. */
      { tur: 'kutu', x: 1.06, y: 0.16, en: 0.18, boy: 0.045, renk: BEYAZ_KOYU },
      { tur: 'kutu', x: 1.06, y: 0.68, en: 0.18, boy: 0.045, renk: BEYAZ_KOYU },
      { tur: 'aygit', x: 1.3, y: 0.3, en: 0.14, boy: 0.1, renk: AYGIT },
      { tur: 'aygit', x: 1.47, y: 0.3, en: 0.13, boy: 0.13, renk: AYGIT },
      { tur: 'aygit', x: 1.3, y: 0.46, en: 0.3, boy: 0.22, renk: AYGIT },
      { tur: 'aygit', x: 1.3, y: 0.78, en: 0.3, boy: 0.3, renk: SIYAH },
      { tur: 'aygit', x: 1.3, y: 1.3, en: 0.13, boy: 0.02, renk: ISIK },
      { tur: 'aygit', x: 1.47, y: 1.3, en: 0.13, boy: 0.02, renk: ISIK },
      { tur: 'kutu', x: -0.07, y: -0.07, en: 1.14, boy: 1.14, renk: SIYAH, kose: 0.04 },
    ],
  },
  {
    /*
     * Mavi-gri tek gövde: ekran geniş yuvarlak çerçevede, altında
     * aygıt paneli, gövde aşağıda kaideye iniyor (katalog s. 35, orta).
     */
    kod: 'MB-CK-200',
    grup: 'self',
    zemin: true,
    taban: 1.5,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: -0.12, y: -0.1, en: 1.24, boy: 1.62, renk: MAVI, kose: 0.06 },
      { tur: 'yamuk', nokta: [[0.12, 1.52], [0.88, 1.52], [0.96, 2.5], [0.04, 2.5]], renk: MAVI_KOYU },
      { tur: 'aygit', x: -0.02, y: 1.12, en: 0.3, boy: 0.22, renk: AYGIT },
      { tur: 'aygit', x: 0.32, y: 1.12, en: 0.2, boy: 0.22, renk: AYGIT },
      { tur: 'aygit', x: 0.56, y: 1.14, en: 0.24, boy: 0.14, renk: AYGIT },
      { tur: 'aygit', x: -0.02, y: 1.42, en: 0.26, boy: 0.03, renk: BEYAZ },
      { tur: 'aygit', x: 0.46, y: 1.42, en: 0.26, boy: 0.03, renk: BEYAZ },
      { tur: 'aygit', x: 0.3, y: 1.38, en: 0.12, boy: 0.12, renk: AYGIT },
      { tur: 'kutu', x: -0.05, y: -0.04, en: 1.1, boy: 1.08, renk: SIYAH, kose: 0.03 },
    ],
  },
  {
    /*
     * Beyaz sütun: ekran üstte, altında aygıt paneli, gövde taban
     * plakasına iniyor (katalog s. 35, sağdaki).
     */
    kod: 'MB-CK-300',
    grup: 'self',
    zemin: true,
    taban: 1.9,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: -0.04, y: 1.04, en: 1.08, boy: 0.52, renk: BEYAZ, kose: 0.02 },
      { tur: 'kutu', x: 0.04, y: 1.52, en: 0.92, boy: 1.3, renk: BEYAZ_KOYU },
      { tur: 'kutu', x: -0.16, y: 2.76, en: 1.32, boy: 0.12, renk: BEYAZ, kose: 0.02 },
      { tur: 'aygit', x: 0.02, y: 1.1, en: 0.34, boy: 0.2, renk: AYGIT },
      { tur: 'aygit', x: 0.46, y: 1.1, en: 0.26, boy: 0.16, renk: AYGIT },
      { tur: 'aygit', x: 0.46, y: 1.3, en: 0.14, boy: 0.14, renk: AYGIT },
      { tur: 'aygit', x: 0.04, y: 1.42, en: 0.3, boy: 0.025, renk: YESIL },
      { tur: 'aygit', x: 0.44, y: 1.42, en: 0.3, boy: 0.025, renk: YESIL },
      { tur: 'kutu', x: -0.05, y: -0.05, en: 1.1, boy: 1.1, renk: SIYAH, kose: 0.02 },
    ],
  },
  {
    /* CK-100'ün bagaj tartılı hâli (katalog s. 34, soldaki). */
    kod: 'MB-CKW-100',
    grup: 'self',
    zemin: true,
    taban: 1.55,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: 1.22, y: -0.12, en: 0.46, boy: 2.6, renk: BEYAZ, kose: 0.02 },
      { tur: 'kutu', x: 1.12, y: 2.44, en: 0.66, boy: 0.1, renk: SIYAH, kose: 0.01 },
      { tur: 'kutu', x: 1.06, y: 0.16, en: 0.18, boy: 0.045, renk: BEYAZ_KOYU },
      { tur: 'kutu', x: 1.06, y: 0.68, en: 0.18, boy: 0.045, renk: BEYAZ_KOYU },
      { tur: 'aygit', x: 1.3, y: 0.3, en: 0.14, boy: 0.1, renk: AYGIT },
      { tur: 'aygit', x: 1.47, y: 0.3, en: 0.13, boy: 0.13, renk: AYGIT },
      { tur: 'aygit', x: 1.3, y: 0.46, en: 0.3, boy: 0.22, renk: AYGIT },
      { tur: 'aygit', x: 1.3, y: 0.78, en: 0.3, boy: 0.3, renk: SIYAH },
      /* Solda, zeminde duran bagaj tartısı. */
      { tur: 'kutu', x: -0.6, y: 2.2, en: 1.0, boy: 0.26, renk: TARTI, kose: 0.01 },
      { tur: 'kutu', x: -0.64, y: 2.42, en: 1.08, boy: 0.12, renk: TARTI_KOYU },
      { tur: 'kutu', x: -0.07, y: -0.07, en: 1.14, boy: 1.14, renk: SIYAH, kose: 0.04 },
    ],
  },
  {
    /* CK-200'ün geniş açık kaideli hâli (katalog s. 34, orta). */
    kod: 'MB-CKW-200',
    grup: 'self',
    zemin: true,
    taban: 1.5,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: -0.12, y: -0.1, en: 1.24, boy: 1.62, renk: MAVI, kose: 0.06 },
      { tur: 'kutu', x: 0.12, y: 1.52, en: 0.76, boy: 0.74, renk: MAVI_KOYU },
      { tur: 'kutu', x: -0.2, y: 2.2, en: 1.4, boy: 0.3, renk: BEYAZ, kose: 0.02 },
      { tur: 'aygit', x: -0.02, y: 1.12, en: 0.3, boy: 0.22, renk: AYGIT },
      { tur: 'aygit', x: 0.32, y: 1.12, en: 0.2, boy: 0.22, renk: AYGIT },
      { tur: 'aygit', x: 0.56, y: 1.14, en: 0.24, boy: 0.14, renk: AYGIT },
      { tur: 'aygit', x: -0.02, y: 1.42, en: 0.26, boy: 0.03, renk: BEYAZ },
      { tur: 'kutu', x: -0.05, y: -0.04, en: 1.1, boy: 1.08, renk: SIYAH, kose: 0.03 },
    ],
  },
  {
    /* CK-300'ün bagaj tartılı hâli (katalog s. 34, sağdaki). */
    kod: 'MB-CKW-300',
    grup: 'self',
    zemin: true,
    taban: 1.9,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: -0.04, y: 1.04, en: 1.08, boy: 0.52, renk: BEYAZ, kose: 0.02 },
      { tur: 'kutu', x: 0.04, y: 1.52, en: 0.92, boy: 1.3, renk: BEYAZ_KOYU },
      { tur: 'kutu', x: -0.16, y: 2.76, en: 1.32, boy: 0.12, renk: BEYAZ, kose: 0.02 },
      { tur: 'aygit', x: 0.02, y: 1.1, en: 0.34, boy: 0.2, renk: AYGIT },
      { tur: 'aygit', x: 0.46, y: 1.1, en: 0.26, boy: 0.16, renk: AYGIT },
      { tur: 'aygit', x: 0.46, y: 1.3, en: 0.14, boy: 0.14, renk: AYGIT },
      /* Sağda, zeminde duran bagaj tartısı. */
      { tur: 'kutu', x: 1.2, y: 2.5, en: 1.0, boy: 0.26, renk: TARTI, kose: 0.01 },
      { tur: 'kutu', x: 1.16, y: 2.72, en: 1.08, boy: 0.12, renk: TARTI_KOYU },
      { tur: 'kutu', x: -0.05, y: -0.05, en: 1.1, boy: 1.1, renk: SIYAH, kose: 0.02 },
    ],
  },

  /* --------------------------------------------------- DUVARA MONTE */
  {
    /* İnce kasalı, duvara asılı dikey ekran (katalog s. 31, ortadaki). */
    kod: 'MB-W-100',
    grup: 'duvar',
    zemin: false,
    taban: 0,
    olcu: null,
    parcalar: [{ tur: 'kutu', x: -0.07, y: -0.05, en: 1.14, boy: 1.1, renk: SIYAH, kose: 0.02 }],
  },

  /* ----------------------------------------------------------- PULT */
  {
    /*
     * Tek ayaklı, ekranı geriye yatık dokunmatik pult
     * (katalog s. 31, sağdaki).
     */
    kod: 'MB-P-100',
    grup: 'pult',
    zemin: true,
    taban: 2.1,
    egim: 22,
    olcu: null,
    parcalar: [
      { tur: 'kutu', x: 0.2, y: 0.9, en: 0.6, boy: 1.14, renk: ANTRASIT, kose: 0.02 },
      { tur: 'kutu', x: 0.04, y: 2.0, en: 0.92, boy: 0.1, renk: ANTRASIT_KOYU, kose: 0.01 },
      { tur: 'aygit', x: 0.44, y: 1.3, en: 0.12, boy: 0.08, renk: AYGIT },
      { tur: 'kutu', x: -0.06, y: -0.07, en: 1.12, boy: 1.16, renk: ANTRASIT, kose: 0.03 },
    ],
  },
]

/** Kod ile model; bulunamazsa ilk totem. */
export const kioskModeli = (kod) => KIOSK_MODELLERI.find((m) => m.kod === kod) || KIOSK_MODELLERI[0]

/** Kart listesindeki grup sırası ve başlıkları. */
export const KIOSK_GRUPLARI = [
  { anahtar: 'totem', etiket: 'kiosk.grupTotem' },
  { anahtar: 'self', etiket: 'kiosk.grupSelf' },
  { anahtar: 'duvar', etiket: 'kiosk.grupDuvar' },
  { anahtar: 'pult', etiket: 'kiosk.grupPult' },
]
