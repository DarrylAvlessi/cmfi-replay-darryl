import { useAppContext } from '../context/AppContext'

const UpdatePrompt = () => {
  const { t, swUpdateAvailable, swUpdateDismissed, applyUpdate, dismissUpdate } = useAppContext()

  if (!swUpdateAvailable || swUpdateDismissed) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="mx-4 w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-amber-400/50 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <div>
              <p className="text-white font-bold text-lg">{t('updateAvailable')}</p>
              <p className="text-white/80 text-sm mt-0.5">{t('updateAvailableDescription')}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <button
            onClick={applyUpdate}
            className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg active:scale-[0.98]"
          >
            {t('updateNow')}
          </button>
          <button
            onClick={dismissUpdate}
            className="w-full py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {t('updateLater')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UpdatePrompt
