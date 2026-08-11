import { Component } from 'react'

/**
 * Global Error Boundary.
 *
 * React'in kendi kuralı: error boundary'ler yalnızca CLASS component olarak
 * yazılabilir (render sırasında/lifecycle metodlarında oluşan hataları
 * yakalayan hook eşdeğeri yok). Event handler'lardaki (onClick vb.) veya
 * async kod içindeki hataları YAKALAMAZ — onlar için main.jsx'teki
 * window 'error' / 'unhandledrejection' dinleyicileri var.
 *
 * Eskiden bir bileşen render'da patlayınca kullanıcı bomboş beyaz bir
 * ekranla baş başa kalıyordu ve hata sadece (varsa açık) tarayıcı
 * konsoluna gömülüyordu. Şimdi anlamlı bir geri bildirim ekranı gösterilir
 * ve hata yapılandırılmış biçimde loglanır (bkz. logClientError).
 */

export function logClientError(context, error, extra = {}) {
  // Şimdilik konsola yapılandırılmış (sessizce gömülmeyen) bir kayıt
  // düşülüyor. İleride bir uçtan (örn. POST /api/client-logs) merkezi
  // bir loglama servisine yönlendirmek isterse tek değişiklik noktası burası.
  console.error(`[${context}]`, error?.message || error, {
    stack: error?.stack,
    time: new Date().toISOString(),
    url: window.location.href,
    ...extra,
  })
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    logClientError('ErrorBoundary', error, { componentStack: info?.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999] bg-white dark:bg-[#0b0d12] flex items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Bir şeyler ters gitti
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
              Uygulama beklenmeyen bir hatayla karşılaştı. Sayfayı yenilemeyi deneyin; sorun
              devam ederse lütfen bizimle iletişime geçin.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full px-5 py-2.5 text-sm font-semibold bg-brand text-white hover:bg-brand-dark transition-colors"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
