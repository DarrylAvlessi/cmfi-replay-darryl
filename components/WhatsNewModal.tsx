import { useAppContext } from '../context/AppContext'

const WhatsNewModal = () => {
  const { t, language, showWhatsNew, markWhatsNewSeen, newReleaseNotes } = useAppContext()

  if (!showWhatsNew) return null

  const latest = newReleaseNotes[0]

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="mx-4 w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-blue-400/50 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-white font-bold text-lg">{t('whatsNew')}</p>
              <p className="text-white/80 text-sm mt-0.5">
                {newReleaseNotes.length > 1
                  ? t('whatsNewMultiple', { count: String(newReleaseNotes.length) })
                  : t('whatsNewTitle', { version: latest.version })}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {newReleaseNotes.map((note) => (
            <div key={note.version} className={note !== newReleaseNotes[0] ? 'mt-5 pt-5 border-t border-gray-200 dark:border-gray-700' : ''}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">v{note.version}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{note.date}</p>
              </div>
              <ul className="space-y-2">
                {note.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{language === 'fr' ? change.fr : change.en}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button
            onClick={markWhatsNewSeen}
            className="w-full mt-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg active:scale-[0.98]"
          >
            {t('whatsNewDismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WhatsNewModal
