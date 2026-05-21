import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { infoBarService, InfoBarMessage } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckIcon, XMarkIcon } from '../components/icons';
import { toast } from 'react-toastify';

const ManageInfoBarScreen: React.FC = () => {
    const navigate = useNavigate();
    const { t, user, userProfile } = useAppContext();
    const [messages, setMessages] = useState<InfoBarMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editMessage, setEditMessage] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [showNewForm, setShowNewForm] = useState(false);

    // Vérifier si l'utilisateur est admin
    useEffect(() => {
        if (userProfile && !userProfile.isAdmin) {
            toast.error('Accès refusé. Administrateur requis.');
            navigate('/home');
        }
    }, [userProfile, navigate]);

    // Charger les messages
    useEffect(() => {
        loadMessages();
    }, []);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const allMessages = await infoBarService.getAllMessages();
            setMessages(allMessages);
        } catch (error) {
            console.error('Error loading messages:', error);
            toast.error('Erreur lors du chargement des messages');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMessage = async () => {
        if (!newMessage.trim() || !user?.uid) {
            toast.error('Veuillez entrer un message');
            return;
        }

        try {
            await infoBarService.createMessage(newMessage.trim(), user.uid);
            toast.success('Message créé avec succès');
            setNewMessage('');
            setShowNewForm(false);
            loadMessages();
        } catch (error) {
            console.error('Error creating message:', error);
            toast.error('Erreur lors de la création du message');
        }
    };

    const handleUpdateMessage = async (messageId: string) => {
        if (!editMessage.trim() || !user?.uid) {
            toast.error('Veuillez entrer un message');
            return;
        }

        try {
            await infoBarService.updateMessage(messageId, editMessage.trim(), user.uid);
            toast.success('Message mis à jour avec succès');
            setEditingId(null);
            setEditMessage('');
            loadMessages();
        } catch (error) {
            console.error('Error updating message:', error);
            toast.error('Erreur lors de la mise à jour du message');
        }
    };

    const handleToggleActive = async (messageId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        
        // Mise à jour optimiste de l'état local
        setMessages(prevMessages => {
            return prevMessages.map(msg => {
                if (msg.id === messageId) {
                    return { ...msg, isActive: newStatus, updatedAt: new Date() };
                }
                return msg;
            });
        });

        try {
            await infoBarService.setMessageActive(messageId, newStatus);
            toast.success(newStatus ? 'Message activé' : 'Message désactivé');
            // Recharger pour s'assurer que tout est synchronisé
            loadMessages();
        } catch (error) {
            console.error('Error toggling message:', error);
            toast.error('Erreur lors de la modification du statut');
            // En cas d'erreur, recharger pour restaurer l'état correct
            loadMessages();
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
            return;
        }

        try {
            await infoBarService.deleteMessage(messageId);
            toast.success('Message supprimé avec succès');
            loadMessages();
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Erreur lors de la suppression du message');
        }
    };

    const startEditing = (message: InfoBarMessage) => {
        setEditingId(message.id);
        setEditMessage(message.message);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditMessage('');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black animate-fadeIn pb-8">
            <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                            Gérer les messages d'information
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowNewForm(!showNewForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Nouveau message</span>
                    </button>
                </div>

                {/* Formulaire de création */}
                {showNewForm && (
                    <div className="mb-6 p-4 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            Créer un nouveau message
                        </h2>
                        <div className="space-y-3">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Entrez le message d'information..."
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                rows={3}
                            />
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCreateMessage}
                                    className="px-6 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
                                >
                                    Créer
                                </button>
                                <button
                                    onClick={() => {
                                        setShowNewForm(false);
                                        setNewMessage('');
                                    }}
                                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Liste des messages */}
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>Aucun message d'information pour le moment.</p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`p-4 rounded-lg border ${
                                    message.isActive
                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                        : 'bg-white dark:bg-black border-gray-200 dark:border-gray-700'
                                }`}
                            >
                                {editingId === message.id ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={editMessage}
                                            onChange={(e) => setEditMessage(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                            rows={3}
                                        />
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleUpdateMessage(message.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
                                            >
                                                <CheckIcon className="w-5 h-5" />
                                                <span>Enregistrer</span>
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                                <span>Annuler</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {message.message}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                    <span>
                                                        {message.isActive ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 text-gray-900 text-xs font-semibold">
                                                                <CheckIcon className="w-3 h-3" />
                                                                Actif
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold">
                                                                <XMarkIcon className="w-3 h-3" />
                                                                Inactif
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span>
                                                        Mis à jour: {new Date(message.updatedAt).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <button
                                                onClick={() => handleToggleActive(message.id, message.isActive)}
                                                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                                    message.isActive
                                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                        : 'bg-amber-500 text-gray-900 hover:bg-amber-400'
                                                }`}
                                            >
                                                {message.isActive ? 'Désactiver' : 'Activer'}
                                            </button>
                                            <button
                                                onClick={() => startEditing(message)}
                                                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors"
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMessage(message.id)}
                                                className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-400 transition-colors"
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
    );
};

export default ManageInfoBarScreen;

