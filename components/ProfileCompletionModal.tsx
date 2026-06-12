import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { userService, UserProfile } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon } from './icons';

interface ProfileCompletionModalProps {
    userProfile: UserProfile;
    onComplete: (updatedProfile: UserProfile) => void;
}

interface Country {
    code: string;
    nameEn: string;
    nameFr: string;
    flag: string;
    dialCode: string;
}

const COUNTRIES: Country[] = [
    { code: 'FR', nameEn: 'France', nameFr: 'France', flag: '🇫🇷', dialCode: '+33' },
    { code: 'BE', nameEn: 'Belgium', nameFr: 'Belgique', flag: '🇧🇪', dialCode: '+32' },
    { code: 'CH', nameEn: 'Switzerland', nameFr: 'Suisse', flag: '🇨🇭', dialCode: '+41' },
    { code: 'CA', nameEn: 'Canada', nameFr: 'Canada', flag: '🇨🇦', dialCode: '+1' },
    { code: 'US', nameEn: 'United States', nameFr: 'États-Unis', flag: '🇺🇸', dialCode: '+1' },
    { code: 'GB', nameEn: 'United Kingdom', nameFr: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44' },
    { code: 'DE', nameEn: 'Germany', nameFr: 'Allemagne', flag: '🇩🇪', dialCode: '+49' },
    { code: 'ES', nameEn: 'Spain', nameFr: 'Espagne', flag: '🇪🇸', dialCode: '+34' },
    { code: 'IT', nameEn: 'Italy', nameFr: 'Italie', flag: '🇮🇹', dialCode: '+39' },
    { code: 'PT', nameEn: 'Portugal', nameFr: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
    { code: 'NL', nameEn: 'Netherlands', nameFr: 'Pays-Bas', flag: '🇳🇱', dialCode: '+31' },
    { code: 'SN', nameEn: 'Senegal', nameFr: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
    { code: 'CI', nameEn: 'Ivory Coast', nameFr: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225' },
    { code: 'CM', nameEn: 'Cameroon', nameFr: 'Cameroun', flag: '🇨🇲', dialCode: '+237' },
    { code: 'CD', nameEn: 'DR Congo', nameFr: 'RD Congo', flag: '🇨🇩', dialCode: '+243' },
    { code: 'MG', nameEn: 'Madagascar', nameFr: 'Madagascar', flag: '🇲🇬', dialCode: '+261' },
    { code: 'BF', nameEn: 'Burkina Faso', nameFr: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226' },
    { code: 'ML', nameEn: 'Mali', nameFr: 'Mali', flag: '🇲🇱', dialCode: '+223' },
    { code: 'NE', nameEn: 'Niger', nameFr: 'Niger', flag: '🇳🇪', dialCode: '+227' },
    { code: 'TD', nameEn: 'Chad', nameFr: 'Tchad', flag: '🇹🇩', dialCode: '+235' },
    { code: 'BJ', nameEn: 'Benin', nameFr: 'Bénin', flag: '🇧🇯', dialCode: '+229' },
    { code: 'TG', nameEn: 'Togo', nameFr: 'Togo', flag: '🇹🇬', dialCode: '+228' },
    { code: 'GN', nameEn: 'Guinea', nameFr: 'Guinée', flag: '🇬🇳', dialCode: '+224' },
    { code: 'GA', nameEn: 'Gabon', nameFr: 'Gabon', flag: '🇬🇦', dialCode: '+241' },
    { code: 'CG', nameEn: 'Congo', nameFr: 'Congo', flag: '🇨🇬', dialCode: '+242' },
    { code: 'CF', nameEn: 'Central African Republic', nameFr: 'RCA', flag: '🇨🇫', dialCode: '+236' },
    { code: 'DZ', nameEn: 'Algeria', nameFr: 'Algérie', flag: '🇩🇿', dialCode: '+213' },
    { code: 'MA', nameEn: 'Morocco', nameFr: 'Maroc', flag: '🇲🇦', dialCode: '+212' },
    { code: 'TN', nameEn: 'Tunisia', nameFr: 'Tunisie', flag: '🇹🇳', dialCode: '+216' },
    { code: 'EG', nameEn: 'Egypt', nameFr: 'Égypte', flag: '🇪🇬', dialCode: '+20' },
    { code: 'NG', nameEn: 'Nigeria', nameFr: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
    { code: 'KE', nameEn: 'Kenya', nameFr: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
    { code: 'ZA', nameEn: 'South Africa', nameFr: 'Afrique du Sud', flag: '🇿🇦', dialCode: '+27' },
    { code: 'GH', nameEn: 'Ghana', nameFr: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
    { code: 'ET', nameEn: 'Ethiopia', nameFr: 'Éthiopie', flag: '🇪🇹', dialCode: '+251' },
    { code: 'AO', nameEn: 'Angola', nameFr: 'Angola', flag: '🇦🇴', dialCode: '+244' },
    { code: 'MZ', nameEn: 'Mozambique', nameFr: 'Mozambique', flag: '🇲🇿', dialCode: '+258' },
    { code: 'UG', nameEn: 'Uganda', nameFr: 'Ouganda', flag: '🇺🇬', dialCode: '+256' },
    { code: 'TZ', nameEn: 'Tanzania', nameFr: 'Tanzanie', flag: '🇹🇿', dialCode: '+255' },
    { code: 'ZW', nameEn: 'Zimbabwe', nameFr: 'Zimbabwe', flag: '🇿🇼', dialCode: '+263' },
    { code: 'ZM', nameEn: 'Zambia', nameFr: 'Zambie', flag: '🇿🇲', dialCode: '+260' },
    { code: 'MW', nameEn: 'Malawi', nameFr: 'Malawi', flag: '🇲🇼', dialCode: '+265' },
    { code: 'RW', nameEn: 'Rwanda', nameFr: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
    { code: 'BI', nameEn: 'Burundi', nameFr: 'Burundi', flag: '🇧🇮', dialCode: '+257' },
    { code: 'SO', nameEn: 'Somalia', nameFr: 'Somalie', flag: '🇸🇴', dialCode: '+252' },
    { code: 'ER', nameEn: 'Eritrea', nameFr: 'Érythrée', flag: '🇪🇷', dialCode: '+291' },
    { code: 'DJ', nameEn: 'Djibouti', nameFr: 'Djibouti', flag: '🇩🇯', dialCode: '+253' },
    { code: 'SD', nameEn: 'Sudan', nameFr: 'Soudan', flag: '🇸🇩', dialCode: '+249' },
    { code: 'SS', nameEn: 'South Sudan', nameFr: 'Soudan du Sud', flag: '🇸🇸', dialCode: '+211' },
    { code: 'LY', nameEn: 'Libya', nameFr: 'Libye', flag: '🇱🇾', dialCode: '+218' },
    { code: 'MR', nameEn: 'Mauritania', nameFr: 'Mauritanie', flag: '🇲🇷', dialCode: '+222' },
    { code: 'GM', nameEn: 'Gambia', nameFr: 'Gambie', flag: '🇬🇲', dialCode: '+220' },
    { code: 'GW', nameEn: 'Guinea-Bissau', nameFr: 'Guinée-Bissau', flag: '🇬🇼', dialCode: '+245' },
    { code: 'SL', nameEn: 'Sierra Leone', nameFr: 'Sierra Leone', flag: '🇸🇱', dialCode: '+232' },
    { code: 'LR', nameEn: 'Liberia', nameFr: 'Liberia', flag: '🇱🇷', dialCode: '+231' },
    { code: 'CV', nameEn: 'Cape Verde', nameFr: 'Cap-Vert', flag: '🇨🇻', dialCode: '+238' },
    { code: 'ST', nameEn: 'São Tomé and Príncipe', nameFr: 'São Tomé-et-Príncipe', flag: '🇸🇹', dialCode: '+239' },
    { code: 'GQ', nameEn: 'Equatorial Guinea', nameFr: 'Guinée équatoriale', flag: '🇬🇶', dialCode: '+240' },
    { code: 'KM', nameEn: 'Comoros', nameFr: 'Comores', flag: '🇰🇲', dialCode: '+269' },
    { code: 'MU', nameEn: 'Mauritius', nameFr: 'Maurice', flag: '🇲🇺', dialCode: '+230' },
    { code: 'SC', nameEn: 'Seychelles', nameFr: 'Seychelles', flag: '🇸🇨', dialCode: '+248' },
    { code: 'RE', nameEn: 'Réunion', nameFr: 'La Réunion', flag: '🇷🇪', dialCode: '+262' },
    { code: 'YT', nameEn: 'Mayotte', nameFr: 'Mayotte', flag: '🇾🇹', dialCode: '+262' },
    { code: 'GP', nameEn: 'Guadeloupe', nameFr: 'Guadeloupe', flag: '🇬🇵', dialCode: '+590' },
    { code: 'MQ', nameEn: 'Martinique', nameFr: 'Martinique', flag: '🇲🇶', dialCode: '+596' },
    { code: 'GF', nameEn: 'French Guiana', nameFr: 'Guyane française', flag: '🇬🇫', dialCode: '+594' },
    { code: 'PF', nameEn: 'French Polynesia', nameFr: 'Polynésie française', flag: '🇵🇫', dialCode: '+689' },
    { code: 'NC', nameEn: 'New Caledonia', nameFr: 'Nouvelle-Calédonie', flag: '🇳🇨', dialCode: '+687' },
    { code: 'PM', nameEn: 'Saint Pierre and Miquelon', nameFr: 'Saint-Pierre-et-Miquelon', flag: '🇵🇲', dialCode: '+508' },
    { code: 'BL', nameEn: 'Saint Barthélemy', nameFr: 'Saint-Barthélemy', flag: '🇧🇱', dialCode: '+590' },
    { code: 'MF', nameEn: 'Saint Martin', nameFr: 'Saint-Martin', flag: '🇲🇫', dialCode: '+590' },
    { code: 'WF', nameEn: 'Wallis and Futuna', nameFr: 'Wallis-et-Futuna', flag: '🇼🇫', dialCode: '+681' },
].sort((a, b) => a.nameFr.localeCompare(b.nameFr));

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ userProfile, onComplete }) => {
    const { t, language } = useAppContext();

    const [selectedCountry, setSelectedCountry] = useState<string>(userProfile.country || '');
    const [phoneNumber, setPhoneNumber] = useState<string>(userProfile.phoneNumber || '');
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isWhySectionCollapsed, setIsWhySectionCollapsed] = useState(true);

    const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry);

    const getCountryName = useCallback((country: Country) => {
        return language === 'fr' ? country.nameFr : country.nameEn;
    }, [language]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onComplete(userProfile);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onComplete, userProfile]);

    const handleSave = async () => {
        if (!selectedCountry) {
            setError(t('fillAllFields'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const countryData = COUNTRIES.find(c => c.code === selectedCountry);
            let fullPhoneNumber: string | undefined;

            if (phoneNumber.trim()) {
                const digits = phoneNumber.replace(/\D/g, '');
                fullPhoneNumber = `${countryData?.dialCode || ''} ${digits}`;
            }

            const updatedProfile = await userService.updateUserProfile(userProfile.uid, {
                country: selectedCountry,
                ...(fullPhoneNumber && { phoneNumber: fullPhoneNumber })
            });

            onComplete(updatedProfile);
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(t('errorOccurred'));
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-completion-title"
        >
            <div className="bg-white dark:bg-black rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 border-amber-500/20 transform transition-all duration-300 scale-100">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 id="profile-completion-title" className="text-2xl font-bold text-white mb-1">
                                {t('editProfile')}
                            </h2>
                            <p className="text-amber-100 text-sm">
                                {t('profileScreenTitle')}
                            </p>
                        </div>
                        <button
                            onClick={() => onComplete(userProfile)}
                            className="text-white/70 hover:text-white transition-colors"
                            aria-label={t('close') || 'Close'}
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 space-y-6 overflow-y-auto min-h-0">
                    {/* Why section */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setIsWhySectionCollapsed(!isWhySectionCollapsed)}
                            className="w-full flex items-start gap-4 text-left"
                        >
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {language === 'fr' ? 'Pourquoi compléter votre profil ?' : 'Why complete your profile?'}
                                    </h3>
                                    <svg
                                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isWhySectionCollapsed ? '' : 'rotate-180'}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {!isWhySectionCollapsed && (
                                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                        {language === 'fr' ? (
                                            <>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                                    <span><strong>Expérience personnalisée</strong> : contenu adapté à votre région</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                                    <span><strong>Notifications ciblées</strong> : alertes pertinentes pour votre région</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                                    <span><strong>Support amélioré</strong> : nous pouvons mieux vous assister</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                                    <span><strong>Confidentialité garantie</strong> : vos données sont sécurisées</span>
                                                </li>
                                            </>
                                        ) : (
                                            <>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                                    <span><strong>Personalized experience</strong> : content tailored to your region</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                                    <span><strong>Targeted notifications</strong> : relevant alerts for your area</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                                    <span><strong>Better support</strong> : easier to assist you when needed</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                                    <span><strong>Privacy guaranteed</strong> : your data is secure</span>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Country */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            <span className="flex items-center gap-2">
                                <span className="text-xl">🌍</span>
                                {language === 'fr' ? 'Pays actuel' : 'Current country'} <span className="text-red-500">*</span>
                            </span>
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            >
                                {selectedCountryData ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{selectedCountryData.flag}</span>
                                        <span className="text-gray-900 dark:text-white">{getCountryName(selectedCountryData)}</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {language === 'fr' ? 'Sélectionner un pays' : 'Select a country'}
                                    </span>
                                )}
                            </button>

                            {isCountryDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsCountryDropdownOpen(false);
                                        }}
                                    />
                                    <div className="absolute z-20 w-full mt-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {COUNTRIES.map((country) => (
                                            <button
                                                key={country.code}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCountry(country.code);
                                                    setIsCountryDropdownOpen(false);
                                                }}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                            >
                                                <span className="text-xl">{country.flag}</span>
                                                <span className="text-gray-900 dark:text-white">{getCountryName(country)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            <span className="flex items-center gap-2">
                                <span className="text-xl">📱</span>
                                {language === 'fr' ? 'Numéro de téléphone' : 'Phone number'}
                                <span className="text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                    {language === 'fr' ? 'Recommandé' : 'Recommended'}
                                </span>
                            </span>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {language === 'fr'
                                ? 'Facultatif mais recommandé pour une meilleure expérience'
                                : 'Optional but recommended for a better experience'}
                        </p>
                        <div className="flex gap-2">
                            {selectedCountryData && (
                                <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                                        {selectedCountryData.dialCode}
                                    </span>
                                </div>
                            )}
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder={
                                    selectedCountryData
                                        ? (language === 'fr' ? '6 12 34 56 78 (optionnel)' : '6 12 34 56 78 (optional)')
                                        : (language === 'fr' ? 'Numéro de téléphone (optionnel)' : 'Phone number (optional)')
                                }
                                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            {language === 'fr'
                                ? 'Vos informations sont sécurisées et confidentielles'
                                : 'Your information is secure and confidential'}
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading || !selectedCountry}
                            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {language === 'fr' ? 'Enregistrement...' : 'Saving...'}
                                </>
                            ) : (
                                <>
                                    {language === 'fr' ? 'Enregistrer et continuer' : 'Save and continue'}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProfileCompletionModal;
