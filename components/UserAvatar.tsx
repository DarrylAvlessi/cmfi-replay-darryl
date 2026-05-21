import React from 'react';
import { User } from '../types';

interface UserAvatarProps {
  user: User;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user }) => {
  return (
    <div className="flex flex-col items-center space-y-2 flex-shrink-0">
      <div className="relative">
        <img
          className="w-16 h-16 rounded-full object-cover border-2 border-gray-400 dark:border-gray-600"
          src={user.avatarUrl}
          alt={user.name}
        />
        {user.isOnline && (
          <span className="absolute bottom-0 right-0 block h-4 w-4 rounded-full bg-green-400 ring-2 ring-white dark:ring-black" />
        )}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 truncate w-16 text-center">{user.name}</p>
    </div>
  );
};

export default UserAvatar;