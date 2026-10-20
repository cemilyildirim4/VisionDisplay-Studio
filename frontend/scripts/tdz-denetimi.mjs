/**
 * TANIMLANMADAN OKUNAN DEĞİŞKEN DENETİMİ (TDZ).
 *
 * Bu depoda aynı hata dört kez çıktı ve dördünde de uygulama kullanıcının
 * elinde çöktü:
 *
 *   const kutu = <p>{detayAcik ? ... : ...}</p>   // burada okunuyor
 *   const [detayAcik] = useState(false)           // burada tanımlanıyor
 *
 * `const` yukarıdan aşağı çalışır; tanımdan önce okumak çalışma anında
 * ReferenceError verir ("Cannot access 'X' before initialization"). Derleme
 * bunu yakalamıyor — sözdizimi kusursuz — ve hata ancak o satırın çizildiği
 * adımda ortaya çıkıyor. oxlint'te karşılığı olan kural (no-use-before-define)
 * yok, bu yüzden denetim burada.
 *
 * NE ARIYOR: bir adın, kendi kapsamındaki const/let tanımından ÖNCE ve
 * HEMEN ÇALIŞAN bir konumda okunması.
 *
 * NE ARAMIYOR — iki önemli ayrım:
 *
 *   1) İÇ İÇE İŞLEVLER. Şu doğru ve yaygın:
 *        const yaz = () => sayac     // çağrıldığında okunacak
 *        const sayac = 0
 *      İşlev gövdesine girildiği anda rapor kapanıyor; adlar yine de kapsam
 *      zinciri üzerinden çözülüyor (gölgeleme doğru çalışsın diye).
 *
 *   2) KAPSAM GÖLGELEMESİ. Her blok ({ ... }) kendi kapsamıdır. Bir if
 *      bloğunun içindeki `const wallWm`, işlevin ilerisinde aynı adla
 *      tanımlanmış bambaşka bir const'la karıştırılmamalı. Ad her zaman EN
 *      İÇTEKİ onu tanımlayan kapsamdan çözülüyor.
 *
 * Hoist edilenler (var, function, import, sınıf yöntemleri) her zaman tanımlı
 * sayılıyor; onlarda TDZ yok.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'

const KOK = fileURLToPath(new URL('../src', import.meta.url))
/** Hoist edilen bağlamalar için konum: her zaman tanımlı. */
const HER_ZAMAN = -1

function dosyalar(dizin) {
  const liste = []
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad)
    if (statSync(yol).isDirectory()) liste.push(...dosyalar(yol))
    else if (/\.jsx?$/.test(ad) && !/\.test\.m?js$/.test(ad)) liste.push(yol)
  }
  return liste
}

const ISLEV = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
])

/** Düğümün çocukları — AST'yi tanımadan gezmek için yeterli. */
function* cocuklar(dugum) {
  for (const anahtar of Object.keys(dugum)) {
    if (anahtar === 'loc' || anahtar.endsWith('Comments')) continue
    const deger = dugum[anahtar]
    if (Array.isArray(deger)) {
      for (const d of deger) if (d && typeof d.type === 'string') yield d
    } else if (deger && typeof deger.type === 'string') {
      yield deger
    }
  }
}

/** Bir bağlama deseninden (a, {b}, [c]) çıkan bütün adlar. */
function desendekiAdlar(dugum, topla) {
  if (!dugum) return
  switch (dugum.type) {
    case 'Identifier':
      topla.push(dugum.name)
      break
    case 'ObjectPattern':
      for (const o of dugum.properties) desendekiAdlar(o.type === 'RestElement' ? o.argument : o.value, topla)
      break
    case 'ArrayPattern':
      for (const o of dugum.elements) desendekiAdlar(o, topla)
      break
    case 'AssignmentPattern':
      desendekiAdlar(dugum.left, topla)
      break
    case 'RestElement':
      desendekiAdlar(dugum.argument, topla)
      break
    default:
      break
  }
}

/**
 * Bir ifade/bildirim dizisinden o kapsamın bağlamalarını toplar.
 * Dönen: ad → tanımın başladığı konum (HER_ZAMAN ise hoist edilmiş).
 */
