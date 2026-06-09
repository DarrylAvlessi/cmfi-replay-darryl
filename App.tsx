import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './transitions.css';

// Auth Screens
import GetStartedScreen from './screens/GetStartedScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

// Public Screens
import PrivacyScreen from './screens/PrivacyScreen';

// Main Screens
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import ProfileScreen from './screens/ProfileScreen';
import BookmarksScreen from './screens/BookmarksScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import HistoryScreen from './screens/HistoryScreen';
import RedeemVoucherScreen from './screens/RedeemVoucherScreen';
import ManageSubscriptionScreen from './screens/ManageSubscriptionScreen';
import ManageInfoBarScreen from './screens/ManageInfoBarScreen';
import ManageAdsScreen from './screens/ManageAdsScreen';
import ManageUsersScreen from './screens/ManageUsersScreen';
import PaymentSuccessScreen from './screens/PaymentSuccessScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ManageNotificationsScreen from './screens/ManageNotificationsScreen';
import AdminBackupVideosScreen from './screens/AdminBackupVideosScreen';
import HelpScreen from './screens/HelpScreen';
import WhatsNewScreen from './screens/WhatsNewScreen';
import DonateScreen from './screens/DonateScreen';
import ManageReportsScreen from './screens/ManageReportsScreen';

// Category Screens
import MoviesScreen from './screens/MoviesScreen';
import SeriesScreen from './screens/SeriesScreen';
import PodcastsScreen from './screens/PodcastsScreen';

// Detail & Player Screens
import MediaDetailWrapper from './screens/MediaDetailWrapper';
import WatchScreen from './screens/WatchScreen';

// Components
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RGPDConsentModal from './components/RGPDConsentModal';
import UpdatePrompt from './components/UpdatePrompt';
import WhatsNewModal from './components/WhatsNewModal';
import { ActiveTab, MediaContent, MediaType } from './types';
import { serieService, seasonSerieService, episodeSerieService, EpisodeSerie, initializeMovieViews, navigationTrackingService, movieService } from './lib/firestore';
import { usePageTitle } from './lib/pageTitle';

const getTitleFromPath = (path: string, t: (key: string) => string): string => {
    if (path === '/home') return t('home');
    if (path === '/documentaries') return t('categoryMovies');
    if (path === '/productions') return t('categorySeries');
    if (path === '/podcasts') return t('categoryPodcasts');
    if (path.startsWith('/documentary/')) return t('movie');
    if (path.startsWith('/production/')) return t('serie');
    if (path.startsWith('/podcast/')) return t('podcast');
    if (path === '/search') return t('search');
    if (path === '/profile') return t('profile');
    if (path === '/preferences') return t('preferences');
    if (path === '/editprofile') return t('editProfile');
    if (path === '/change-password') return t('changePassword');
    if (path === '/history') return t('history');
    if (path === '/bookmarks' || path === '/favorites') return t('favorites');
    if (path === '/help') return t('help');
    return '';
};

