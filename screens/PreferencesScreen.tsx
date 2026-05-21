import React from 'react';
import Header from '../components/Header';
import { ForwardIcon, GlobeIcon, SunIcon } from '../components/icons';
import { useAppContext } from '../context/AppContext';

interface PreferencesScreenProps {
    onBack: () => void;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex items-center h-7 rounded-full w-12 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black shadow-inner ${enabled
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/30'
                : 'bg-gray-300 dark:bg-black/60 hover:bg-gray-400 dark:hover:bg-black/70 border border-gray-400 dark:border-gray-600'
                }`}
        >
            <span
                className={`inline-block w-5 h-5 transform bg-white rounded-full transition-all duration-300 ease-in-out shadow-lg ${enabled ? 'translate-x-6 scale-110' : 'translate-x-1'
                    }`}
            />
        </button>
    );
};

const SegmentedControl: React.FC<{
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: any) => void;
}> = ({ options, value, onChange }) => {
    return (
        <div className="flex bg-gray-200 dark:bg-black/60 backdrop-blur-sm p-1 rounded-xl border border-gray-300 dark:border-gray-700/50 shadow-inner">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`min-w-[80px] px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${value === option.value
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 scale-105'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700/50'
                        }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
};

const PreferenceRow: React.FC<{
    Icon: React.FC<{ className?: string }>;
    label: string;
    description?: string;
    control?: React.ReactNode;
}> = ({ Icon, label, description, control }) => {
    return (
        <div className="flex items-center justify-between py-5 px-1 group transition-all duration-300 hover:px-2">
            <div className="flex items-center space-x-4 flex-1">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700/50 dark:to-black/50 backdrop-blur-sm border border-gray-300 dark:border-gray-600/30 group-hover:border-amber-500/30 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-amber-500/10">
                    <Icon className="w-5 h-5 text-amber-600 dark:text-amber-500/90 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors duration-300" />
                </div>
                <div className="flex-1">
                    <p className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-50 transition-colors duration-300">{label}</p>
                    {description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {control && <div className="flex-shrink-0 ml-4">{control}</div>}
        </div>
    );
};

const PreferenceSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500/80 mb-3 px-1">
            {title}
        </h3>
        <div className="bg-white dark:bg-black backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-xl overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700/30">
                {children}
            </div>
        </div>
    </section>
);


const PreferencesScreen: React.FC<PreferencesScreenProps> = ({ onBack }) => {
    const { theme, setTheme, language, setLanguage, t, autoplay, setAutoplay } = useAppContext();

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <Header title={t('preferencesScreenTitle')} onBack={onBack} />
            <div className="px-4 py-6 max-w-2xl mx-auto">
                {/* Titre de la page avec description */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('preferencesScreenTitle')}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {t('preferencesSubtitle')}
                    </p>
                </div>

                <PreferenceSection title={t('appearance')}>
                    <div className="px-4">
                        <PreferenceRow
                            Icon={SunIcon}
                            label={t('theme')}
                            control={
                                <SegmentedControl
                                    options={[
                                        { label: t('light'), value: 'light' },
                                        { label: t('dark'), value: 'dark' }
                                    ]}
                                    value={theme}
                                    onChange={setTheme}
                                />
                            }
                        />
                        <PreferenceRow
                            Icon={GlobeIcon}
                            label={t('language')}
                            control={
                                <SegmentedControl
                                    options={[
                                        { label: t('english'), value: 'en' },
                                        { label: t('french'), value: 'fr' }
                                    ]}
                                    value={language}
                                    onChange={setLanguage}
                                />
                            }
                        />
                    </div>
                </PreferenceSection>

                <PreferenceSection title={t('playbackSpeed')}>
                    <div className="px-4">
                        <PreferenceRow
                            Icon={ForwardIcon}
                            label={t('autoplayNext')}
                            description={t('autoplayNextDescription')}
                            control={<ToggleSwitch enabled={autoplay} onChange={setAutoplay} />}
                        />
                    </div>
                </PreferenceSection>
            </div>
        </div>
    );
};

export default PreferencesScreen;