/**
 * EKRANIN İÇİ — fotoğraflı mekânların ortak içerik katmanı.
 *
 * Tek kural: kreatif GERİLMEZ. Reklam görselinin oranı ekranın oranıyla
 * uyuşmadığında iki seçenek var ve ikisi de bozmadan çalışır:
 *
 *   • contain (varsayılan) — görselin tamamı görünür, artan yer siyah kalır.
 *   • cover ("ekranı doldur") — ekran dolar, görselin kenarları KIRPILIR.
 *
 * Üçüncü bir yol (fill / %100 × %100) kasıtlı olarak yok: o, görseli gerer ve
 * müşteriye gerçekte göremeyeceği bir şey gösterir.
 */

import { DEFAULT_CONTENT_SRC, LED_GRADIENT } from './content.js'
import { SAMPLE_VIDEO_SRC } from './videoContent.js'

export default function EkranIcerigi({ content, contentUrl, doldur = false }) {
  const ortak = {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: doldur ? 'cover' : 'contain',
    objectPosition: 'center',
    background: '#000',
  }

  if (content === 'video' && contentUrl) {
    return <video src={contentUrl} autoPlay loop muted playsInline style={ortak} />
  }
  if (content === 'sample') {
    return <video src={SAMPLE_VIDEO_SRC} autoPlay loop muted playsInline style={ortak} />
  }
  if (content === 'photo') return <img src={DEFAULT_CONTENT_SRC} alt="" style={ortak} />
  if (content === 'upload' && contentUrl) return <img src={contentUrl} alt="" style={ortak} />
  if (content === 'led') {
    // Çıplak panel: görüntüsü kapalı gerçek bir LED yüzeyi gibi.
    return <div style={{ width: '100%', height: '100%', backgroundImage: LED_GRADIENT }} />
  }
  return <div style={{ width: '100%', height: '100%', background: '#000' }} />
}
