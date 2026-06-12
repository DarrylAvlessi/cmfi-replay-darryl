import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adService, Ad, AdSettings } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckIcon, XMarkIcon } from '../components/icons';
import { toast } from 'react-toastify';

const ManageAdsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { t, user, userProfile } = useAppContext();
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editVideoUrl, setEditVideoUrl] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editSkipAfterSeconds, setEditSkipAfterSeconds] = useState(5);
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newSkipAfterSeconds, setNewSkipAfterSeconds] = useState(5);
    const [showNewForm, setShowNewForm] = useState(false);
    const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
    const [settingsEnabled, setSettingsEnabled] = useState(false);
    const [settingsSkipAfterSeconds, setSettingsSkipAfterSeconds] = useState(5);

    // Vérifier si l'utilisateur est admin
    useEffect(() => {
        if (userProfile && !userProfile.isAdmin) {
            toast.error('Accès refusé. Administrateur requis.');
            navigate('/home');
        }
    }, [userProfile, navigate]);

    // Charger les publicités et les paramètres
    useEffect(() => {
        loadAds();
        loadAdSettings();
    }, []);

    const loadAds = async () => {
        setLoading(true);
        try {
            const allAds = await adService.getAllAds();
            setAds(allAds);
        } catch (error) {
            console.error('Error loading ads:', error);
            toast.error('Erreur lors du chargement des publicités');
        } finally {
            setLoading(false);
        }
    };

    const loadAdSettings = async () => {
        try {
            const settings = await adService.getAdSettings();
            console.log('Loaded ad settings:', settings);
            if (settings) {
                setAdSettings(settings);
                setSettingsEnabled(settings.enabled);
                setSettingsSkipAfterSeconds(settings.skipAfterSeconds);
                console.log('Ad settings state updated:', { enabled: settings.enabled, skipAfterSeconds: settings.skipAfterSeconds });
            }
        } catch (error) {
            console.error('Error loading ad settings:', error);
            toast.error('Erreur lors du chargement des paramètres');
        }
    };

    const handleCreateAd = async () => {
        if (!newVideoUrl.trim() || !user?.uid) {
            toast.error('Veuillez entrer une URL de vidéo');
            return;
        }

        try {
            await adService.createAd({
                videoUrl: newVideoUrl.trim(),
                title: newTitle.trim() || undefined,
                skipAfterSeconds: newSkipAfterSeconds || 5,
                isActive: true,
                createdBy: user.uid
            });
            toast.success('Publicité créée avec succès');
            setNewVideoUrl('');
            setNewTitle('');
            setNewSkipAfterSeconds(5);
            setShowNewForm(false);
            loadAds();
        } catch (error) {
            console.error('Error creating ad:', error);
            toast.error('Erreur lors de la création de la publicité');
        }
    };

    const handleUpdateAd = async (adId: string) => {
        if (!editVideoUrl.trim() || !user?.uid) {
            toast.error('Veuillez entrer une URL de vidéo');
            return;
        }

        try {
            await adService.updateAd(adId, {
                videoUrl: editVideoUrl.trim(),
                title: editTitle.trim() || undefined,
                skipAfterSeconds: editSkipAfterSeconds || 5
            });
            toast.success('Publicité mise à jour avec succès');
            setEditingId(null);
            setEditVideoUrl('');
            setEditTitle('');
            setEditSkipAfterSeconds(5);
            loadAds();
        } catch (error) {
            console.error('Error updating ad:', error);
            toast.error('Erreur lors de la mise à jour de la publicité');
        }
    };

    const handleToggleActive = async (adId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        
        // Mise à jour optimiste
        setAds(prevAds => {
            return prevAds.map(ad => {
                if (ad.id === adId) {
                    return { ...ad, isActive: newStatus };
                }
                return ad;
            });
        });

        try {
            await adService.updateAd(adId, { isActive: newStatus });
            toast.success(newStatus ? 'Publicité activée' : 'Publicité désactivée');
            loadAds();
        } catch (error) {
            console.error('Error toggling ad:', error);
            toast.error('Erreur lors de la modification du statut');
            loadAds(); // Recharger en cas d'erreur
        }
    };

    const handleDeleteAd = async (adId: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette publicité ?')) {
            return;
        }

        try {
            await adService.deleteAd(adId);
            toast.success('Publicité supprimée avec succès');
            loadAds();
        } catch (error) {
            console.error('Error deleting ad:', error);
            toast.error('Erreur lors de la suppression de la publicité');
        }
    };

    const handleUpdateSettings = async () => {
        if (!user?.uid) {
            toast.error('Utilisateur non connecté');
            return;
        }

        try {
            console.log('Saving ad settings:', { enabled: settingsEnabled, skipAfterSeconds: settingsSkipAfterSeconds });
            await adService.updateAdSettings({
                enabled: settingsEnabled,
                skipAfterSeconds: settingsSkipAfterSeconds
            }, user.uid);
            console.log('Ad settings saved successfully');
            toast.success('Paramètres mis à jour avec succès');
            await loadAdSettings(); // Attendre le rechargement
        } catch (error) {
            console.error('Error updating ad settings:', error);
            toast.error('Erreur lors de la mise à jour des paramètres');
        }
    };

    // Sauvegarder automatiquement quand on change le toggle
    const handleToggleEnabled = async () => {
        const newValue = !settingsEnabled;
        setSettingsEnabled(newValue);
        
        if (!user?.uid) {
            toast.error('Utilisateur non connecté');
            return;
        }

        try {
            console.log('Auto-saving ad settings (toggle):', { enabled: newValue, skipAfterSeconds: settingsSkipAfterSeconds });
            await adService.updateAdSettings({
                enabled: newValue,
                skipAfterSeconds: settingsSkipAfterSeconds
            }, user.uid);
            console.log('Ad settings auto-saved successfully');
            await loadAdSettings();
        } catch (error) {
            console.error('Error auto-saving ad settings:', error);
            toast.error('Erreur lors de la sauvegarde automatique');
            // Revenir à l'ancienne valeur en cas d'erreur
            setSettingsEnabled(!newValue);
        }
    };

    const startEdit = (ad: Ad) => {
        setEditingId(ad.id);
        setEditVideoUrl(ad.videoUrl);
        setEditTitle(ad.title || '');
        setEditSkipAfterSeconds(ad.skipAfterSeconds || 5);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditVideoUrl('');
        setEditTitle('');
        setEditSkipAfterSeconds(5);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-8">
                        <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/profile')}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-black rounded-full transition-colors"
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-gray-900 dark:text-white" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Gestion des publicités
                    </h1>
                </div>

                {/* Paramètres globaux */}
                <div className="bg-white dark:bg-black rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                        Paramètres globaux
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 dark:text-gray-300">
                                Activer les publicités
                            </label>
                            <button
                                onClick={handleToggleEnabled}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settingsEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        settingsEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Durée minimale avant skip (secondes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="30"
                                value={settingsSkipAfterSeconds}
                                onChange={(e) => setSettingsSkipAfterSeconds(parseInt(e.target.value) || 5)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={handleUpdateSettings}
                            className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                        >
                            Enregistrer les paramètres
                        </button>
                    </div>
                </div>

                {/* Liste des publicités */}
                <div className="bg-white dark:bg-black rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Publicités ({ads.length})
                        </h2>
                        <button
                            onClick={() => setShowNewForm(!showNewForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Ajouter une publicité
                        </button>
                    </div>

                    {/* Formulaire de création */}
                    {showNewForm && (
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    URL de la vidéo *
                                </label>
                                <input
                                    type="url"
                                    value={newVideoUrl}
                                    onChange={(e) => setNewVideoUrl(e.target.value)}
                                    placeholder="https://example.com/ad.mp4"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Titre (optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Titre de la publicité"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Durée avant skip (secondes)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={newSkipAfterSeconds}
                                    onChange={(e) => setNewSkipAfterSeconds(parseInt(e.target.value) || 5)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateAd}
                                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Créer
                                </button>
                                <button
                                    onClick={() => {
                                        setShowNewForm(false);
                                        setNewVideoUrl('');
                                        setNewTitle('');
                                        setNewSkipAfterSeconds(5);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Liste */}
                    <div className="space-y-4">
                        {ads.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                Aucune publicité
                            </div>
                        ) : (
                            ads.map((ad) => (
                                <div
                                    key={ad.id}
                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                                >
                                    {editingId === ad.id ? (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    URL de la vidéo *
                                                </label>
                                                <input
                                                    type="url"
                                                    value={editVideoUrl}
                                                    onChange={(e) => setEditVideoUrl(e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Titre (optionnel)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Durée avant skip (secondes)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="30"
                                                    value={editSkipAfterSeconds}
                                                    onChange={(e) => setEditSkipAfterSeconds(parseInt(e.target.value) || 5)}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdateAd(ad.id)}
                                                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                                                >
                                                    Enregistrer
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        {ad.title || 'Sans titre'}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-1 text-xs rounded-full ${
                                                            ad.isActive
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                : 'bg-gray-100 text-black dark:bg-gray-700 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        {ad.isActive ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400 break-all">
                                                    {ad.videoUrl}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    Skip après {ad.skipAfterSeconds || 5}s
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleToggleActive(ad.id, ad.isActive)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        ad.isActive
                                                            ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-800 dark:text-green-200'
                                                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-gray-300'
                                                    }`}
                                                    title={ad.isActive ? 'Désactiver' : 'Activer'}
                                                >
                                                    {ad.isActive ? (
                                                        <CheckIcon className="w-5 h-5" />
                                                    ) : (
                                                        <XMarkIcon className="w-5 h-5" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => startEdit(ad)}
                                                    className="p-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-lg transition-colors"
                                                    title="Modifier"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAd(ad.id)}
                                                    className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-800 dark:text-red-200 rounded-lg transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageAdsScreen;

