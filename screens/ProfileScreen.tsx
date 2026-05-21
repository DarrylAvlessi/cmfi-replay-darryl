import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import UserAvatar from '../components/UserAvatar';
import HistorySection from '../components/HistorySection';
import ViewModeSelector from '../components/ViewModeSelector';
import SettingsItem from '../components/SettingsItem';
import ToggleSwitch from '../components/ToggleSwitch';
import { statsVuesService, ContinueWatchingItem, movieService, episodeSerieService } from '../lib/firestore';
import { MediaContent, MediaType, User, Screen } from '../types';
import {
    BookmarkIcon,
    ChevronRightIcon,
    CreditCardIcon,
    KeyIcon,
    TicketIcon,
    LogoutIcon,
    SettingsIcon,
    TrashIcon
} from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { UserProfile, userService } from '../lib/firestore';
import { appSettingsService } from '../lib/appSettingsService';
import PremiumBadge from '../components/PremiumBadge';
import { authService } from '../lib/authService';
import EditProfileScreen from './EditProfileScreen';
import PreferencesScreen from './PreferencesScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import ManageSubscriptionScreen from './ManageSubscriptionScreen';
import RedeemVoucherScreen from './RedeemVoucherScreen';

interface ProfileScreenProps {
    navigate: (screen: 'Bookmarks' | 'Preferences' | 'EditProfile') => void;
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigate, onSelectMedia, onPlay }) => {
    const { t, setIsAuthenticated, userProfile, user } = useAppContext();
    const [premiumForAll, setPremiumForAll] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'account' | 'admin' | 'editProfile' | 'preferences' | 'changePassword' | 'manageSubscription' | 'redeemVoucher'>('overview');

    // Centralisation de la détection Admin
    const isAdminValue = useMemo(() => {
        return userProfile?.isAdmin ?? (userProfile as any)?.['isAdmin '];
    }, [userProfile]);

    // Debug: afficher la valeur de isAdmin
    useEffect(() => {
        console.log('ProfileScreen - isAdmin:', isAdminValue, 'userProfile:', userProfile);
    }, [isAdminValue, userProfile]);

    // Charger l'état de premiumForAll au montage du composant
    useEffect(() => {
        const loadPremiumForAll = async () => {
            if (isAdminValue) {
                const isEnabled = await appSettingsService.isPremiumForAll();
                setPremiumForAll(isEnabled);
            }
        };
        loadPremiumForAll();
    }, [isAdminValue]);

    const navigateRouter = useNavigate();
    const [historyItems, setHistoryItems] = useState<ContinueWatchingItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

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
        { icon: CreditCardIcon, label: t('manageSubscription'), action: () => setActiveTab('manageSubscription') },
        {
            icon: TicketIcon,
            label: t('redeemVoucher'),
            action: () => setActiveTab('redeemVoucher')
        },
    ], [t, navigate]);

    // Mobile settings items - use original navigation
    const mobileSettingsItems = useMemo(() => [
        { icon: BookmarkIcon, label: t('myFavorites'), action: () => navigate('Bookmarks') },
        { icon: SettingsIcon, label: t('preferences'), action: () => navigate('Preferences') },
        { icon: KeyIcon, label: t('changePassword'), action: () => navigateRouter('/change-password') },
        { icon: CreditCardIcon, label: t('manageSubscription'), action: () => navigateRouter('/manage-subscription') },
        {
            icon: TicketIcon,
            label: t('redeemVoucher'),
            action: () => navigateRouter('/redeem-voucher')
        },
    ], [t, navigate, navigateRouter]);

    // Items admin
    const adminItems = useMemo(() => {
        if (!isAdminValue) return [];
        return [
            {
                icon: SettingsIcon,
                label: 'Gérer les messages d\'information',
                action: () => navigateRouter('/manage-info-bar')
            },
            {
                icon: SettingsIcon,
                label: 'Gérer les publicités',
                action: () => navigateRouter('/manage-ads')
            },
            {
                icon: SettingsIcon,
                label: 'Gérer les utilisateurs',
                action: () => navigateRouter('/manage-users')
            },
            {
                icon: SettingsIcon,
                label: 'Envoyer une notification à tous',
                action: () => navigateRouter('/manage-notifications')
            },
            {
                icon: SettingsIcon,
                label: 'Admin - Gestion des vidéos',
                action: () => navigateRouter('/admin')
            },
        ];
    }, [isAdminValue, navigateRouter]);

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
        const items = [
            { id: 'overview' as const, label: t('overview') || 'Vue d\'ensemble', icon: 'User' },
            { id: 'history' as const, label: t('continueWatching') || 'Historique', icon: 'History' },
            { id: 'account' as const, label: t('accountSettings') || 'Compte', icon: 'Settings' },
        ];
        
        if (isAdminValue) {
            items.push({ id: 'admin' as const, label: 'Administration', icon: 'Shield' });
        }
        
        return items;
    }, [t, isAdminValue]);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
                            <img
                                src={userProfile?.photo_url || 'https://picsum.photos/seed/defaultuser/200/200'}
                                alt="Your avatar"
                                className="w-24 h-24 rounded-full border-4 border-amber-500 object-cover"
                            />
                            <div className="flex-1 text-center sm:text-left">
                                <h2 className="text-2xl font-serif font-bold mb-2">{userProfile?.display_name || 'User'}</h2>
                                <PremiumBadge size="md" showDetails={true} />
                                <button
                                    onClick={() => navigate('EditProfile')}
                                    className="mt-4 bg-transparent border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-black font-semibold py-2 px-6 rounded-full transition-colors duration-200"
                                >
                                    {t('editProfile')}
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-serif font-bold mb-4">Liens rapides</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <HistorySection
                        items={loadingHistory ? [] : historyItems}
                        onItemClick={handleHistoryItemClick}
                        title={t('continueWatching')}
                        isLoading={loadingHistory}
                    />
                );
            
            case 'account':
                return (
                    <div className="space-y-6">
                        <div className="p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-serif font-bold mb-4">{t('accountSettings')}</h3>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
                                {settingsItems.map((item) => (
                                    <SettingsItem key={item.label} Icon={item.icon} label={item.label} onClick={item.action} />
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
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
                    <div className="space-y-6">
                        <div className="p-6 bg-white dark:bg-black rounded-lg border border-amber-200 dark:border-amber-800">
                            <h3 className="text-xl font-serif font-bold mb-4 text-amber-600 dark:text-amber-400">Administration</h3>
                            <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden divide-y divide-amber-200 dark:divide-amber-800">
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center">
                                        <SettingsIcon className="w-6 h-6 text-gray-400 mr-4" />
                                        <span className="text-gray-900 dark:text-white">Accès premium pour tous</span>
                                    </div>
                                    <ToggleSwitch 
                                        enabled={premiumForAll} 
                                        onChange={async (enabled) => {
                                            const success = await appSettingsService.setPremiumForAll(enabled);
                                            if (success) {
                                                setPremiumForAll(enabled);
                                            }
                                        }} 
                                    />
                                </div>
                                {adminItems.map((item) => (
                                    <SettingsItem key={item.label} Icon={item.icon} label={item.label} onClick={item.action} />
                                ))}
                                <div className="relative overflow-visible p-4">
                                    <ViewModeSelector />
                                </div>
                            </div>
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
            
            case 'manageSubscription':
                return (
                    <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <ManageSubscriptionScreen />
                    </div>
                );
            
            case 'redeemVoucher':
                return (
                    <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <RedeemVoucherScreen />
                    </div>
                );
            
            default:
                return null;
        }
    };

    return (
        <div className="pt-4">
            {/* Mobile layout - unchanged */}
            <div className="lg:hidden">
                <div className="flex flex-col items-center p-6 space-y-3 border-b border-gray-200 dark:border-black">
                    <img
                        src={userProfile?.photo_url || 'https://picsum.photos/seed/defaultuser/200/200'}
                        alt="Your avatar"
                        className="w-24 h-24 rounded-full border-4 border-amber-500 object-cover"
                    />
                    <h2 className="text-2xl font-serif font-bold">{userProfile?.display_name || 'User'}</h2>
                    <PremiumBadge size="md" showDetails={true} />
                    <button
                        onClick={() => navigate('EditProfile')}
                        className="bg-transparent border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-black font-semibold py-2 px-6 rounded-full transition-colors duration-200"
                    >
                        {t('editProfile')}
                    </button>
                </div>

                <HistorySection
                    items={loadingHistory ? [] : historyItems}
                    onItemClick={handleHistoryItemClick}
                    title={t('continueWatching')}
                    isLoading={loadingHistory}
                />

                <section className="px-4 py-4">
                    <h3 className="text-xl font-serif font-bold mb-3">{t('accountSettings')}</h3>
                    <div className="border border-gray-200 dark:border-black rounded-lg overflow-hidden divide-y divide-gray-200 dark:divide-black">
                        {mobileSettingsItems.map((item) => (
                            <SettingsItem key={item.label} Icon={item.icon} label={item.label} onClick={item.action} />
                        ))}
                    </div>
                    {isAdminValue && (
                        <div className="mt-4">
                            <h3 className="text-lg font-serif font-bold mb-3 text-amber-600 dark:text-amber-400">Administration</h3>
                            <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-visible divide-y divide-amber-200 dark:divide-amber-800">
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center">
                                        <SettingsIcon className="w-6 h-6 text-gray-400 mr-4" />
                                        <span className="text-gray-900 dark:text-white">Accès premium pour tous</span>
                                    </div>
                                    <ToggleSwitch 
                                        enabled={premiumForAll} 
                                        onChange={async (enabled) => {
                                            const success = await appSettingsService.setPremiumForAll(enabled);
                                            if (success) {
                                                setPremiumForAll(enabled);
                                            }
                                        }} 
                                    />
                                </div>
                                {adminItems.map((item) => (
                                    <SettingsItem key={item.label} Icon={item.icon} label={item.label} onClick={item.action} />
                                ))}
                                <div className="relative overflow-visible">
                                    <ViewModeSelector />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="mt-4 border border-gray-200 dark:border-black rounded-lg overflow-hidden divide-y divide-gray-200 dark:divide-black">
                        <SettingsItem 
                            Icon={LogoutIcon} 
                            label={t('logout')} 
                            isDestructive 
                            onClick={handleLogout} 
                        />
                    </div>
                </section>
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
                                    <PremiumBadge size="sm" showDetails={false} />
                                </div>
                            </div>
                        </div>
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {navItems.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => setActiveTab(item.id)}
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