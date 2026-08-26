/**
 * EKRANIN İÇİ — fotoğraflı mekânların ortak içerik katmanı.
 *
 * Tek kural: kreatif GERİLMEZ. Reklam görselinin oranı ekranın oranıyla
 * uyuşmadığında görselin tamamı gösterilir (contain), artan yer siyah kalır.
 *
 * Gerdiren bir seçenek (fill / %100 × %100) kasıtlı olarak yok: o, müşteriye
 * gerçekte göremeyeceği bir şey gösterir.
 */

import { DEFAULT_CONTENT_SRC, LED_GRADIENT } from './content.js'
import { SAMPLE_VIDEO_SRC } from './videoContent.js'

export default function EkranIcerigi({ content, contentUrl }) {
  /*
   * draggable={false} ŞART.
   *
   * Tarayıcı <img> öğelerini kendiliğinden sürüklenebilir sayar. Ekranı
   * mekân içinde taşımak isteyen kullanıcı görsele bastığında tarayıcının
   * kendi "resmi sürükle" davranışı devreye giriyor, pointer olayları
   * kesiliyor ve ekran bir adım gidip duruyordu.
   */
  const ortak = {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'contain',
    objectPosition: 'center',
    background: '#000',
  }

  if (content === 'video' && contentUrl) {
    return <video src={contentUrl} autoPlay loop muted playsInline draggable={false} style={ortak} />
  }
  if (content === 'sample') {
    return <video src={SAMPLE_VIDEO_SRC} autoPlay loop muted playsInline draggable={false} style={ortak} />
  }
  if (content === 'photo') return <img src={DEFAULT_CONTENT_SRC} alt="" draggable={false} style={ortak} />
  if (content === 'upload' && contentUrl) return <img src={contentUrl} alt="" draggable={false} style={ortak} />
  if (content === 'led') {
    // Çıplak panel: görüntüsü kapalı gerçek bir LED yüzeyi gibi.
    return <div style={{ width: '100%', height: '100%', backgroundImage: LED_GRADIENT }} />
  }
  return <div style={{ width: '100%', height: '100%', background: '#000' }} />
}