const AppContent: React.FC = () => {
    const {
        isAuthenticated,
        t,
        loading,
        user,
        activeTab: contextActiveTab,
        setActiveTab: setContextActiveTab
    } = useAppContext();
    const location = useLocation();
    const navigate = useNavigate();
    const { userProfile, setUserProfile } = useAppContext();
    const [showRGPDModal, setShowRGPDModal] = useState(false);

    // Vérifier si le consentement RGPD est nécessaire
    useEffect(() => {
        if (isAuthenticated && userProfile && !userProfile.hasAcceptedPrivacyPolicy) {
            setShowRGPDModal(true);
        } else {
            setShowRGPDModal(false);
        }
    }, [isAuthenticated, userProfile]);

    // Mettre à jour le titre de la page en fonction de la route actuelle
    usePageTitle();

    // Tracking de navigation avec limitation
    useEffect(() => {
        if (!isAuthenticated || !userProfile?.uid) return;

        // Ne pas tracker les pages d'authentification
        if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password') {
            return;
        }

        const getPageName = (path: string): string => {
            if (path === '/home') return 'Accueil';
            if (path === '/documentaries') return 'Documentaires';
            if (path === '/productions') return 'Productions';
            if (path === '/podcasts') return 'Podcasts';
            if (path.startsWith('/documentary/')) return 'Détail Documentaire';
            if (path.startsWith('/production/')) return 'Détail Production';
            if (path.startsWith('/podcast/')) return 'Détail Podcast';
            if (path.startsWith('/watch/')) return 'Lecture Vidéo';
            if (path === '/search') return 'Recherche';
            if (path === '/profile') return 'Profil';
            if (path === '/preferences') return 'Préférences';
            if (path === '/editprofile') return 'Modifier Profil';
            if (path === '/change-password') return 'Changer Mot de Passe';
            if (path === '/history') return 'Historique';
            if (path === '/bookmarks' || path === '/favorites') return 'Favoris';
            if (path === '/help') return 'Aide';
            if (path === '/manage-reports') return 'Gestion Signalements';
            if (path === '/manage-users') return 'Gestion Utilisateurs';
            if (path === '/admin') return 'Administration';
            if (path === '/notifications') return 'Notifications';
            if (path === '/manage-notifications') return 'Gérer Notifications';
            return 'Page Inconnue';
        };

        const isOnline = userProfile.presence === 'online' || userProfile.presence === 'away';
        const pageName = getPageName(location.pathname);
        
        // Si c'est une page de lecture, récupérer le titre de la vidéo
        const recordNavigationWithVideoTitle = async () => {
            let videoTitle: string | undefined;
            let videoUid: string | undefined;

            if (location.pathname.startsWith('/watch/')) {
                const videoUidFromPath = location.pathname.replace('/watch/', '');
                videoUid = videoUidFromPath;

                try {
                    // Essayer de récupérer comme film
                    const movie = await movieService.getMovieByUid(videoUidFromPath);
                    if (movie) {
                        videoTitle = movie.title;
                    } else {
                        // Essayer de récupérer comme épisode
                        let episode = await episodeSerieService.getEpisodeByUid(videoUidFromPath);
                        if (!episode) {
                            episode = await episodeSerieService.getEpisodeById(videoUidFromPath);
                        }
                        if (episode) {
                            // Format: "Titre de l'épisode" ou "Série - Épisode X"
                            if (episode.title && episode.title.trim()) {
                                videoTitle = episode.title;
                            } else if (episode.title_serie) {
                                videoTitle = `${episode.title_serie} - Épisode ${episode.episode_number || episode.episode_numero || ''}`;
                            } else {
                                videoTitle = `Épisode ${episode.episode_number || episode.episode_numero || ''}`;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching video title for navigation:', error);
                    // Continuer sans le titre si erreur
                }
            }

            // Enregistrer la navigation (avec déduplication automatique)
            await navigationTrackingService.recordNavigation(
                userProfile.uid,
                location.pathname,
                pageName,
                isOnline,
                videoTitle,
                videoUid
            );
        };

        recordNavigationWithVideoTitle().catch(error => {
            console.error('Error tracking navigation:', error);
        });
    }, [location.pathname, isAuthenticated, userProfile]);

    // Utiliser localStorage pour persister hasStarted
    const [hasStarted, setHasStarted] = useState(() => {
        const stored = localStorage.getItem('hasStarted');
        return stored === 'true';
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [playingItem, setPlayingItem] = useState<{ media: MediaContent; episode?: EpisodeSerie } | null>(null);
    const [episodesCache, setEpisodesCache] = useState<{ serieId: string; episodes: EpisodeSerie[] } | null>(null);

    // Sauvegarder hasStarted dans localStorage
    useEffect(() => {
        localStorage.setItem('hasStarted', hasStarted.toString());
    }, [hasStarted]);

    const handlePlay = async (media: MediaContent, episode?: EpisodeSerie) => {
        if (episode?.uid_episode) {
            navigate(`/watch/${episode.uid_episode}`);
            return;
        }
        if (media.type === MediaType.Movie) {
            navigate(`/watch/${media.id}`);
            return;
        }
        const route = media.type === MediaType.Series ? 'production' : 'podcast';
        navigate(`/${route}/${media.id}`);
    };

    const handleSelectMedia = (media: MediaContent) => {
        const route = media.type === MediaType.Series ? 'production' :
            media.type === MediaType.Movie ? 'documentary' :
                'podcast';
        navigate(`/${route}/${media.id}`);
    };

    const handleNavigateToCategory = (type: MediaType) => {
        // Series est déjà au pluriel, Movie et Podcast ont besoin d'un "s"
        const route = type === MediaType.Series ? 'productions' :
            type === MediaType.Movie ? 'documentaries' :
                'podcasts';
        console.log('🔍 Navigation vers catégorie:', { type, route, fullPath: `/${route}` });
        navigate(`/${route}`);
    };

    const handleNavigateToScreen = (screen: string) => {
        // Gérer le cas spécial pour les favoris
        if (screen.toLowerCase() === 'bookmarks') {
            navigate('/bookmarks');
        } else {
            navigate(`/${screen.toLowerCase()}`);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleReturnHome = () => {
        navigate('/home');
    };

    if (!hasStarted && location.pathname !== '/privacy') {
        return <GetStartedScreen onGetStarted={() => setHasStarted(true)} />;
    }

    // Afficher un indicateur de chargement pendant la vérification de l'authentification
    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-black">
                {/* Header avec bouton de menu fonctionnel */}
                <Header
                    title=""
                    isSidebarOpen={isSidebarOpen}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    isWatchRoute={false}
                />

                {/* Contenu de chargement */}
                <div className={`pt-16`}>
                    <div className="flex items-center justify-center h-screen">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/register" element={<RegisterScreen />} />
                <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
                <Route path="/privacy" element={<PrivacyScreen />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    // Déterminer si on doit afficher la bottom nav
    const showBottomNav = !location.pathname.startsWith('/watch/') && !['/login', '/register', '/forgot-password'].includes(location.pathname);

    // Toujours permettre l'ouverture/fermeture de la sidebar, même pendant le chargement
    const handleToggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
            <ToastContainer
                position="bottom-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                aria-label="Notification"
                toastStyle={{
                    backgroundColor: '#F59E0B',
                    color: '#1F2937',
                }}
            />

            {/* Sidebar - Mobile only (hidden on desktop) */}
            <div className="lg:hidden">
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    activeTab={contextActiveTab}
                    setActiveTab={setContextActiveTab}
                />
            </div>

            {/* Ne pas afficher le header sur les pages de lecture vidéo */}
            {!location.pathname.startsWith('/watch/') && (
                <Header
                    title={location.pathname === '/home' ? t('home') :
                        getTitleFromPath(location.pathname, t)}
                    isSidebarOpen={isSidebarOpen}
                    onToggleSidebar={handleToggleSidebar}
                    isWatchRoute={location.pathname.startsWith('/watch/')}
                />
            )}

            <div className={`page-transition fadeIn min-h-screen ${showBottomNav ? 'pb-20' : ''} ${!location.pathname.startsWith('/watch/') ? 'pt-16 md:pt-16' : 'pt-0'} transition-all duration-300 ease-in-out`}>
                <Routes>
                    {/* Routes publiques - Accessibles sans authentification */}
                    <Route path="/privacy" element={<PrivacyScreen />} />

                    {/* Watch Route - Maintenant protégée par authentification */}
                    <Route path="/watch/:uid" element={
                        <WatchScreen onReturnHome={handleReturnHome} />
                    } />

                    {/* Routes protégées - Nécessitent une authentification */}
                    {isAuthenticated && (
                        <>
                            {/* Main Routes */}
                            <Route path="/home" element={
                                <HomeScreen
                                    onSelectMedia={handleSelectMedia}
                                    onPlay={handlePlay}
                                    navigateToCategory={handleNavigateToCategory}
                                />
                            } />

                            <Route path="/search" element={
                                <SearchScreen
                                    onNavigate={(screen: string, data?: any) => {
                                        if (screen === 'movieDetail' && data?.uid) {
                                            navigate(`/documentary/${data.uid}`);
                                        } else if (screen === 'serieDetail' && data?.uid_serie) {
                                            navigate(`/serie/${data.uid_serie}`);
                                        } else if (screen === 'seasonDetail' && data?.uid_serie) {
                                            navigate(`/serie/${data.uid_serie}`);
                                        } else if (screen === 'episodePlayer' && data?.uid_episode) {
                                            navigate(`/watch/${data.uid_episode}`);
                                        }
                                    }}
                                />
                            } />

                            <Route path="/profile" element={
                                <div className="flex-1 flex flex-col">
                                    <ProfileScreen
                                        navigate={handleNavigateToScreen}
                                        onSelectMedia={handleSelectMedia}
                                        onPlay={handlePlay}
                                    />
                                </div>
                            } />

                            <Route path="/bookmarks" element={
                                <BookmarksScreen
                                    onBack={() => navigate('/profile')}
                                    onSelectMedia={handleSelectMedia}
                                    onPlay={handlePlay}
                                />
                            } />

                            {/* Category Routes */}
                            <Route path="/documentaries" element={
                                <MoviesScreen
                                    onSelectMedia={handleSelectMedia}
                                    onPlay={handlePlay}
                                />
                            } />

                            <Route path="/productions" element={
                                <SeriesScreen
                                    onSelectMedia={handleSelectMedia}
                                    onPlay={handlePlay}
                                />
                            } />

                            <Route path="/podcasts" element={
                                <PodcastsScreen
                                    onSelectMedia={handleSelectMedia}
                                    onPlay={handlePlay}
                                />
                            } />

                            {/* Detail Routes */}
                            <Route path="/documentary/:uid" element={
                                <MediaDetailWrapper
                                    onPlay={handlePlay}
                                    playingItem={playingItem}
                                />
                            } />

                            <Route path="/production/:uid" element={
                                <MediaDetailWrapper
                                    onPlay={handlePlay}
                                    playingItem={playingItem}
                                />
                            } />

                            <Route path="/podcast/:uid" element={
                                <MediaDetailWrapper
                                    onPlay={handlePlay}
                                    playingItem={playingItem}
                                />
                            } />

                            {/* Profile Sub-Routes */}
                            <Route path="/favorites" element={
                                <BookmarksScreen
                                    onSelectMedia={handleSelectMedia}
                                    onPlay={handlePlay}
                                    onBack={handleBack}
                                />
                            } />

                            <Route path="/preferences" element={
                                <PreferencesScreen onBack={handleBack} />
                            } />

                            <Route path="/editprofile" element={
                                <EditProfileScreen onBack={handleBack} />
                            } />

                            <Route path="/change-password" element={
                                <ChangePasswordScreen />
                            } />

                            <Route path="/history" element={
                                <HistoryScreen
                                    onSelectMedia={handleSelectMedia}
                                    onPlay={handlePlay}
                                    onBack={handleBack}
                                />
                            } />

                            <Route path="/redeem-voucher" element={
                                <RedeemVoucherScreen />
                            } />

                            <Route path="/manage-subscription" element={
                                <ManageSubscriptionScreen />
                            } />

                            <Route path="/help" element={
                                <HelpScreen />
                            } />
                            <Route path="/whats-new" element={
                                <WhatsNewScreen />
                            } />

                            <Route path="/manage-info-bar" element={
                                <ManageInfoBarScreen />
                            } />

                            <Route path="/manage-ads" element={
                                <ManageAdsScreen />
                            } />

                            <Route path="/manage-users" element={
                                <ManageUsersScreen />
                            } />
                            <Route path="/notifications" element={
                                <NotificationsScreen />
                            } />
                            <Route path="/manage-notifications" element={
                                <ManageNotificationsScreen />
                            } />
                            <Route path="/manage-reports" element={
                                <ManageReportsScreen />
                            } />
                            <Route path="/admin" element={
                                <AdminBackupVideosScreen />
                            } />
                            <Route path="/payment-success" element={
                                <PaymentSuccessScreen />
                            } />
                            <Route path="/donate" element={
                                <DonateScreen />
                            } />
                        </>
                    )}

                    {/* Redirects */}
                    <Route path="/get-started" element={<Navigate to="/home" replace />} />
                    <Route path="/serie/:uid" element={<SeriesToTeachingsRedirect />} />
                    <Route path="/series" element={<Navigate to="/productions" replace />} />
                    <Route path="/teachings" element={<Navigate to="/productions" replace />} />
                    <Route path="/teaching/:uid" element={<SeriesToTeachingsRedirect />} />
                    <Route path="/movie/:uid" element={<MoviesToDocumentariesRedirect />} />
                    <Route path="/movies" element={<Navigate to="/documentaries" replace />} />
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/login"} replace />} />
                </Routes>
            </div>

            {showBottomNav && (
                <div className="fixed bottom-0 left-0 right-0 z-20 lg:hidden">
                    <BottomNav />
                </div>
            )}

            {/* Modal RGPD - Affiché si l'utilisateur n'a pas accepté la politique */}
            {showRGPDModal && userProfile && (
                <RGPDConsentModal
                    userProfile={userProfile}
                    onAccept={(updatedProfile) => {
                        console.log('✅ Consentement RGPD accepté:', updatedProfile);
                        setUserProfile(updatedProfile);
                        setShowRGPDModal(false);
                    }}
                />
            )}

            <UpdatePrompt />
            <WhatsNewModal />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AppProvider>
                <ThemeProvider>
                    <AppContent />
                </ThemeProvider>
            </AppProvider>
        </BrowserRouter>
    );
};

const MoviesToDocumentariesRedirect = () => {
    const { uid } = useParams();
    return <Navigate to={`/documentary/${uid}`} replace />;
};

const SeriesToTeachingsRedirect = () => {
    const { uid } = useParams();
    return <Navigate to={`/production/${uid}`} replace />;
};

// Dans App.tsx, ajoutez cette ligne temporairement
if (typeof window !== 'undefined') {
    (window as any).initializeMovieViews = initializeMovieViews;
}

export default App;