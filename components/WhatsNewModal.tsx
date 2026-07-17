import { useState } from 'react'
import { useAppContext } from '../context/AppContext'

const typeColors: Record<string, string> = {
  Added: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  Changed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
  Deprecated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400',
  Removed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
  Fixed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400',
  Security: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
}

const WhatsNewModal = () => {
  const { t, language, showWhatsNew, markWhatsNewSeen, newReleaseNotes } = useAppContext()
  const [expanded, setExpanded] = useState(false)

  if (!showWhatsNew) return null

  const latest = newReleaseNotes[0]

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[150] animate-slideUp">
      <div className="mx-auto w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-blue-400/30 overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                  {t('whatsNew')} — v{latest.version}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {newReleaseNotes.length > 1
                    ? t('whatsNewMultiple', { count: String(newReleaseNotes.length) })
                    : t('whatsNewTitle', { version: latest.version })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {newReleaseNotes.length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
                  aria-label={expanded ? t('collapse') : t('expand')}
                >
                  <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              <button
                onClick={markWhatsNewSeen}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
                aria-label={t('dismiss')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {expanded && (
            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {newReleaseNotes.map((note) => (
                <div key={note.version} className={note !== newReleaseNotes[0] ? 'pt-3 border-t border-gray-200 dark:border-gray-700' : ''}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100">v{note.version}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{note.date}</p>
                  </div>
                  <ul className="space-y-1.5">
                    {note.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-200">
                        <span className={`text-[10px] font-bold uppercase px-1 py-0.5 rounded flex-shrink-0 mt-0.5 ${typeColors[change.type] || ''}`}>
                          {change.type}
                        </span>
                        <span>{language === 'fr' ? change.fr : change.en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={markWhatsNewSeen}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg active:scale-[0.98]"
            >
              {t('whatsNewDismiss')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhatsNewModal
