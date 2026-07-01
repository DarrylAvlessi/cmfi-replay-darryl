import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { useTutorial } from '../context/TutorialContext';
import {
  USER_GUIDES,
  GUIDE_CATEGORIES,
  GuideCategory,
  getGuideById,
  UserGuide,
} from '../lib/userGuides';

const GuidesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { guideId } = useParams<{ guideId?: string }>();
  const { t, language } = useAppContext();
  const { startTour, isTourCompleted, playerTourAvailable } = useTutorial();
  const [activeCategory, setActiveCategory] = useState<GuideCategory | 'all'>('all');

  const appTourGuide = getGuideById('app-tour');
  const selectedGuide = guideId ? getGuideById(guideId) : null;

  const filteredGuides = useMemo(() => {
    if (activeCategory === 'all') return USER_GUIDES;
    return USER_GUIDES.filter((g) => g.category === activeCategory);
  }, [activeCategory]);

  const getLocalized = (guide: UserGuide, field: 'title' | 'summary') =>
    language === 'fr' ? guide[field].fr : guide[field].en;

  const handleStartTour = async (tourId: string | null) => {
    if (!tourId) return;
    await startTour(tourId);
  };

  if (selectedGuide) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pb-24">
        <div className="sticky top-16 z-10 bg-white/95 dark:bg-black/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <button
            onClick={() => navigate('/docs')}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {t('guides')}
          </button>
        </div>

        <article className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2">
            {getLocalized(selectedGuide, 'title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('readTime', { minutes: String(selectedGuide.readMinutes) })}
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-8">
            {getLocalized(selectedGuide, 'summary')}
          </p>

          <ol className="space-y-4 mb-8">
            {selectedGuide.steps.map((step, index) => (
              <li
                key={index}
                className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-gray-900 font-bold text-sm flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed pt-1">
                  {language === 'fr' ? step.fr : step.en}
                </p>
              </li>
            ))}
          </ol>

          {selectedGuide.tourId && (
            <div className="space-y-3">
              <button
                onClick={() => handleStartTour(selectedGuide.tourId)}
                disabled={selectedGuide.tourId === 'player' && !playerTourAvailable}
                className="w-full py-3 text-sm font-bold text-gray-900 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('startTour')}
              </button>
              {isTourCompleted(selectedGuide.tourId) && (
                <p className="text-center text-xs text-green-600 dark:text-green-400">
                  {t('tourCompletedBadge')}
                </p>
              )}
            </div>
          )}
        </article>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24">
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('back')}
        </button>

        <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-1">
          {t('guides')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          {t('guidesSubtitle')}
        </p>

        {appTourGuide && (
          <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800/80 border-2 border-amber-400/60 dark:border-amber-500/30 shadow-lg">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white">
                {getLocalized(appTourGuide, 'title')}
              </h2>
              {isTourCompleted('app-tour') && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                  {t('tourCompletedBadge')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              {getLocalized(appTourGuide, 'summary')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              {t('readTime', { minutes: String(appTourGuide.readMinutes) })}
            </p>
            <button
              onClick={() => handleStartTour('app-tour')}
              className="w-full py-3 text-sm font-bold text-gray-900 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg active:scale-[0.98]"
            >
              {t('startTour')}
            </button>
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {GUIDE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-gray-200 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {t(cat.labelKey as any)}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredGuides.map((guide) => (
            <div
              key={guide.id}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 hover:border-amber-400/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getLocalized(guide, 'title')}
                </h2>
                {guide.tourId && isTourCompleted(guide.tourId) && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                    {t('tourCompletedBadge')}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {getLocalized(guide, 'summary')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                {t('readTime', { minutes: String(guide.readMinutes) })}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/docs/${guide.id}`)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {t('readGuide')}
                </button>
                {guide.tourId && (
                  <button
                    onClick={() => handleStartTour(guide.tourId)}
                    disabled={guide.tourId === 'player' && !playerTourAvailable}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-gray-900 hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('startTour')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GuidesScreen;
