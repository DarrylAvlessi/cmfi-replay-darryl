import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { UserProfile, userService, userMetricsService, userGeographyService, seasonSerieService, serieService, SeasonSerie, Serie } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon, SearchIcon } from '../components/icons';
import { Timestamp } from 'firebase/firestore';
import UserNavigationTimeline from '../components/UserNavigationTimeline';
import UserGeographyMap from '../components/UserGeographyMap';

const ManageUsersScreen: React.FC = () => {
    const navigate = useNavigate();
    const { t, userProfile } = useAppContext();
    const [users, setUsers] = useState<(UserProfile & { lastSeen?: Date | Timestamp })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // États pour les métriques
    const [top10MostConnected, setTop10MostConnected] = useState<Array<{ user: UserProfile; connectionCount: number }>>([]);
    const [averageSessionDuration, setAverageSessionDuration] = useState<number>(0);
    const [top10MostActive, setTop10MostActive] = useState<Array<{ user: UserProfile; viewCount: number }>>([]);
    const [peakHours, setPeakHours] = useState<Array<{ hour: number; connectionCount: number }>>([]);
    const [top10TotalOnlineTime, setTop10TotalOnlineTime] = useState<Array<{ user: UserProfile; totalOnlineTime: number }>>([]);
    const [totalUsersWithRGPD, setTotalUsersWithRGPD] = useState<number>(0);
    const [totalUsers, setTotalUsers] = useState<number>(0);
    const [loadingMetrics, setLoadingMetrics] = useState(true);
    const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
    const [countryUsers, setCountryUsers] = useState<UserProfile[]>([]);
    const [loadingCountryUsers, setLoadingCountryUsers] = useState(false);

    useEffect(() => {
        // S'abonner aux mises à jour en temps réel des utilisateurs (incluant les inactifs)
        const unsubscribe = userService.subscribeToOnlineUsers((usersList) => {
            // Debug: afficher les valeurs de lastSeen
            console.log('🔍 Users received with lastSeen:', usersList.map(u => ({
                name: u.display_name,
                presence: u.presence,
                lastSeen: u.lastSeen,
                lastSeenType: u.lastSeen ? typeof u.lastSeen : 'undefined',
                lastSeenValue: u.lastSeen instanceof Date ? u.lastSeen.toISOString() : 
                              u.lastSeen ? String(u.lastSeen) : 'undefined'
            })));
            setUsers(usersList);
            setLoading(false);
        }, true); // includeInactive = true pour voir aussi les offline récents

        return () => unsubscribe();
    }, []);

    // Charger les métriques
    useEffect(() => {
        const loadMetrics = async () => {
            setLoadingMetrics(true);
            try {
                const [mostConnected, avgDuration, mostActive, peak, totalTime, rgpdCount, total] = await Promise.all([
                    userMetricsService.getTop10MostConnectedUsers(),
                    userMetricsService.getAverageSessionDuration(),
                    userMetricsService.getTop10MostActiveUsers(),
                    userMetricsService.getPeakHours(),
                    userMetricsService.getTop10TotalOnlineTime(),
                    userGeographyService.getTotalUsersWithRGPDConsent(),
                    userGeographyService.getTotalUsers()
                ]);
                
                setTop10MostConnected(mostConnected);
                setAverageSessionDuration(avgDuration);
                setTop10MostActive(mostActive);
                setPeakHours(peak);
                setTop10TotalOnlineTime(totalTime);
                setTotalUsersWithRGPD(rgpdCount);
                setTotalUsers(total);
            } catch (error) {
                console.error('Error loading metrics:', error);
            } finally {
                setLoadingMetrics(false);
            }
        };
        
        loadMetrics();
    }, []);

    const handleCountryClick = async (countryCode: string, countryName: string) => {
        setSelectedCountry({ code: countryCode, name: countryName });
        setLoadingCountryUsers(true);
        try {
            const users = await userGeographyService.getUsersByCountryCode(countryCode);
            setCountryUsers(users);
        } catch (error) {
            console.error('Error loading country users:', error);
            setCountryUsers([]);
        } finally {
            setLoadingCountryUsers(false);
        }
    };

    const formatLastSeen = (lastSeen?: Date | Timestamp, updatedAt?: Date | Timestamp): string => {
        // Utiliser updatedAt comme fallback si lastSeen n'existe pas
        const dateToUse = lastSeen || updatedAt;
        
        // Debug: afficher la valeur brute
        console.log('📅 formatLastSeen called with:', {
            lastSeen,
            updatedAt,
            dateToUse,
            type: dateToUse ? typeof dateToUse : 'undefined',
            isDate: dateToUse instanceof Date,
            isTimestamp: dateToUse instanceof Timestamp,
            value: dateToUse instanceof Date ? dateToUse.toISOString() : 
                   dateToUse instanceof Timestamp ? dateToUse.toDate().toISOString() :
                   dateToUse ? String(dateToUse) : 'undefined'
        });
        
        if (!dateToUse) {
            console.warn('⚠️ lastSeen and updatedAt are both undefined or null');
            return 'Jamais';
        }
        
        let date: Date;
        try {
            if (dateToUse instanceof Timestamp) {
                date = dateToUse.toDate();
            } else if (dateToUse instanceof Date) {
                date = dateToUse;
            } else {
                console.warn('⚠️ dateToUse is not Date or Timestamp:', typeof dateToUse, dateToUse);
                return 'Jamais';
            }

            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            
            // Vérifier si la date est valide
            if (isNaN(date.getTime())) {
                console.warn('⚠️ Invalid date:', date);
                return 'Jamais';
            }
            
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'À l\'instant';
            if (diffMins < 60) return `Il y a ${diffMins} min`;
            if (diffHours < 24) return `Il y a ${diffHours}h`;
            if (diffDays < 7) return `Il y a ${diffDays}j`;
            
            // Format complet pour les dates plus anciennes
            return date.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('❌ Error formatting lastSeen:', error, dateToUse);
            return 'Erreur';
        }
    };

    const getStatusLabel = (presence: string): string => {
        switch (presence) {
            case 'online': return 'En ligne';
            case 'away': return 'Inactif';
            case 'idle': return 'Inactif';
            case 'offline': return 'Hors ligne';
            default: return 'Inconnu';
        }
    };

    const getStatusColor = (presence: string): string => {
        switch (presence) {
            case 'online': return 'bg-green-500';
            case 'away': return 'bg-yellow-500';
            case 'idle': return 'bg-yellow-500';
            case 'offline': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    // Filtrer les utilisateurs par terme de recherche
    const filteredUsers = users.filter(user => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        const displayName = (user.display_name || '').toLowerCase();
        return displayName.includes(query);
    });

    // Fonction helper pour obtenir le timestamp de lastSeen en millisecondes
    const getLastSeenTimestamp = (user: UserProfile & { lastSeen?: Date | Timestamp; updatedAt?: Date | Timestamp }): number => {
        const dateToUse = user.lastSeen || user.updatedAt;
        if (!dateToUse) return 0;
        
        if (dateToUse instanceof Date) {
            return dateToUse.getTime();
        } else if (dateToUse instanceof Timestamp) {
            return dateToUse.toMillis();
        }
        return 0;
    };

    // Séparer les utilisateurs filtrés par statut et trier par lastSeen (plus récent en premier)
    const onlineUsers = filteredUsers
        .filter(u => u.presence === 'online')
        .sort((a, b) => {
            const aTime = getLastSeenTimestamp(a);
            const bTime = getLastSeenTimestamp(b);
            // Plus récent en premier (ordre décroissant)
            return bTime - aTime;
        });
    
    const awayUsers = filteredUsers
        .filter(u => u.presence === 'away' || u.presence === 'idle')
        .sort((a, b) => {
            const aTime = getLastSeenTimestamp(a);
            const bTime = getLastSeenTimestamp(b);
            // Plus récent en premier (ordre décroissant)
            return bTime - aTime;
        });
    
    const offlineUsers = filteredUsers
        .filter(u => u.presence === 'offline')
        .sort((a, b) => {
            const aTime = getLastSeenTimestamp(a);
            const bTime = getLastSeenTimestamp(b);
            // Plus récent en premier (ordre décroissant) - ceux qui étaient récemment inactifs apparaissent en premier
            return bTime - aTime;
        });

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-black">
                <div className="flex items-center gap-4 px-4 py-4">
                    <button
                        onClick={() => navigate('/profile')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-black rounded-full transition-colors"
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-gray-900 dark:text-white" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Gestion des utilisateurs
                    </h1>
                </div>
            </div>

            <div className="px-4 md:px-6 lg:px-8 py-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Barre de recherche */}
                        <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Rechercher un utilisateur par nom..."
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <span className="text-xl">×</span>
                                    </button>
                                )}
                            </div>
                            {searchQuery && (
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>

                        {/* Statistiques de base */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-500 dark:text-gray-400">En ligne</div>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{onlineUsers.length}</div>
                            </div>
                            <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Inactifs</div>
                                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{awayUsers.length}</div>
                            </div>
                            <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Hors ligne</div>
                                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{offlineUsers.length}</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    RGPD accepté
                                </div>
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{loadingMetrics ? '...' : totalUsersWithRGPD}</div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    {loadingMetrics ? '' : totalUsers > 0 ? `${Math.round((totalUsersWithRGPD / totalUsers) * 100)}% du total` : '0%'}
                                </div>
                            </div>
                        </div>

                        {/* Modal des utilisateurs par pays */}
                        {selectedCountry && (
                            <CountryUsersModal
                                country={selectedCountry}
                                users={countryUsers}
                                loading={loadingCountryUsers}
                                onClose={() => setSelectedCountry(null)}
                                formatLastSeen={formatLastSeen}
                                getStatusLabel={getStatusLabel}
                                getStatusColor={getStatusColor}
                            />
                        )}

                        {/* Métriques avancées */}
                        {loadingMetrics ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-6 mb-6">
                                {/* Top 10 utilisateurs les plus connectés */}
                                <section className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                        🔝 Top 10 utilisateurs les plus connectés
                                    </h2>
                                    {top10MostConnected.length > 0 ? (
                                        <div className="space-y-2">
                                            {top10MostConnected.map((item, index) => (
                                                <div key={item.user.uid} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold text-amber-600 dark:text-amber-400 w-8">
                                                            #{index + 1}
                                                        </span>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {item.user.display_name || item.user.email}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {item.connectionCount} connexion{item.connectionCount > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
                                    )}
                                </section>

                                {/* Temps moyen de session */}
                                <section className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                        ⏱️ Temps moyen de session
                                    </h2>
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                        {averageSessionDuration > 0 
                                            ? `${Math.round(averageSessionDuration / 60000)} min`
                                            : 'N/A'}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        Durée moyenne que les utilisateurs restent en ligne
                                    </p>
                                </section>

                                {/* Top 10 utilisateurs les plus actifs */}
                                <section className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                        🎬 Top 10 utilisateurs les plus actifs
                                    </h2>
                                    {top10MostActive.length > 0 ? (
                                        <div className="space-y-2">
                                            {top10MostActive.map((item, index) => (
                                                <div key={item.user.uid} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400 w-8">
                                                            #{index + 1}
                                                        </span>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {item.user.display_name || item.user.email}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {item.viewCount} vue{item.viewCount > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
                                    )}
                                </section>

                                {/* Heures de pointe */}
                                <section className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                        📊 Heures de pointe
                                    </h2>
                                    {peakHours.length > 0 ? (
                                        <div className="space-y-2">
                                            {peakHours.map((item, index) => (
                                                <div key={item.hour} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold text-green-600 dark:text-green-400 w-8">
                                                            #{index + 1}
                                                        </span>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {item.hour}h - {item.hour + 1}h
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {item.connectionCount} connexion{item.connectionCount > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
                                    )}
                                </section>

                                {/* Top 10 temps total en ligne */}
                                <section className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                        ⏰ Top 10 temps total en ligne
                                    </h2>
                                    {top10TotalOnlineTime.length > 0 ? (
                                        <div className="space-y-2">
                                            {top10TotalOnlineTime.map((item, index) => {
                                                const hours = Math.floor(item.totalOnlineTime / (1000 * 60 * 60));
                                                const days = Math.floor(hours / 24);
                                                const displayTime = days > 0 
                                                    ? `${days} jour${days > 1 ? 's' : ''}`
                                                    : `${hours} heure${hours > 1 ? 's' : ''}`;
                                                
                                                return (
                                                    <div key={item.user.uid} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 w-8">
                                                                #{index + 1}
                                                            </span>
                                                            <span className="font-medium text-gray-900 dark:text-white">
                                                                {item.user.display_name || item.user.email}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                            {displayTime}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
                                    )}
                                </section>

                                {/* Cartographie des pays */}
                                <section className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                        🌍 Répartition géographique des utilisateurs
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        Statistiques basées sur les utilisateurs ayant complété leur profil avec leur pays actuel
                                    </p>
                                    <UserGeographyMap onCountryClick={handleCountryClick} />
                                </section>
                            </div>
                        )}

                        {/* Liste des utilisateurs en ligne */}
                        {onlineUsers.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                    En ligne ({onlineUsers.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {onlineUsers.map((user) => (
                                        <UserCard key={user.uid} user={user} formatLastSeen={formatLastSeen} getStatusLabel={getStatusLabel} getStatusColor={getStatusColor} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Liste des utilisateurs inactifs */}
                        {awayUsers.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                    Inactifs ({awayUsers.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {awayUsers.map((user) => (
                                        <UserCard key={user.uid} user={user} formatLastSeen={formatLastSeen} getStatusLabel={getStatusLabel} getStatusColor={getStatusColor} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Liste des utilisateurs hors ligne */}
                        {offlineUsers.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                    Hors ligne ({offlineUsers.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {offlineUsers.map((user) => (
                                        <UserCard key={user.uid} user={user} formatLastSeen={formatLastSeen} getStatusLabel={getStatusLabel} getStatusColor={getStatusColor} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {filteredUsers.length === 0 && searchQuery && (
                            <div className="text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400">
                                    Aucun utilisateur trouvé pour "{searchQuery}"
                                </p>
                            </div>
                        )}
                        {users.length === 0 && !searchQuery && (
                            <div className="text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface UserCardProps {
    user: UserProfile & { lastSeen?: Date | Timestamp; updatedAt?: Date | Timestamp };
    formatLastSeen: (lastSeen?: Date | Timestamp, updatedAt?: Date | Timestamp) => string;
    getStatusLabel: (presence: string) => string;
    getStatusColor: (presence: string) => string;
}

const UserCard: React.FC<UserCardProps> = ({ user, formatLastSeen, getStatusLabel, getStatusColor }) => {
    const [showTimeline, setShowTimeline] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="space-y-4">
            <div 
                className="flex items-center space-x-4 p-4 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setShowDetails(true)}
            >
            <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 overflow-hidden flex items-center justify-center">
                    {user.photo_url ? (
                        <img 
                            src={user.photo_url}
                            alt={user.display_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '';
                                target.style.display = 'none';
                            }}
                        />
                    ) : null}
                    {(!user.photo_url || user.photo_url === '') && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-lg font-medium">
                            {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                    )}
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-black ${getStatusColor(user.presence)}`}></span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white font-medium truncate">{user.display_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getStatusLabel(user.presence)}
                </p>
                {/* Afficher la dernière activité pour tous les utilisateurs */}
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    <p>Dernière activité: {formatLastSeen(user.lastSeen, user.updatedAt)}</p>
                </div>
                <button
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                    {showTimeline ? 'Masquer' : 'Voir parcours'}
                </button>
            </div>
            </div>
            
            {showTimeline && (
                <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <UserNavigationTimeline userUid={user.uid} height={300} />
                </div>
            )}

            {/* Modal des détails utilisateur */}
            {showDetails && (
                <UserDetailsModal 
                    user={user} 
                    onClose={() => setShowDetails(false)}
                    formatLastSeen={formatLastSeen}
                    getStatusLabel={getStatusLabel}
                    getStatusColor={getStatusColor}
                />
            )}
        </div>
    );
};

interface UserDetailsModalProps {
    user: UserProfile & { lastSeen?: Date | Timestamp; updatedAt?: Date | Timestamp };
    onClose: () => void;
    formatLastSeen: (lastSeen?: Date | Timestamp, updatedAt?: Date | Timestamp) => string;
    getStatusLabel: (presence: string) => string;
    getStatusColor: (presence: string) => string;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose, formatLastSeen, getStatusLabel, getStatusColor }) => {
    const [secretSeasons, setSecretSeasons] = useState<Array<{ season: SeasonSerie; serie: Serie | null }>>([]);
    const [loadingSeasons, setLoadingSeasons] = useState(false);
    const [seasonSearch, setSeasonSearch] = useState('');

    const formatDate = (date?: Date | Timestamp): string => {
        if (!date) return 'Non disponible';
        const d = date instanceof Timestamp ? date.toDate() : date;
        return d.toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Charger toutes les saisons secrètes
    useEffect(() => {
        const loadSecretSeasons = async () => {
            setLoadingSeasons(true);
            try {
                // Charger toutes les saisons
                const allSeasons = await seasonSerieService.getAllSeasons();
                // Filtrer seulement les saisons secrètes
                const secretSeasonsList = allSeasons.filter(s => s.isSecret);
                
                // Pour chaque saison secrète, charger la série associée
                const seasonsWithSeries = await Promise.all(
                    secretSeasonsList.map(async (season) => {
                        const serie = await serieService.getSerieByUid(season.uid_serie);
                        return { season, serie };
                    })
                );
                
                setSecretSeasons(seasonsWithSeries);
            } catch (error) {
                console.error('Error loading secret seasons:', error);
            } finally {
                setLoadingSeasons(false);
            }
        };
        
        loadSecretSeasons();
    }, []);

    const handleToggleSeasonAccess = async (seasonUid: string) => {
        try {
            // Trouver la saison
            const seasonData = secretSeasons.find(s => s.season.uid_season === seasonUid);
            if (!seasonData) return;

            const season = seasonData.season;
            const currentAllowed = season.allowedUserIds || [];
            const isAllowed = currentAllowed.includes(user.uid);

            let newAllowedUserIds: string[];
            if (isAllowed) {
                // Retirer l'utilisateur
                newAllowedUserIds = currentAllowed.filter(id => id !== user.uid);
            } else {
                // Ajouter l'utilisateur
                newAllowedUserIds = [...currentAllowed, user.uid];
            }

            // Mettre à jour la saison dans Firestore
            await seasonSerieService.updateSeasonByUid(seasonUid, {
                allowedUserIds: newAllowedUserIds
            });

            // Mettre à jour l'état local
            setSecretSeasons(prev => prev.map(s => {
                if (s.season.uid_season === seasonUid) {
                    return {
                        ...s,
                        season: {
                            ...s.season,
                            allowedUserIds: newAllowedUserIds
                        }
                    };
                }
                return s;
            }));
        } catch (error) {
            console.error('Error updating season access:', error);
        }
    };

    const modalContent = (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                zIndex: 9999
            }}
        >
            <div 
                className="bg-white dark:bg-black rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
                onClick={(e) => e.stopPropagation()}
                style={{ 
                    position: 'relative',
                    zIndex: 10000,
                    margin: 'auto'
                }}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Détails de l'utilisateur
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <span className="text-2xl text-gray-500 dark:text-gray-400">×</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Photo et nom */}
                    <div className="flex items-center space-x-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 overflow-hidden flex items-center justify-center">
                                {user.photo_url ? (
                                    <img 
                                        src={user.photo_url}
                                        alt={user.display_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '';
                                            target.style.display = 'none';
                                        }}
                                    />
                                ) : null}
                                {(!user.photo_url || user.photo_url === '') && (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-2xl font-medium">
                                        {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                            </div>
                            <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-black ${getStatusColor(user.presence)}`}></span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {user.display_name || 'Utilisateur sans nom'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {getStatusLabel(user.presence)}
                            </p>
                        </div>
                    </div>

                    {/* Informations de base */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                            <p className="text-gray-900 dark:text-white font-medium">{user.email || 'Non disponible'}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">UID</p>
                            <p className="text-gray-900 dark:text-white font-mono text-xs break-all">{user.uid}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pays actuel</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                                {user.country || 'Non renseigné'}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Numéro de téléphone</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                                {user.phoneNumber || 'Non renseigné'}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Dernière activité</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                                {formatLastSeen(user.lastSeen, user.updatedAt)}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Date de création</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                                {formatDate(user.createdAt)}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Dernière mise à jour</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                                {formatDate(user.updatedAt)}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">RGPD accepté</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                                {user.rgpdAcceptedAt ? (
                                    <span className="flex items-center gap-2">
                                        <span className="text-green-600 dark:text-green-400">✓ Oui</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            ({formatDate(user.rgpdAcceptedAt)})
                                        </span>
                                    </span>
                                ) : (
                                    <span className="text-red-600 dark:text-red-400">✗ Non</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Informations supplémentaires */}
                    {(user.isPremium !== undefined || user.isAdmin !== undefined) && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">Statut</p>
                            <div className="flex flex-wrap gap-2">
                                {user.isPremium && (
                                    <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-sm font-medium">
                                        Premium
                                    </span>
                                )}
                                {user.isAdmin && (
                                    <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-medium">
                                        Administrateur
                                    </span>
                                )}
                                {!user.isPremium && !user.isAdmin && (
                                    <span className="px-3 py-1 bg-gray-500 text-white rounded-full text-sm font-medium">
                                        Utilisateur standard
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Gestion des saisons secrètes */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-1">
                                    Saisons secrètes
                                </p>
                                <p className="text-xs text-purple-700 dark:text-purple-300">
                                    Gérer les saisons secrètes accessibles par cet utilisateur
                                </p>
                            </div>
                        </div>

                        {/* Recherche de saisons */}
                        <div className="relative mb-4">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher une saison..."
                                value={seasonSearch}
                                onChange={(e) => setSeasonSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Liste des saisons secrètes */}
                        {loadingSeasons ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {secretSeasons
                                    .filter(({ season, serie }) => {
                                        if (!seasonSearch) return true;
                                        const search = seasonSearch.toLowerCase();
                                        return (
                                            season.title_season?.toLowerCase().includes(search) ||
                                            serie?.title_serie?.toLowerCase().includes(search) ||
                                            season.uid_season?.toLowerCase().includes(search)
                                        );
                                    })
                                    .map(({ season, serie }) => {
                                        const hasAccess = (season.allowedUserIds || []).includes(user.uid);
                                        return (
                                            <div
                                                key={season.uid_season}
                                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                                        {season.title_season || 'Saison sans titre'}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                        {serie?.title_serie || 'Série inconnue'} - Saison {season.season_number}
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer ml-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={hasAccess}
                                                        onChange={() => handleToggleSeasonAccess(season.uid_season)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
                                                </label>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}

                        {!loadingSeasons && secretSeasons.length === 0 && (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                <p className="text-sm">Aucune saison secrète disponible</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Utiliser React Portal pour rendre le modal au niveau du body
    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

interface CountryUsersModalProps {
    country: { code: string; name: string };
    users: UserProfile[];
    loading: boolean;
    onClose: () => void;
    formatLastSeen: (lastSeen?: Date | Timestamp, updatedAt?: Date | Timestamp) => string;
    getStatusLabel: (presence: string) => string;
    getStatusColor: (presence: string) => string;
}

const CountryUsersModal: React.FC<CountryUsersModalProps> = ({ 
    country, 
    users, 
    loading, 
    onClose, 
    formatLastSeen,
    getStatusLabel,
    getStatusColor
}) => {
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

    const modalContent = (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                zIndex: 9999
            }}
        >
            <div 
                className="bg-white dark:bg-black rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
                style={{ 
                    position: 'relative',
                    zIndex: 10000,
                    margin: 'auto'
                }}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Utilisateurs de {country.name} ({country.code})
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {users.length} utilisateur{users.length > 1 ? 's' : ''} trouvé{users.length > 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        aria-label="Fermer"
                    >
                        <span className="text-2xl font-bold">×</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                        </div>
                    ) : users.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users.map((user) => (
                                <div
                                    key={user.uid}
                                    className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => setSelectedUser(user)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 overflow-hidden flex items-center justify-center">
                                                {user.photo_url ? (
                                                    <img 
                                                        src={user.photo_url}
                                                        alt={user.display_name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = '';
                                                            target.style.display = 'none';
                                                        }}
                                                    />
                                                ) : null}
                                                {(!user.photo_url || user.photo_url === '') && (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-lg font-medium">
                                                        {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-black ${getStatusColor(user.presence)}`}></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-900 dark:text-white font-medium truncate">
                                                {user.display_name || 'Utilisateur sans nom'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {user.email}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                {getStatusLabel(user.presence)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p className="text-lg">Aucun utilisateur trouvé pour ce pays</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Utiliser React Portal pour rendre le modal au niveau du body
    const portal = typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;

    return (
        <>
            {portal}
            {selectedUser && (
                <UserDetailsModal 
                    user={selectedUser as UserProfile & { lastSeen?: Date | Timestamp; updatedAt?: Date | Timestamp }}
                    onClose={() => setSelectedUser(null)}
                    formatLastSeen={formatLastSeen}
                    getStatusLabel={getStatusLabel}
                    getStatusColor={getStatusColor}
                />
            )}
        </>
    );
};

export default ManageUsersScreen;

