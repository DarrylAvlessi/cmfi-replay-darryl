import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { userService, UserProfile } from '../lib/firestore';

interface ProfileCompletionModalProps {
    userProfile: UserProfile;
    onComplete: (updatedProfile: UserProfile) => void;
}

// Liste des pays avec leurs codes et indicateurs téléphoniques
const COUNTRIES = [
    { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
    { code: 'BE', name: 'Belgique', flag: '🇧🇪', dialCode: '+32' },
    { code: 'CH', name: 'Suisse', flag: '🇨🇭', dialCode: '+41' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
    { code: 'US', name: 'États-Unis', flag: '🇺🇸', dialCode: '+1' },
    { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44' },
    { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dialCode: '+49' },
    { code: 'ES', name: 'Espagne', flag: '🇪🇸', dialCode: '+34' },
    { code: 'IT', name: 'Italie', flag: '🇮🇹', dialCode: '+39' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
    { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', dialCode: '+31' },
    { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
    { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', dialCode: '+225' },
    { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237' },
    { code: 'CD', name: 'RD Congo', flag: '🇨🇩', dialCode: '+243' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dialCode: '+261' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227' },
    { code: 'TD', name: 'Tchad', flag: '🇹🇩', dialCode: '+235' },
    { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dialCode: '+229' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228' },
    { code: 'GN', name: 'Guinée', flag: '🇬🇳', dialCode: '+224' },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241' },
    { code: 'CG', name: 'Congo', flag: '🇨🇬', dialCode: '+242' },
    { code: 'CF', name: 'RCA', flag: '🇨🇫', dialCode: '+236' },
    { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dialCode: '+213' },
    { code: 'MA', name: 'Maroc', flag: '🇲🇦', dialCode: '+212' },
    { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dialCode: '+216' },
    { code: 'EG', name: 'Égypte', flag: '🇪🇬', dialCode: '+20' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
    { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', dialCode: '+27' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
    { code: 'ET', name: 'Éthiopie', flag: '🇪🇹', dialCode: '+251' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴', dialCode: '+244' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', dialCode: '+258' },
    { code: 'UG', name: 'Ouganda', flag: '🇺🇬', dialCode: '+256' },
    { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', dialCode: '+255' },
    { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dialCode: '+263' },
    { code: 'ZM', name: 'Zambie', flag: '🇿🇲', dialCode: '+260' },
    { code: 'MW', name: 'Malawi', flag: '🇲🇼', dialCode: '+265' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
    { code: 'BI', name: 'Burundi', flag: '🇧🇮', dialCode: '+257' },
    { code: 'SO', name: 'Somalie', flag: '🇸🇴', dialCode: '+252' },
    { code: 'ER', name: 'Érythrée', flag: '🇪🇷', dialCode: '+291' },
    { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', dialCode: '+253' },
    { code: 'SD', name: 'Soudan', flag: '🇸🇩', dialCode: '+249' },
    { code: 'SS', name: 'Soudan du Sud', flag: '🇸🇸', dialCode: '+211' },
    { code: 'LY', name: 'Libye', flag: '🇱🇾', dialCode: '+218' },
    { code: 'MR', name: 'Mauritanie', flag: '🇲🇷', dialCode: '+222' },
    { code: 'GM', name: 'Gambie', flag: '🇬🇲', dialCode: '+220' },
    { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', dialCode: '+245' },
    { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', dialCode: '+232' },
    { code: 'LR', name: 'Liberia', flag: '🇱🇷', dialCode: '+231' },
    { code: 'CV', name: 'Cap-Vert', flag: '🇨🇻', dialCode: '+238' },
    { code: 'ST', name: 'São Tomé-et-Príncipe', flag: '🇸🇹', dialCode: '+239' },
    { code: 'GQ', name: 'Guinée équatoriale', flag: '🇬🇶', dialCode: '+240' },
    { code: 'KM', name: 'Comores', flag: '🇰🇲', dialCode: '+269' },
    { code: 'MU', name: 'Maurice', flag: '🇲🇺', dialCode: '+230' },
    { code: 'SC', name: 'Seychelles', flag: '🇸🇨', dialCode: '+248' },
    { code: 'RE', name: 'La Réunion', flag: '🇷🇪', dialCode: '+262' },
    { code: 'YT', name: 'Mayotte', flag: '🇾🇹', dialCode: '+262' },
    { code: 'GP', name: 'Guadeloupe', flag: '🇬🇵', dialCode: '+590' },
    { code: 'MQ', name: 'Martinique', flag: '🇲🇶', dialCode: '+596' },
    { code: 'GF', name: 'Guyane française', flag: '🇬🇫', dialCode: '+594' },
    { code: 'PF', name: 'Polynésie française', flag: '🇵🇫', dialCode: '+689' },
    { code: 'NC', name: 'Nouvelle-Calédonie', flag: '🇳🇨', dialCode: '+687' },
    { code: 'PM', name: 'Saint-Pierre-et-Miquelon', flag: '🇵🇲', dialCode: '+508' },
    { code: 'BL', name: 'Saint-Barthélemy', flag: '🇧🇱', dialCode: '+590' },
    { code: 'MF', name: 'Saint-Martin', flag: '🇲🇫', dialCode: '+590' },
    { code: 'WF', name: 'Wallis-et-Futuna', flag: '🇼🇫', dialCode: '+681' },
].sort((a, b) => a.name.localeCompare(b.name));

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ userProfile, onComplete }) => {
    
    const [selectedCountry, setSelectedCountry] = useState<string>(userProfile.country || '');
    const [phoneNumber, setPhoneNumber] = useState<string>(userProfile.phoneNumber || '');
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isWhySectionCollapsed, setIsWhySectionCollapsed] = useState(true);

    const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry);

    const handleSave = async () => {
        if (!selectedCountry) {
            setError('Veuillez sélectionner votre pays');
            return;
        }

        // Le téléphone est optionnel, mais si renseigné, on valide le format
        if (phoneNumber.trim()) {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            if (!phoneRegex.test(phoneNumber)) {
                setError('Format de numéro de téléphone invalide');
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            const countryData = COUNTRIES.find(c => c.code === selectedCountry);
            let fullPhoneNumber: string | undefined = undefined;
            
            // Si le téléphone est renseigné, on le formate
            if (phoneNumber.trim()) {
                fullPhoneNumber = countryData 
                    ? `${countryData.dialCode} ${phoneNumber.replace(/^\+?\d+/, '').trim() || phoneNumber.trim()}`
                    : phoneNumber.trim();
            }

            const updatedProfile = await userService.updateUserProfile(userProfile.uid, {
                country: selectedCountry,
                ...(fullPhoneNumber && { phoneNumber: fullPhoneNumber })
            });

            onComplete(updatedProfile);
        } catch (error) {
            console.error('Error updating profile:', error);
            setError('Erreur lors de la mise à jour du profil');
        } finally {
            setLoading(false);
        }
    };

    
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-black rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 border-amber-500/20 transform transition-all duration-300 scale-100">
                {/* Header avec gradient et icône */}
                <div className="relative bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-1">
                                Complétez votre profil
                            </h2>
                            <p className="text-amber-100 text-sm">
                                Quelques secondes pour une meilleure expérience
                            </p>
                        </div>
                        <button
                            onClick={() => onComplete(userProfile)}
                            className="text-white/70 hover:text-white transition-colors"
                            title="Fermer"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                
                {/* Content */}
                <div className="flex-1 p-6 space-y-6 overflow-y-auto min-h-0">

                    {/* Message rassurant avec bénéfices */}
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
                                        Pourquoi compléter votre profil ?
                                    </h3>
                                    <svg
                                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isWhySectionCollapsed ? '' : 'rotate-180'}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {!isWhySectionCollapsed && (
                                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                            <span><strong>Expérience personnalisée</strong> : contenu adapté à votre région et préférences</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                            <span><strong>Notifications ciblées</strong> : recevez des alertes pertinentes pour votre région</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                            <span><strong>Support amélioré</strong> : nous pouvons mieux vous assister si besoin</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                                            <span><strong>Confidentialité garantie</strong> : vos données sont sécurisées et utilisées uniquement pour améliorer votre expérience</span>
                                        </li>
                                    </ul>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Pays */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            <span className="flex items-center gap-2">
                                <span className="text-xl">🌍</span>
                                Pays actuel <span className="text-red-500">*</span>
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
                                        <span className="text-gray-900 dark:text-white">{selectedCountryData.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-500 dark:text-gray-400">Sélectionner un pays</span>
                                )}
                            </button>

                            {isCountryDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsCountryDropdownOpen(false)}
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
                                                <span className="text-gray-900 dark:text-white">{country.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Numéro de téléphone */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            <span className="flex items-center gap-2">
                                <span className="text-xl">📱</span>
                                Numéro de téléphone 
                                <span className="text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                    Recommandé
                                </span>
                            </span>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Facultatif mais recommandé pour une meilleure expérience
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
                                placeholder={selectedCountryData ? "6 12 34 56 78 (optionnel)" : "Numéro de téléphone (optionnel)"}
                                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                            />
                        </div>
                        {selectedCountryData && phoneNumber.trim() && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Format: {selectedCountryData.dialCode} X XX XX XX XX
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer avec bouton plus visible */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Vos informations sont sécurisées et confidentielles
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading || !selectedCountry}
                            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    Enregistrer et continuer
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

