import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import UserAvatar from '../components/UserAvatar';
import HistorySection from '../components/HistorySection';
//import ViewModeSelector from '../components/ViewModeSelector';
import SettingsItem from '../components/SettingsItem';
import ToggleSwitch from '../components/ToggleSwitch';
import LiveHistorySection from '../components/LiveHistorySection';
import { statsVuesService, ContinueWatchingItem, movieService, episodeSerieService, watchTogetherService, WatchRoom } from '../lib/db';
import { MediaContent, MediaType, User, Screen } from '../types';
import {
    BookmarkIcon,
    ChevronRightIcon,
    CreditCardIcon,
    KeyIcon,
    TicketIcon,
    LogoutIcon,
    SettingsIcon,
    TrashIcon,
    CommentIcon,
    HelpIcon,
    UpdateIcon
} from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { useTutorial } from '../context/TutorialContext';
import { APP_VERSION } from '../lib/version';
import { UserProfile, userService, reportService, Report } from '../lib/db';
import WhatsNewScreen from './WhatsNewScreen';


import { authService } from '../lib/authService';
import EditProfileScreen from './EditProfileScreen';
import PreferencesScreen from './PreferencesScreen';
import ChangePasswordScreen from './ChangePasswordScreen';


interface ProfileScreenProps {
    navigate: (screen: 'Bookmarks' | 'Preferences' | 'EditProfile') => void;
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigate, onSelectMedia, onPlay }) => {
    const { t, setIsAuthenticated, userProfile, user, newReleaseNotes } = useAppContext();
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'lives' | 'account' | 'admin' | 'editProfile' | 'preferences' | 'changePassword' | 'help' | 'whatsnew'>('overview');
    const [userReports, setUserReports] = useState<Report[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);

    // Centralisation de la détection Admin
    const isAdminValue = useMemo(() => {
        return userProfile?.isAdmin ?? (userProfile as any)?.['isAdmin '];
    }, [userProfile]);

    // Debug: afficher la valeur de isAdmin
    useEffect(() => {
        console.log('ProfileScreen - isAdmin:', isAdminValue, 'userProfile:', userProfile);
    }, [isAdminValue, userProfile]);

    const navigateRouter = useNavigate();
    const { registerProfileTabSetter } = useTutorial();

    useEffect(() => {
        registerProfileTabSetter((tab) => {
            setActiveTab(tab as typeof activeTab);
        });
    }, [registerProfileTabSetter]);

    const [historyItems, setHistoryItems] = useState<ContinueWatchingItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [hostedLives, setHostedLives] = useState<WatchRoom[]>([]);
    const [joinedLives, setJoinedLives] = useState<WatchRoom[]>([]);
    const [loadingLives, setLoadingLives] = useState(false);

    // Récupérer l'historique depuis Firebase
    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) {
                setLoadingHistory(false);
                return;
            }

            try {
                const items = await statsVuesService.getContinueWatching(user.uid, 10);
                setHistoryItems(items);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [user]);

    // Lives passés (hosted + joined) — chargé à la demande pour limiter les reads.
    useEffect(() => {
        if (activeTab !== 'lives') return;
        const uid = userProfile?.uid ?? user?.uid;
        if (!uid) return;
        let cancelled = false;
        setLoadingLives(true);
        Promise.all([
            watchTogetherService.getMyHostedLives(uid, 20),
            watchTogetherService.getMyJoinedLives(uid, 20),
        ]).then(([hosted, joined]) => {
            if (cancelled) return;
            setHostedLives(hosted);
            setJoinedLives(joined);
        }).catch((e) => console.error('Error fetching lives:', e))
          .finally(() => { if (!cancelled) setLoadingLives(false); });
        return () => { cancelled = true; };
    }, [activeTab, user, userProfile?.uid]);

    // Charger les signalements de l'utilisateur en temps réel
    useEffect(() => {
        if (!user) {
            setLoadingReports(false);
            return;
        }

        setLoadingReports(true);
        const unsubscribe = reportService.subscribeToUserReports(user.uid, (reports) => {
            setUserReports(reports);
            setLoadingReports(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleHistoryItemClick = useCallback(async (item: ContinueWatchingItem) => {
        if (item.type === 'movie') {
            const movie = await movieService.getMovieByUid(item.uid);
            if (movie) {
                const mediaContent: MediaContent = {
                    id: movie.uid,
                    type: MediaType.Movie,
                    title: movie.title,
                    author: movie.original_title,
                    theme: '',
                    imageUrl: movie.backdrop_path || movie.picture_path || movie.poster_path,
                    duration: movie.runtime_h_m,
                    description: movie.overview,
                    languages: [movie.original_language],
                    video_path_hd: movie.video_path_hd
                };
                onPlay(mediaContent);
            }
        } else {
            const episodeUid = item.uid_episode || item.uid;
            const episode = await episodeSerieService.getEpisodeByUid(episodeUid);
            if (episode) {
                const mediaContent: MediaContent = {
                    id: episode.uid_episode,
                    type: MediaType.Series,
                    title: episode.title_serie,
                    author: episode.title_serie,
                    theme: '',
                    imageUrl: episode.backdrop_path || episode.picture_path,
                    duration: episode.runtime_h_m,
                    description: episode.overviewFr || episode.overview,
                    languages: [],
                    video_path_hd: episode.video_path_hd
                };
                // On passe uniquement le mediaContent, pas l'épisode
                onPlay(mediaContent);
            }
        }
    }, [onPlay]);

    const handleViewAllHistory = () => {
        navigateRouter('/history');
    };

    const settingsItems = useMemo(() => [
        { icon: BookmarkIcon, label: t('myFavorites'), action: () => navigate('Bookmarks') },
        { icon: SettingsIcon, label: t('preferences'), action: () => setActiveTab('preferences') },
        { icon: KeyIcon, label: t('changePassword'), action: () => setActiveTab('changePassword') },
    ], [t, navigate]);

    // Mobile settings items - use original navigation
    const mobileSettingsItems = useMemo(() => [
        { icon: BookmarkIcon, label: t('myFavorites'), action: () => navigate('Bookmarks') },
        { icon: SettingsIcon, label: t('preferences'), action: () => navigate('Preferences') },
        { icon: KeyIcon, label: t('changePassword'), action: () => navigateRouter('/change-password') },
    ], [t, navigate, navigateRouter]);

    // Items admin
    const adminItems = useMemo(() => {
        if (!isAdminValue) return [];
        return [
            {
                icon: SettingsIcon,
                label: t('manageInfoBar'),
                action: () => navigateRouter('/manage-info-bar')
            },
            {
                icon: SettingsIcon,
                label: t('manageAds'),
                action: () => navigateRouter('/manage-ads')
            },
            {
                icon: SettingsIcon,
                label: t('manageUsers'),
                action: () => navigateRouter('/manage-users')
            },
            {
                icon: SettingsIcon,
                label: t('manageNotifications'),
                action: () => navigateRouter('/manage-notifications')
            },
            {
                icon: CommentIcon,
                label: t('manageReports'),
                action: () => navigateRouter('/manage-reports')
            },
            {
                icon: CommentIcon,
                label: t('manageTitleSuggestions'),
                action: () => navigateRouter('/manage-title-suggestions')
            },
            {
                icon: SettingsIcon,
                label: t('manageVideos'),
                action: () => navigateRouter('/admin')
            },
            {
                icon: SettingsIcon,
                label: 'Youtube',
                action: () => navigateRouter('/manage-youtube')
            },
            {
                icon: SettingsIcon,
                label: t('manageLives'),
                action: () => navigateRouter('/manage-lives')
            },
        ];
    }, [isAdminValue, navigateRouter, t]);

    const handleLogout = useCallback(async () => {
        try {
            await authService.signOut();
            setIsAuthenticated(false);
            navigateRouter('/login');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        }
    }, [setIsAuthenticated, navigateRouter]);

    // Sidebar navigation items
    const navItems = useMemo(() => {
        const items: Array<{ id: string; label: string; icon: string }> = [
            { id: 'overview' as const, label: t('overview') || 'Vue d\'ensemble', icon: 'User' },
            { id: 'history' as const, label: t('continueWatching') || 'Historique', icon: 'History' },
            { id: 'lives' as const, label: t('myLives') || 'Mes lives', icon: 'VideoCamera' },
            { id: 'account' as const, label: t('accountSettings') || 'Compte', icon: 'Settings' },
            { id: 'whatsnew' as const, label: t('whatsNew'), icon: 'Update' },
            { id: 'guides' as const, label: t('guides'), icon: 'Book' },
            { id: 'help' as const, label: t('help') || 'Aide', icon: 'Help' },
        ];
        
        if (isAdminValue) {
            items.push({ id: 'admin' as const, label: t('administration'), icon: 'Shield' });
        }
        
        return items;
    }, [t, isAdminValue]);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-4 lg:space-y-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 lg:gap-6 p-4 lg:p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
                            <img
                                src={userProfile?.photo_url || 'https://picsum.photos/seed/defaultuser/200/200'}
                                alt="Your avatar"
                                className="w-24 h-24 rounded-full border-4 border-amber-500 object-cover"
                            />
                            <div className="flex-1 text-center sm:text-left">
                                <h2 className="text-2xl font-serif font-bold mb-2">{userProfile?.display_name || 'User'}</h2>
                                {userProfile?.email && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{userProfile.email}</p>
                                )}
                                <button
                                    onClick={() => navigate('EditProfile')}
                                    className="mt-4 bg-transparent border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-black font-semibold py-2 px-6 rounded-full transition-colors duration-200"
                                >
                                    {t('editProfile')}
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-4 lg:p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="text-base lg:text-lg font-serif font-bold mb-3">{t('quickLinks')}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
                                {settingsItems.map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={item.action}
                                        className="flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <item.icon className="w-5 h-5 text-gray-500" />
                                        <span className="text-gray-900 dark:text-white">{item.label}</span>
                                        <ChevronRightIcon className="w-5 h-5 text-gray-400 ml-auto" />
                                    </button>
                                ))}
                                <button
                                    onClick={() => setActiveTab('editProfile')}
                                    className="flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <SettingsIcon className="w-5 h-5 text-gray-500" />
                                    <span className="text-gray-900 dark:text-white">{t('editProfile')}</span>
                                    <ChevronRightIcon className="w-5 h-5 text-gray-400 ml-auto" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            
            case 'history':
                return (
                    <div data-tour="profile-history">
                        <HistorySection
                            items={loadingHistory ? [] : historyItems}
                            onItemClick={handleHistoryItemClick}
                            title={t('continueWatching')}
                            isLoading={loadingHistory}
                        />
                    </div>
                );

            case 'lives':
                return (
                    <LiveHistorySection
                        hosted={hostedLives}
                        joined={joinedLives}
                        isLoading={loadingLives}
                    />
                );
            
            case 'account':
                return (
                    <div className="space-y-4 lg:space-y-6" data-tour="profile-settings">
                        <div className="p-4 lg:p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg lg:text-xl font-serif font-bold mb-3 lg:mb-4">{t('accountSettings')}</h3>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
                                {settingsItems.map((item) => (
                                    <SettingsItem key={item.label} Icon={item.icon} label={item.label} onClick={item.action} />
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-4 lg:p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
                            <SettingsItem 
                                Icon={LogoutIcon} 
                                label={t('logout')} 
                                isDestructive 
                                onClick={handleLogout} 
                            />
                        </div>
                    </div>
                );
            
            case 'admin':
                return (
                    <div className="space-y-4 lg:space-y-6">
                        <div className="p-4 lg:p-6 bg-white dark:bg-black rounded-lg border border-amber-200 dark:border-amber-800">
                            <h3 className="text-lg lg:text-xl font-serif font-bold mb-3 lg:mb-4 text-amber-600 dark:text-amber-400">{t('administration')}</h3>
                            <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden divide-y divide-amber-200 dark:divide-amber-800">
                                {adminItems.map((item) => (
                                    <SettingsItem key={item.label} Icon={item.icon} label={item.label} onClick={item.action} />
                                ))}
                                {/* <div className="relative overflow-visible p-4">
                                    <ViewModeSelector />
                                </div> */}
                            </div>
                        </div>
                    </div>
                );
            
            case 'whatsnew':
                return <WhatsNewScreen onBack={() => setActiveTab('overview')} />;

            case 'help':
                return (
                    <div className="space-y-4 lg:space-y-6">
                        <div className="p-4 lg:p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between gap-2 mb-3 lg:mb-4">
                                <h3 className="text-lg lg:text-xl font-serif font-bold">{t('help')}</h3>
                                <button
                                    onClick={() => navigateRouter('/help')}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <HelpIcon className="w-4 h-4" />
                                    {t('contactUs')}
                                </button>
                            </div>

                            {loadingReports ? (
                                <div className="text-center py-8 text-gray-500">{t('loading')}</div>
                            ) : userReports.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">{t('noReports')}</div>
                            ) : (
                                <div className="space-y-3">
                                    {userReports.map((report) => (
                                        <div
                                            key={report.uid}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                        >
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                    {report.type}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    report.status === 'resolved'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : report.status === 'read'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                    {t('reportStatus')}: {report.status}
                                                </span>
                                                <span className="text-xs text-gray-400 ml-auto">
                                                    {report.createdAt?.toDate?.()?.toLocaleDateString() || ''}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {report.message}
                                            </p>
                                            {report.adminResponse && (
                                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <p className="text-xs font-medium text-gray-500 mb-1">{t('adminResponse')}:</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                                        {report.adminResponse}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'editProfile':
                return (
                    <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <EditProfileScreen onBack={() => setActiveTab('overview')} />
                    </div>
                );
            
            case 'preferences':
                return (
                    <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <PreferencesScreen onBack={() => setActiveTab('overview')} />
                    </div>
                );
            
            case 'changePassword':
                return (
                    <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <ChangePasswordScreen />
                    </div>
                );
            
            default:
                return null;
        }
    };

    return (
        <div className="pt-4">
            {/* Mobile layout — compact + tabbed (same tabs as desktop) */}
            <div className="lg:hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-black">
                    <img
                        src={userProfile?.photo_url || 'https://picsum.photos/seed/defaultuser/200/200'}
                        alt="Your avatar"
                        className="w-14 h-14 rounded-full border-2 border-amber-500 object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-serif font-bold truncate">{userProfile?.display_name || 'User'}</h2>
                        {userProfile?.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile.email}</p>
                        )}
                    </div>
                    <button
                        onClick={() => navigate('EditProfile')}
                        className="shrink-0 bg-transparent border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-black font-semibold py-1.5 px-4 rounded-full text-sm transition-colors duration-200"
                    >
                        {t('editProfile')}
                    </button>
                </div>

                <div className="sticky top-16 z-10 bg-white/95 dark:bg-black/95 backdrop-blur px-4 py-2 border-b border-gray-200 dark:border-black">
                    <div className="flex gap-2 overflow-x-auto">
                        {navItems.filter((item) => ['overview', 'history', 'lives', 'account'].includes(item.id) || (item.id === 'admin' && isAdminValue)).map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.id === 'guides') navigateRouter('/docs');
                                    else setActiveTab(item.id as typeof activeTab);
                                }}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                                    activeTab === item.id
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'overview' ? (
                <>
                <div data-tour="profile-history">
                    <HistorySection
                        items={loadingHistory ? [] : historyItems}
                        onItemClick={handleHistoryItemClick}
                        title={t('continueWatching')}
                        isLoading={loadingHistory}
                    />
                </div>

                <section className="px-4 py-3" data-tour="profile-settings">
                    <h3 className="text-base font-serif font-bold mb-2">{t('accountSettings')}</h3>
                    <div className="border border-gray-200 dark:border-black rounded-lg overflow-hidden divide-y divide-gray-200 dark:divide-black">
                        {mobileSettingsItems.map((item) => (
                            <SettingsItem dense key={item.label} Icon={item.icon} label={item.label} onClick={item.action} />
                        ))}
                        <SettingsItem
                            dense
                            Icon={UpdateIcon}
                            label={t('whatsNew')}
                            onClick={() => navigateRouter('/whats-new')}
                            adornment={newReleaseNotes.length > 0 ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                            ) : undefined}
                        />
                        <SettingsItem
                            dense
                            Icon={HelpIcon}
                            label={t('guides')}
                            onClick={() => navigateRouter('/docs')}
                        />
                        <SettingsItem
                            dense
                            Icon={HelpIcon}
                            label={t('contactUs')}
                            onClick={() => navigateRouter('/help')}
                        />
                    </div>
                    {isAdminValue && (
                        <div className="mt-3">
                            <h3 className="text-sm font-serif font-bold mb-2 text-amber-600 dark:text-amber-400">{t('administration')}</h3>
                            <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-visible divide-y divide-amber-200 dark:divide-amber-800">
                                {adminItems.map((item) => (
                                    <SettingsItem dense key={item.label} Icon={item.icon} label={item.label} onClick={item.action} />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-3 border border-gray-200 dark:border-black rounded-lg overflow-hidden divide-y divide-gray-200 dark:divide-black">
                        <SettingsItem
                            dense
                            Icon={LogoutIcon}
                            label={t('logout')}
                            isDestructive
                            onClick={handleLogout}
                        />
                    </div>
                </section>
                </>
                ) : (
                <div className="px-4 py-3">
                    {renderContent()}
                </div>
                )}
            </div>

            {/* Desktop dashboard layout */}
            <div className="hidden lg:flex gap-6 px-6 py-4">
                {/* Sidebar navigation */}
                <aside className="w-64 flex-shrink-0">
                    <nav className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <img
                                    src={userProfile?.photo_url || 'https://picsum.photos/seed/defaultuser/200/200'}
                                    alt="Your avatar"
                                    className="w-12 h-12 rounded-full border-2 border-amber-500 object-cover"
                                />
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{userProfile?.display_name || 'User'}</p>
                                </div>
                            </div>
                        </div>
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {navItems.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => {
                                            if (item.id === 'guides') {
                                                navigateRouter('/docs');
                                            } else {
                                                setActiveTab(item.id as typeof activeTab);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                            activeTab === item.id
                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-l-4 border-amber-500'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <LogoutIcon className="w-5 h-5" />
                                <span className="font-medium">{t('logout')}</span>
                            </button>
                            <p className="mt-2 px-4 text-[11px] text-gray-400 dark:text-gray-500">v{APP_VERSION}</p>
                        </div>
                    </nav>
                </aside>

                {/* Main content area */}
                <main className="flex-1 min-w-0">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default ProfileScreen;