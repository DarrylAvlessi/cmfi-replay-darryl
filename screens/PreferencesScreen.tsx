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
            className={`relative inline-flex h-7 w-12 items-center rounded-full shadow-inner transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950 ${enabled
                ? 'bg-gradient-to-r from-blue-600 to-sky-500 shadow-blue-500/30'
                : 'border border-slate-300 bg-slate-200 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:hover:bg-slate-800'
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
        <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-inner dark:border-slate-700 dark:bg-slate-950">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`min-w-[64px] lg:min-w-[80px] px-3 lg:px-4 py-1.5 lg:py-2 text-[13px] lg:text-sm font-semibold rounded-lg transition-all duration-300 ${value === option.value
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
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
        <div className="flex items-center justify-between py-3 lg:py-5 px-1 group transition-all duration-300 hover:px-2">
            <div className="flex items-center space-x-3 lg:space-x-4 flex-1">
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-2 transition-all duration-300 group-hover:border-blue-500/30 group-hover:shadow-lg group-hover:shadow-blue-500/10 lg:p-2.5 dark:border-slate-700 dark:bg-slate-900">
                    <Icon className="h-5 w-5 text-blue-600 transition-colors duration-300 group-hover:text-sky-500 dark:text-sky-400" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 transition-colors duration-300 group-hover:text-blue-600 lg:text-base dark:text-white dark:group-hover:text-sky-300">{label}</p>
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

const PreferenceSection: React.FC<{ title: string; children: React.ReactNode; 'data-tour'?: string }> = ({ title, children, 'data-tour': dataTour }) => (
    <section className="mb-4 lg:mb-6" data-tour={dataTour}>
        <h3 className="mb-2 px-1 font-mono-meta text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 lg:mb-3 dark:text-sky-400">
            {title}
        </h3>
        <div className="broadcast-panel overflow-hidden rounded-2xl">
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {children}
            </div>
        </div>
    </section>
);


const PreferencesScreen: React.FC<PreferencesScreenProps> = ({ onBack }) => {
    const { theme, setTheme, language, setLanguage, t, autoplay, setAutoplay } = useAppContext();

    return (
        <div className="broadcast-canvas min-h-screen">
            <Header title={t('preferencesScreenTitle')} onBack={onBack} isSidebarOpen={false} onToggleSidebar={() => {}} />
            <div className="px-4 py-4 lg:py-6 max-w-2xl mx-auto">
                {/* Titre de la page avec description */}
                <div className="mb-4 lg:mb-8">
                    <h2 className="mb-1 font-display text-xl font-bold text-slate-900 lg:mb-2 lg:text-2xl dark:text-white">
                        {t('preferencesScreenTitle')}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {t('preferencesSubtitle')}
                    </p>
                </div>

                <PreferenceSection title={t('appearance')} data-tour="profile-preferences">
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