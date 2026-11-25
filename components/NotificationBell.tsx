import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../lib/db';
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

    const unsubscribe = notificationService.subscribeToUserNotifications(user.uid, (notifications) => {
      const unread = notifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (!user) return null;

  return (
    <button
      onClick={() => navigate('/notifications')}
      className={`relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors ${className}`}
      aria-label="Notifications"
    >
      <BellIcon className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono-meta font-bold text-white bg-rose-600 rounded-full ring-2 ring-white dark:ring-[#060911]">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