function kapsamBaglamalari(govde) {
  const harita = new Map()
  const koy = (ad, konum) => {
    /* Aynı ad iki kez bildirilmişse ilki geçerli. */
    if (!harita.has(ad)) harita.set(ad, konum)
  }
  for (const b of govde) {
    if (!b) continue
    if (b.type === 'VariableDeclaration') {
      for (const t of b.declarations) {
        const adlar = []
        desendekiAdlar(t.id, adlar)
        for (const ad of adlar) koy(ad, b.kind === 'var' ? HER_ZAMAN : b.start)
      }
    } else if (b.type === 'FunctionDeclaration' && b.id) {
      koy(b.id.name, HER_ZAMAN)
    } else if (b.type === 'ClassDeclaration' && b.id) {
      koy(b.id.name, b.start)
    } else if (b.type === 'ImportDeclaration') {
      for (const s of b.specifiers) if (s.local) koy(s.local.name, HER_ZAMAN)
    } else if (b.type === 'ExportNamedDeclaration' && b.declaration) {
      for (const [ad, konum] of kapsamBaglamalari([b.declaration])) koy(ad, konum)
    } else if (b.type === 'ExportDefaultDeclaration' && b.declaration?.id) {
      koy(b.declaration.id.name, HER_ZAMAN)
    }
  }
  return harita
}

const satir = (kaynak, konum) => kaynak.slice(0, Math.max(0, konum)).split('\n').length

