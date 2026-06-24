import { useAppContext } from '../context/AppContext';
import { useTutorial } from '../context/TutorialContext';

const TutorialPromptModal = () => {
  const { t } = useAppContext();
  const { showTutorialPrompt, acceptTutorialPrompt, dismissTutorialPrompt } = useTutorial();

  if (!showTutorialPrompt) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="mx-4 w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-amber-400/50 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div>
              <p className="text-white font-bold text-lg">{t('tutorialPromptTitle')}</p>
              <p className="text-white/80 text-sm mt-0.5">{t('tutorialPromptSubtitle')}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <button
            onClick={() => acceptTutorialPrompt()}
            className="w-full py-3 text-sm font-bold text-gray-900 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg active:scale-[0.98]"
          >
            {t('tutorialPromptAccept')}
          </button>
          <button
            onClick={() => dismissTutorialPrompt(false)}
            className="w-full py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            {t('tutorialPromptLater')}
          </button>
          <button
            onClick={() => dismissTutorialPrompt(true)}
            className="w-full py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {t('tutorialPromptNever')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialPromptModal;
