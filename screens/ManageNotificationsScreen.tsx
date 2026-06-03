import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon, TrashIcon, EyeIcon } from '../components/icons';
import { toast } from 'react-toastify';
import { Timestamp } from 'firebase/firestore';

const ManageNotificationsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile } = useAppContext();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
    const [link, setLink] = useState('');
    const [category, setCategory] = useState<'all' | 'admin' | 'non-admin'>('all');
    const [sending, setSending] = useState(false);
    const [sentNotifications, setSentNotifications] = useState<Array<{
        title: string;
        message: string;
        type: string;
        link?: string;
        totalCount: number;
        readCount: number;
        unreadCount: number;
        createdAt: Date | Timestamp;
        notificationIds: string[];
    }>>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(true);
    const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');

    // Vérifier si l'utilisateur est admin
    const isAdmin = userProfile?.isAdmin ?? (userProfile as any)?.['isAdmin '];

    // Charger les notifications envoyées
    useEffect(() => {
        if (!isAdmin) return;
        
        const loadSentNotifications = async () => {
            setLoadingNotifications(true);
            try {
                const notifications = await notificationService.getAllNotificationsGrouped();
                setSentNotifications(notifications);
            } catch (error) {
                console.error('Error loading sent notifications:', error);
                toast.error('Erreur lors du chargement des notifications');
            } finally {
                setLoadingNotifications(false);
            }
        };

        loadSentNotifications();
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Accès refusé. Administrateur requis.</p>
                    <button
                        onClick={() => navigate('/home')}
                        className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg"
                    >
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error('Veuillez remplir le titre et le message');
            return;
        }

        setSending(true);
        try {
            let result;
            if (category === 'all') {
                result = await notificationService.createNotificationForAllUsers(
                    title.trim(),
                    message.trim(),
                    type,
                    link.trim() || undefined
                );
            } else {
                result = await notificationService.createNotificationForCategory(
                    category,
                    title.trim(),
                    message.trim(),
                    type,
                    link.trim() || undefined
                );
            }
            
            const categoryLabel = {
                'all': 'tous les utilisateurs',
                'admin': 'administrateurs',
                'non-admin': 'utilisateurs non admin'
            }[category];
            
            toast.success(
                `Notification envoyée à ${result.success} ${categoryLabel}${result.errors > 0 ? ` (${result.errors} erreurs)` : ''}`,
                { autoClose: 5000 }
            );
            
            // Réinitialiser le formulaire
            setTitle('');
            setMessage('');
            setLink('');
            setType('info');
            setCategory('all');
            
            // Recharger la liste des notifications envoyées
            const notifications = await notificationService.getAllNotificationsGrouped();
            setSentNotifications(notifications);
        } catch (error) {
            console.error('Error sending notification:', error);
            toast.error('Erreur lors de l\'envoi de la notification');
        } finally {
            setSending(false);
        }
    };

    const handleDeleteUnread = async (notification: typeof sentNotifications[0]) => {
        if (!confirm(`Supprimer cette notification pour ${notification.unreadCount} utilisateur(s) qui ne l'ont pas encore lue ?`)) {
            return;
        }

        try {
            const result = await notificationService.deleteUnreadNotifications(
                notification.title,
                notification.message,
                notification.type,
                notification.link
            );
            toast.success(`${result.deleted} notification(s) supprimée(s) pour les utilisateurs non lus`);
            
            // Recharger la liste
            const notifications = await notificationService.getAllNotificationsGrouped();
            setSentNotifications(notifications);
        } catch (error) {
            console.error('Error deleting unread notifications:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleDeleteAll = async (notification: typeof sentNotifications[0]) => {
        if (!confirm(`Supprimer cette notification pour TOUS les ${notification.totalCount} utilisateur(s) (lues et non lues) ?`)) {
            return;
        }

        try {
            const result = await notificationService.deleteAllNotifications(
                notification.title,
                notification.message,
                notification.type,
                notification.link
            );
            toast.success(`${result.deleted} notification(s) supprimée(s) pour tous les utilisateurs`);
            
            // Recharger la liste
            const notifications = await notificationService.getAllNotificationsGrouped();
            setSentNotifications(notifications);
        } catch (error) {
            console.error('Error deleting all notifications:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    const formatDate = (date: Date | Timestamp): string => {
        let dateObj: Date;
        if (date instanceof Timestamp) {
            dateObj = date.toDate();
        } else {
            dateObj = date;
        }

        return dateObj.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'success': return 'bg-green-100 dark:bg-green-900/30 border-green-500';
            case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500';
            case 'error': return 'bg-red-100 dark:bg-red-900/30 border-red-500';
            default: return 'bg-blue-100 dark:bg-blue-900/30 border-blue-500';
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-black">
                <div className="flex items-center gap-4 px-4 py-4">
                    <button
                        onClick={() => navigate('/profile')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-black rounded-full transition-colors"
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-gray-900 dark:text-white" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Gérer les notifications
                    </h1>
                </div>
                {/* Onglets */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        onClick={() => setActiveTab('send')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === 'send'
                                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Envoyer
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === 'history'
                                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Historique ({sentNotifications.length})
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
                {activeTab === 'send' ? (
                <div className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Titre *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Nouvelle vidéo disponible"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Message *
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ex: Un nouvel épisode de votre production préférée est disponible !"
                            rows={5}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Catégorie d'utilisateurs
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as 'all' | 'admin' | 'non-admin')}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="all">Tous les utilisateurs</option>
                            <option value="admin">Administrateurs uniquement</option>
                            <option value="non-admin">Utilisateurs non admin uniquement</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Sélectionnez à qui envoyer cette notification
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as 'info' | 'success' | 'warning' | 'error')}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="info">Information (Bleu)</option>
                            <option value="success">Succès (Vert)</option>
                            <option value="warning">Avertissement (Jaune)</option>
                            <option value="error">Erreur (Rouge)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Lien (optionnel)
                        </label>
                        <input
                            type="text"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="Ex: /serie/abc123 ou /documentary/xyz789"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Lien vers une page de l'application (ex: /serie/abc123)
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSend}
                            disabled={sending || !title.trim() || !message.trim()}
                            className="flex-1 px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? 'Envoi en cours...' : 'Envoyer à tous les utilisateurs'}
                        </button>
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Annuler
                        </button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>💡 Astuce :</strong> Cette notification sera envoyée à la catégorie sélectionnée. 
                            Les utilisateurs la verront dans leur page de notifications et recevront un badge sur l'icône cloche.
                        </p>
                    </div>
                </div>
                ) : (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            Notifications envoyées
                        </h2>
                        {loadingNotifications ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                            </div>
                        ) : sentNotifications.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-10">
                                Aucune notification envoyée
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {sentNotifications.map((notification, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg border-2 ${getTypeColor(notification.type)}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-bold text-gray-900 dark:text-white">
                                                        {notification.title}
                                                    </h3>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                                        notification.type === 'success' ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' :
                                                        notification.type === 'warning' ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200' :
                                                        notification.type === 'error' ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200' :
                                                        'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                                                    }`}>
                                                        {notification.type}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    <span>📅 {formatDate(notification.createdAt)}</span>
                                                    {notification.link && (
                                                        <span>🔗 {notification.link}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        📊 Total: <strong>{notification.totalCount}</strong> utilisateur(s)
                                                    </span>
                                                    <span className="text-green-600 dark:text-green-400">
                                                        ✅ Lu: <strong>{notification.readCount}</strong>
                                                    </span>
                                                    <span className="text-red-600 dark:text-red-400">
                                                        🔴 Non lu: <strong>{notification.unreadCount}</strong>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                {notification.unreadCount > 0 && (
                                                    <button
                                                        onClick={() => handleDeleteUnread(notification)}
                                                        className="p-2 hover:bg-white/50 dark:hover:bg-black/50 rounded-lg transition-colors"
                                                        title={`Supprimer pour ${notification.unreadCount} utilisateur(s) non lu(s)`}
                                                    >
                                                        <TrashIcon className="w-5 h-5 text-orange-500" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteAll(notification)}
                                                    className="p-2 hover:bg-white/50 dark:hover:bg-black/50 rounded-lg transition-colors"
                                                    title="Supprimer pour tous les utilisateurs"
                                                >
                                                    <TrashIcon className="w-5 h-5 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default ManageNotificationsScreen;