function dosyayiDenetle(yol, bulgular) {
  const kaynak = readFileSync(yol, 'utf8')
  let agac
  try {
    agac = parse(kaynak, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true })
  } catch (e) {
    console.error('AYRISTIRILAMADI: ' + yol + ' — ' + e.message)
    process.exitCode = 1
    return
  }
  const dosya = relative(KOK, yol).replace(/\\/g, '/')

  /**
   * ERTELEME DERİNLİKLE ÖLÇÜLÜYOR, BAYRAKLA DEĞİL.
   *
   * Bir okuma yalnızca KENDİ çalışma biriminde sıra dışıysa hatadır.
   * İşlev gövdesinin içinde sıra yine geçerlidir — orası kendi başına bir
   * çalışma birimidir. Bu yüzden her kapsam, kaç işlev sınırı aşılarak
   * açıldığını taşıyor; ad çözüldüğünde yalnızca kapsamın derinliği o anki
   * derinliğe EŞİTSE rapor ediliyor.
   *
   *   const g = () => a   // okuma derinlik 2, tanım derinlik 1 → sorun yok
   *   const a = 1
   *
   *   const kutu = <p>{a}</p>   // ikisi de derinlik 1 → HATA
   *   const [a] = useState()
   *
   * HEMEN ÇAĞRILAN İŞLEV İSTİSNA: "const x = (() => { ... })()" biçiminde
   * yazılan işlev o anda çalışır, dolayısıyla derinlik artmıyor. Bu depoda
   * yaşanan çökmelerden biri (grupKoseleri) tam olarak böyleydi.
   *
   * @param zincir [{harita, derinlik}] en dıştan en içe
   */
  const gez = (dugum, zincir, derinlik) => {
    if (!dugum) return

    if (dugum.type === 'Identifier') {
      for (let i = zincir.length - 1; i >= 0; i--) {
        const k = zincir[i]
        if (!k.harita.has(dugum.name)) continue
        const nerede = k.harita.get(dugum.name)
        if (nerede !== HER_ZAMAN && k.derinlik === derinlik && dugum.start < nerede) {
          bulgular.push({
            dosya,
            ad: dugum.name,
            okunan: satir(kaynak, dugum.start),
            tanim: satir(kaynak, nerede),
          })
        }
        return // en içteki tanım kazanır
      }
      return
    }

    /* ---- Okuma sayılmayan konumlar ---- */
    if (dugum.type === 'MemberExpression' || dugum.type === 'OptionalMemberExpression') {
      gez(dugum.object, zincir, derinlik)
      if (dugum.computed) gez(dugum.property, zincir, derinlik)
      return
    }
    if (dugum.type === 'ObjectProperty' || dugum.type === 'Property') {
      if (dugum.computed) gez(dugum.key, zincir, derinlik)
      gez(dugum.value, zincir, derinlik)
      return
    }
    if (dugum.type === 'JSXAttribute') {
      gez(dugum.value, zincir, derinlik)
      return
    }
    if (dugum.type === 'JSXIdentifier' || dugum.type === 'JSXText' || dugum.type === 'JSXEmptyExpression') return
    if (dugum.type === 'JSXMemberExpression') {
      gez(dugum.object, zincir, derinlik)
      return
    }

    /* ---- Hemen çağrılan işlev: derinlik artmıyor ---- */
    if (
      (dugum.type === 'CallExpression' || dugum.type === 'OptionalCallExpression') &&
      ISLEV.has(dugum.callee?.type)
    ) {
      for (const a of dugum.arguments) gez(a, zincir, derinlik)
      islevGovdesi(dugum.callee, zincir, derinlik)
      return
    }

    /* ---- Kendi kapsamını açanlar ---- */
    if (ISLEV.has(dugum.type) || dugum.type === 'ObjectMethod' || dugum.type === 'ClassMethod') {
      islevGovdesi(dugum, zincir, derinlik + 1)
      return
    }

    if (dugum.type === 'BlockStatement' || dugum.type === 'Program' || dugum.type === 'StaticBlock') {
      const z = [...zincir, { harita: kapsamBaglamalari(dugum.body), derinlik }]
      for (const b of dugum.body) gez(b, z, derinlik)
      return
    }

    if (dugum.type === 'ForStatement' || dugum.type === 'ForOfStatement' || dugum.type === 'ForInStatement') {
      const bas = dugum.init || dugum.left
      const harita = bas?.type === 'VariableDeclaration' ? kapsamBaglamalari([bas]) : new Map()
      const z = [...zincir, { harita, derinlik }]
      for (const anahtar of ['init', 'left', 'test', 'update', 'right', 'body']) {
        if (dugum[anahtar]) gez(dugum[anahtar], z, derinlik)
      }
      return
    }

    if (dugum.type === 'CatchClause') {
      const harita = new Map()
      if (dugum.param) {
        const adlar = []
        desendekiAdlar(dugum.param, adlar)
        for (const ad of adlar) harita.set(ad, HER_ZAMAN)
      }
      gez(dugum.body, [...zincir, { harita, derinlik }], derinlik)
      return
    }

    if (dugum.type === 'SwitchStatement') {
      gez(dugum.discriminant, zincir, derinlik)
      const harita = kapsamBaglamalari(dugum.cases.flatMap((c) => c.consequent))
      const z = [...zincir, { harita, derinlik }]
      for (const c of dugum.cases) {
        if (c.test) gez(c.test, z, derinlik)
        for (const b of c.consequent) gez(b, z, derinlik)
      }
      return
    }

    for (const c of cocuklar(dugum)) gez(c, zincir, derinlik)
  }

  /* İşlev gövdesi: parametreler kendi kapsamında ve her zaman tanımlı. */
  const islevGovdesi = (dugum, zincir, derinlik) => {
    const harita = new Map()
    for (const p of dugum.params || []) {
      const adlar = []
      desendekiAdlar(p, adlar)
      for (const ad of adlar) harita.set(ad, HER_ZAMAN)
    }
    if (dugum.id) harita.set(dugum.id.name, HER_ZAMAN)
    const z = [...zincir, { harita, derinlik }]
    /* Varsayılan parametre değerleri çağrı anında işliyor. */
    for (const p of dugum.params || []) gez(p, z, derinlik)
    const govde = dugum.body
    if (govde?.type === 'BlockStatement') {
      const ic = [...z, { harita: kapsamBaglamalari(govde.body), derinlik }]
      for (const b of govde.body) gez(b, ic, derinlik)
    } else {
      gez(govde, z, derinlik)
    }
  }

  gez(agac.program, [], 0)
}

const bulgular = []
for (const yol of dosyalar(KOK)) dosyayiDenetle(yol, bulgular)

/* Aynı satırda aynı ad birden çok kez çıkabiliyor; bir kez yazmak yeter. */
const benzersiz = [...new Map(bulgular.map((b) => [b.dosya + ':' + b.okunan + ':' + b.ad, b])).values()]

if (benzersiz.length === 0) {
  console.log('TDZ denetimi: temiz ✓')
} else {
  console.error('TDZ denetimi: ' + benzersiz.length + ' yerde tanımdan önce okuma var\n')
  for (const b of benzersiz) {
    console.error('  ' + b.dosya + ':' + b.okunan + '  "' + b.ad + '" okunuyor, tanımı ' + b.tanim + '. satırda')
  }
  console.error(
    '\nTanımı okunduğu yerin ÜSTÜNE taşıyın. Çalışma anında ' +
      '"Cannot access \'X\' before initialization" veren hata budur.',
  )
  process.exitCode = 1
}
