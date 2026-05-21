import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { BellIcon } from './icons';

interface NotificationBellProps {
    className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
    const { user } = useAppContext();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user?.uid) {
            setUnreadCount(0);
            return;
        }

        // S'abonner aux notifications en temps réel
        const unsubscribe = notificationService.subscribeToUserNotifications(user.uid, (notifications) => {
            const unread = notifications.filter(n => !n.read).length;
            setUnreadCount(unread);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    if (!user) return null;

    return (
        <button
            onClick={() => navigate('/notifications')}
            className={`relative p-2 hover:bg-gray-100 dark:hover:bg-black rounded-full transition-colors ${className}`}
            aria-label="Notifications"
        >
            <BellIcon className="w-6 h-6 text-gray-900 dark:text-white" />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
};

export default NotificationBell;


