import React from 'react';
import { ChevronRightIcon } from './icons';

interface SettingsItemProps {
    Icon: React.FC<{ className?: string }>;
    label: string;
    isDestructive?: boolean;
    onClick?: () => void;
}

const SettingsItem: React.FC<SettingsItemProps> = React.memo(({ Icon, label, isDestructive = false, onClick }) => {
    const textColor = isDestructive ? 'text-red-500' : 'text-gray-900 dark:text-white';
    const iconColor = isDestructive ? 'text-red-500' : 'text-gray-400';

    return (
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
            <div className="flex items-center space-x-4">
                <Icon className={`w-6 h-6 ${iconColor}`} />
                <span className={textColor}>{label}</span>
            </div>
            {!isDestructive && <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
        </button>
    );
});

export default SettingsItem;
