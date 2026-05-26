/// <reference types="vite-plugin-pwa/react" />
import { useRegisterSW } from 'virtual:pwa-register/react'

const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const close = () => {
    setNeedRefresh(false)
  }

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md animate-slideUp">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 shadow-2xl border border-amber-400/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Nouvelle version disponible</p>
            <p className="text-white/80 text-xs mt-0.5">Actualisez pour profiter des dernières améliorations</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={close}
              className="px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Plus tard
            </button>
            <button
              onClick={() => updateServiceWorker()}
              className="px-4 py-1.5 text-xs font-bold text-amber-600 bg-white rounded-lg hover:bg-amber-50 transition-colors shadow-lg"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpdatePrompt
