import React, { useEffect, useState } from 'react';
import { userGeographyService } from '../lib/firestore';

interface CountryStat {
    countryCode: string;
    countryName: string;
    userCount: number;
    percentage: number;
}

interface UserGeographyMapProps {
    onCountryClick?: (countryCode: string, countryName: string) => void;
}

const UserGeographyMap: React.FC<UserGeographyMapProps> = ({ onCountryClick }) => {
    const [countryStats, setCountryStats] = useState<CountryStat[]>([]);
    const [totalUsers, setTotalUsers] = useState<number>(0);
    const [totalUsersWithCountry, setTotalUsersWithCountry] = useState<number>(0);
    const [totalUsersWithPhoneNumber, setTotalUsersWithPhoneNumber] = useState<number>(0);
    const [totalUsersWithCompleteProfile, setTotalUsersWithCompleteProfile] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadGeographyData = async () => {
            setLoading(true);
            try {
                const [stats, total, withCountry, withPhone, withComplete] = await Promise.all([
                    userGeographyService.getUsersByCountry(),
                    userGeographyService.getTotalUsers(),
                    userGeographyService.getTotalUsersWithCountry(),
                    userGeographyService.getTotalUsersWithPhoneNumber(),
                    userGeographyService.getTotalUsersWithCompleteProfile()
                ]);
                setCountryStats(stats);
                setTotalUsers(total);
                setTotalUsersWithCountry(withCountry);
                setTotalUsersWithPhoneNumber(withPhone);
                setTotalUsersWithCompleteProfile(withComplete);
            } catch (error) {
                console.error('Error loading geography data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadGeographyData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    const usersWithoutCountry = totalUsers - totalUsersWithCountry;
    const usersWithoutPhone = totalUsers - totalUsersWithPhoneNumber;
    const usersWithoutComplete = totalUsers - totalUsersWithCompleteProfile;

    return (
        <div className="space-y-4">
            {/* Statistiques globales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total utilisateurs</div>
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{totalUsers}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">Avec pays renseigné</div>
                    <div className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">{totalUsersWithCountry}</div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {totalUsers > 0 ? Math.round((totalUsersWithCountry / totalUsers) * 100) : 0}% du total
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Avec téléphone renseigné</div>
                    <div className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">{totalUsersWithPhoneNumber}</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {totalUsers > 0 ? Math.round((totalUsersWithPhoneNumber / totalUsers) * 100) : 0}% du total
                    </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Formulaire complété</div>
                    <div className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">{totalUsersWithCompleteProfile}</div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {totalUsers > 0 ? Math.round((totalUsersWithCompleteProfile / totalUsers) * 100) : 0}% du total
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                        (Pays + Téléphone)
                    </div>
                </div>
            </div>

            {/* Statistiques détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-black/20 p-4 rounded-lg border border-gray-200 dark:border-black">
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Sans pays renseigné</div>
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">{usersWithoutCountry}</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-black/20 p-4 rounded-lg border border-gray-200 dark:border-black">
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Sans téléphone renseigné</div>
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">{usersWithoutPhone}</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-sm text-red-600 dark:text-red-400 font-medium">Formulaire incomplet</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{usersWithoutComplete}</div>
                </div>
            </div>

            {/* Liste des pays */}
            {countryStats.length > 0 ? (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        🌍 Répartition par pays
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {countryStats.map((stat, index) => (
                            <div
                                key={stat.countryCode}
                                className={`bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-shadow ${
                                    onCountryClick ? 'cursor-pointer hover:shadow-md hover:border-amber-500 dark:hover:border-amber-400' : 'hover:shadow-md'
                                }`}
                                onClick={() => onCountryClick && onCountryClick(stat.countryCode, stat.countryName)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-amber-600 dark:text-amber-400 w-8">
                                            #{index + 1}
                                        </span>
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {stat.countryName}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {stat.countryCode}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                            {stat.userCount} utilisateur{stat.userCount > 1 ? 's' : ''}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {stat.percentage.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                                {/* Barre de progression */}
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${stat.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-lg mb-2">Aucun utilisateur n'a renseigné son pays</p>
                    <p className="text-sm">Les utilisateurs doivent compléter leur profil pour apparaître ici</p>
                </div>
            )}
        </div>
    );
};

export default UserGeographyMap;

