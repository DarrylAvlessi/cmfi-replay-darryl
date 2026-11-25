import React, { useState, useEffect } from 'react';
import { MediaContent, MediaType } from '../types';
import { useAppContext } from '../context/AppContext';
import { serieService, Serie } from '../lib/db';

interface CategoryScreenProps {
    onBack: () => void;
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
}

const PodcastCard: React.FC<{
    item: MediaContent;
    onSelect: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
}> = ({ item, onSelect, onPlay }) => {
    const { t } = useAppContext();

    return (
        <article className="broadcast-card group flex h-full flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1">
            <button
                type="button"
                onClick={() => onSelect(item)}
                className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 dark:bg-slate-900"
                aria-label={t('seeDetails')}
            >
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 text-sky-300">
                        <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                        </svg>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-80" />
                <span className="absolute left-3 top-3 rounded-lg border border-white/15 bg-slate-950/55 px-2.5 py-1 font-mono-meta text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-200 backdrop-blur-md">
                    {t('podcast')}
                </span>
                <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-950/40 transition-transform group-hover:scale-105">
                    <svg className="ml-0.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5.5v13a1 1 0 0 0 1.52.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
                    </svg>
                </span>
            </button>
            <div className="flex flex-1 flex-col p-4">
                <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="line-clamp-2 text-left font-display text-base font-bold leading-snug text-slate-900 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white dark:hover:text-sky-300"
                >
                    {item.title}
                </button>
                {item.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {item.description}
                    </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <span className="truncate font-mono-meta text-[10px] uppercase tracking-wider text-slate-400">
                        {item.languages?.[0] || ''}
                    </span>
                    <button
                        type="button"
                        onClick={() => onPlay(item)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/15 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                    >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M8 5.5v13a1 1 0 0 0 1.52.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
                        </svg>
                        {t('play')}
                    </button>
                </div>
            </div>
        </article>
    );
};

const CategoryScreen: React.FC<CategoryScreenProps> = ({ onBack, onSelectMedia, onPlay }) => {
    const { t } = useAppContext();
    const [podcasts, setPodcasts] = useState<MediaContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    // Convertir un Podcast (Serie avec serie_type: 'podcast') en MediaContent
    const convertPodcastToMediaContent = (podcast: Serie): MediaContent => ({
        id: podcast.uid_serie,
        title: podcast.title_serie,
        type: MediaType.Podcast,
        imageUrl: podcast.image_path,
        duration: podcast.runtime_h_m || '',
        theme: '',
        description: podcast.overview_serie,
        languages: podcast.lang ? [podcast.lang] : [],
        progress: undefined,
    });

    // Charger les podcasts depuis Firestore
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setLoadFailed(false);
            try {
                const podcastsData = await serieService.getAllPodcasts();
                setPodcasts(podcastsData.map(convertPodcastToMediaContent));
            } catch (error) {
                console.error('Error loading data:', error);
                setLoadFailed(true);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return (
        <div className="min-h-screen broadcast-canvas animate-fadeIn pb-14">
            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-6">
                <header className="broadcast-panel relative mb-6 overflow-hidden rounded-3xl p-5 sm:p-7">
                    <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl dark:bg-sky-400/10" />
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                    <div className="mb-3 flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                            aria-label={t('back')}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/15 bg-blue-500/5 text-blue-600 dark:border-sky-400/15 dark:bg-sky-400/5 dark:text-sky-400">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </span>
                    </div>
                    <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
                        {t('podcastsScreenTitle')}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {t('categoryPodcastsDescription')}
                    </p>
                    </div>
                    {!loading && !loadFailed && (
                        <div className="relative inline-flex items-center gap-3 self-start rounded-2xl border border-blue-500/15 bg-blue-500/5 px-4 py-3 sm:self-auto dark:border-sky-400/15 dark:bg-sky-400/5">
                            <span className="font-mono-meta text-2xl font-bold text-blue-700 dark:text-sky-300">{podcasts.length}</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('podcast')}</span>
                        </div>
                    )}
                    </div>
                </header>

                {loading ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                        {[...Array(10)].map((_, index) => (
                            <div key={index} className="broadcast-panel overflow-hidden rounded-3xl p-2.5">
                                <div className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                                <div className="space-y-2 p-2 pt-4">
                                    <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : loadFailed ? (
                    <div role="alert" className="broadcast-panel rounded-3xl px-6 py-14 text-center">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('loadCatalogError')}</p>
                    </div>
                ) : podcasts.length === 0 ? (
                    <div className="broadcast-panel rounded-3xl px-6 py-16 text-center">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/10 bg-blue-500/5 text-blue-600 dark:border-sky-400/10 dark:bg-sky-400/5 dark:text-sky-400">
                            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">{t('noPodcastsAvailable')}</h2>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                        {podcasts.map((item) => (
                            <PodcastCard key={item.id} item={item} onSelect={onSelectMedia} onPlay={onPlay} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryScreen;
