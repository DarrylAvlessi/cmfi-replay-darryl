import { useAppContext } from '../context/AppContext'

const UpdatePrompt = () => {
  const { t, swUpdateAvailable, swUpdateDismissed, applyUpdate, dismissUpdate, newReleaseNotes, language } = useAppContext()

  if (!swUpdateAvailable || swUpdateDismissed) return null

  const latest = newReleaseNotes.length > 0 ? newReleaseNotes[0] : null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative mx-4 w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-amber-400/50 overflow-hidden">
        {/* Close button */}
        <button
          onClick={dismissUpdate}
          className="absolute top-3 right-3 z-10 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <div>
              <p className="text-white font-bold text-lg">
                {latest ? `${t('updateAvailable')} ${latest.version}` : t('updateAvailable')}
              </p>
              <p className="text-white/80 text-sm mt-0.5">{t('updateAvailableDescription')}</p>
            </div>
          </div>
        </div>

        {/* Release notes */}
        {latest && latest.changes.length > 0 && (
          <div className="px-6 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('whatsNew')}
            </p>
            <ul className="space-y-2">
              {latest.changes.map((change, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                  <span>{language === 'fr' ? change.fr : change.en}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 pt-3 space-y-3">
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
