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
    const textColor = isDestructive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100';
    const iconColor = isDestructive ? 'text-rose-500' : 'text-blue-600 dark:text-sky-400';

    return (
        <button onClick={onClick} className={`group flex w-full items-center justify-between text-left transition-colors duration-200 hover:bg-blue-500/5 dark:hover:bg-sky-400/5 ${dense ? 'p-3' : 'p-4'}`}>
            <div className={`flex items-center ${dense ? 'space-x-3' : 'space-x-4'}`}>
                <div className={`relative flex items-center justify-center rounded-xl bg-blue-500/5 ${dense ? 'h-9 w-9' : 'h-10 w-10'} ${isDestructive ? 'bg-rose-500/5' : ''}`}>
                    <Icon className={`${dense ? 'w-5 h-5' : 'w-6 h-6'} ${iconColor}`} />
                    {adornment && (
                        <span className="absolute -top-1 -right-1">{adornment}</span>
                    )}
                </div>
                <span className={`${textColor} ${dense ? 'text-sm' : ''}`}>{label}</span>
            </div>
            {!isDestructive && <ChevronRightIcon className={`${dense ? 'w-4 h-4' : 'w-5 h-5'} text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500`} />}
        </button>
    );
});

export default SettingsItem;
