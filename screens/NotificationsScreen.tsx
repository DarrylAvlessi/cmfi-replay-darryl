import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService, Notification } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon, CheckIcon, TrashIcon } from '../components/icons';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';

const NotificationsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAppContext();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        // S'abonner aux notifications en temps réel
        const unsubscribe = notificationService.subscribeToUserNotifications(user.uid, (notifs) => {
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await notificationService.markAsRead(notificationId);
            toast.success('Notification marquée comme lue');
        } catch (error) {
            console.error('Error marking notification as read:', error);
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user?.uid) return;
        try {
            await notificationService.markAllAsRead(user.uid);
            toast.success('Toutes les notifications ont été marquées comme lues');
        } catch (error) {
            console.error('Error marking all as read:', error);
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const handleDelete = async (notificationId: string) => {
        try {
            await notificationService.deleteNotification(notificationId);
            toast.success('Notification supprimée');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    const formatDate = (date: Date | Timestamp): string => {
        let dateObj: Date;
        if (date instanceof Timestamp) {
            dateObj = date.toDate();
        } else {
            dateObj = date;
        }

        const now = new Date();
        const diffMs = now.getTime() - dateObj.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        
        return dateObj.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'success': return 'bg-green-100 dark:bg-green-900/30 border-green-500';
            case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500';
            case 'error': return 'bg-red-100 dark:bg-red-900/30 border-red-500';
            default: return 'bg-blue-100 dark:bg-blue-900/30 border-blue-500';
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-black">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-black rounded-full transition-colors"
                        >
                            <ArrowLeftIcon className="w-6 h-6 text-gray-900 dark:text-white" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Notifications
                        </h1>
                        {unreadCount > 0 && (
                            <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        >
                            Tout marquer comme lu
                        </button>
                    )}
                </div>
            </div>

            <div className="px-4 md:px-6 lg:px-8 py-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            Aucune notification
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-lg border-2 ${getTypeColor(notification.type)} ${
                                    !notification.read ? 'opacity-100' : 'opacity-60'
                                } transition-all hover:shadow-lg`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900 dark:text-white">
                                                {notification.title}
                                            </h3>
                                            {!notification.read && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                            <span>{formatDate(notification.createdAt)}</span>
                                            {notification.link && (
                                                <a
                                                    href={notification.link}
                                                    className="text-amber-600 dark:text-amber-400 hover:underline"
                                                >
                                                    Voir plus →
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        {!notification.read && (
                                            <button
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                className="p-2 hover:bg-white/50 dark:hover:bg-black/50 rounded-full transition-colors"
                                                title="Marquer comme lu"
                                            >
                                                <CheckIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(notification.id)}
                                            className="p-2 hover:bg-white/50 dark:hover:bg-black/50 rounded-full transition-colors"
                                            title="Supprimer"
                                        >
                                            <TrashIcon className="w-5 h-5 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsScreen;

