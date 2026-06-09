import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { RELEASE_NOTES } from '../lib/releaseNotes'
import { APP_VERSION } from '../lib/version'
import { ArrowLeftIcon } from '../components/icons'

interface WhatsNewScreenProps {
    onBack?: () => void;
}

const WhatsNewScreen: React.FC<WhatsNewScreenProps> = ({ onBack }) => {
    const navigate = useNavigate()
    const { t, language, newReleaseNotes } = useAppContext()

    const sortedNotes = [...RELEASE_NOTES].sort((a, b) => {
        const va = a.version.split('.').map(Number);
        const vb = b.version.split('.').map(Number);
        for (let i = 0; i < Math.max(va.length, vb.length); i++) {
            const na = va[i] || 0;
            const nb = vb[i] || 0;
            if (na !== nb) return nb - na;
        }
        return 0;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <button
                    onClick={() => (onBack ? onBack() : navigate(-1))}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>{t('back')}</span>
                </button>

                <h1 className="text-2xl font-serif font-bold mb-2">{t('whatsNew')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-1">{t('whatsNewDescription')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">v{APP_VERSION}</p>

                <div className="space-y-6">
                    {sortedNotes.map((note) => {
                        const isNew = newReleaseNotes.includes(note)
                        return (
                            <div
                                key={note.version}
                                className={`border rounded-lg p-5 bg-white dark:bg-black ${
                                    isNew
                                        ? 'border-blue-400 dark:border-blue-500 ring-1 ring-blue-400/30'
                                        : 'border-gray-200 dark:border-gray-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold">v{note.version}</h2>
                                        {isNew && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white uppercase leading-none">
                                                {t('whatsNewBadge')}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{note.date}</span>
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
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default WhatsNewScreen
