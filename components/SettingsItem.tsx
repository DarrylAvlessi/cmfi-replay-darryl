import React from 'react';
import { ChevronRightIcon } from './icons';

interface SettingsItemProps {
    Icon: React.FC<{ className?: string }>;
    label: string;
    isDestructive?: boolean;
    onClick?: () => void;
    adornment?: React.ReactNode;
    dense?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = React.memo(({ Icon, label, isDestructive = false, onClick, adornment, dense = false }) => {
    const textColor = isDestructive ? 'text-red-500' : 'text-gray-900 dark:text-white';
    const iconColor = isDestructive ? 'text-red-500' : 'text-gray-400';

    return (
        <button onClick={onClick} className={`w-full flex items-center justify-between text-left hover:bg-gray-100 dark:hover:bg-black transition-colors duration-200 ${dense ? 'p-3' : 'p-4'}`}>
            <div className={`flex items-center ${dense ? 'space-x-3' : 'space-x-4'}`}>
                <div className="relative">
                    <Icon className={`${dense ? 'w-5 h-5' : 'w-6 h-6'} ${iconColor}`} />
                    {adornment && (
                        <span className="absolute -top-1 -right-1">{adornment}</span>
                    )}
                </div>
                <span className={`${textColor} ${dense ? 'text-sm' : ''}`}>{label}</span>
            </div>
            {!isDestructive && <ChevronRightIcon className={`${dense ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400`} />}
        </button>
    );
});

export default SettingsItem;
