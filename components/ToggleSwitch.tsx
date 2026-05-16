import React from 'react';

interface ToggleSwitchProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = React.memo(({ enabled, onChange }) => (
    <div className="flex items-center">
        <button
            type="button"
            className={`${enabled ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'} 
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer 
                      rounded-full border-2 border-transparent transition-colors 
                      duration-200 ease-in-out focus:outline-none`}
            onClick={() => onChange(!enabled)}
        >
            <span
                className={`${enabled ? 'translate-x-5' : 'translate-x-0'} 
                          pointer-events-none inline-block h-5 w-5 transform rounded-full 
                          bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
));

export default ToggleSwitch;
