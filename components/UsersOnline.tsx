import React, { useEffect, useState } from 'react';
import { UserProfile } from '../lib/db';
import { userService } from '../lib/db';
import { useAppContext } from '../context/AppContext';

export const UsersOnline: React.FC = () => {
    const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useAppContext();

    useEffect(() => {
        // S'abonner aux mises à jour en temps réel des utilisateurs en ligne
        const unsubscribe = userService.subscribeToOnlineUsers((users) => {
            setOnlineUsers(users);
            setLoading(false);
        });

        // Nettoyer l'abonnement lors du démontage du composant
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="bg-[#0F171E] p-6 rounded-lg">
                <h3 className="text-2xl font-bold mb-6 text-white">
                    {t('activeNow')}
                </h3>
                <div className="h-40 flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Chargement des utilisateurs...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0F171E] p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-6 text-white">
                {t('activeNow')} <span className="text-[#00A8E1]">({onlineUsers.length})</span>
            </h3>
            
            {onlineUsers.length === 0 ? (
                <div className="text-center py-10">
                    <div className="mx-auto w-20 h-20 text-[#00A8E1] mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <p className="text-gray-300 text-lg font-medium mb-1">Aucun utilisateur en ligne</p>
                    <p className="text-gray-400">Revenez plus tard ou invitez des amis</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {onlineUsers.map((user) => (
                        <div key={user.uid} className="flex items-center space-x-4 p-3 bg-[#1A242F] hover:bg-[#2C3A4A] rounded-lg transition-colors cursor-pointer">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-[#0F171E] border-2 border-[#00A8E1] overflow-hidden flex items-center justify-center">
                                    {user.photo_url ? (
                                        <img 
                                            src={user.photo_url}
                                            alt={user.display_name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = ''; // Vide pour forcer l'affichage de la div de secours
                                                target.style.display = 'none';
                                            }}
                                        />
                                    ) : null}
                                    {(!user.photo_url || user.photo_url === '') && (
                                        <div className="w-full h-full flex items-center justify-center bg-[#1A242F] text-white text-lg font-medium">
                                            {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    )}
                                </div>
                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0F171E] ${
                                    user.presence === 'online' ? 'bg-green-500' : 
                                    user.presence === 'away' || user.presence === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'
                                }`}></span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{user.display_name}</p>
                                <p className="text-sm text-gray-300">
                                    {user.presence === 'online' ? 'En ligne' : 
                                     user.presence === 'away' ? 'Inactif' : 
                                     user.presence === 'idle' ? 'Inactif' : 'Hors ligne'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
