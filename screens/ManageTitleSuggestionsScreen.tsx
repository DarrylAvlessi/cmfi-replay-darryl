import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { titleSuggestionService, TitleSuggestion } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon, CheckIcon, XMarkIcon } from '../components/icons';
import { toast } from 'react-toastify';

const suggestionStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const ManageTitleSuggestionsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile } = useAppContext();
    const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [adminNote, setAdminNote] = useState('');

    const isAdmin = userProfile?.isAdmin ?? (userProfile as any)?.['isAdmin '];

    useEffect(() => {
        if (!isAdmin) return;

        const load = async () => {
            setLoading(true);
            try {
                const all = await titleSuggestionService.getAllSuggestions();
                setSuggestions(all);
            } catch (error) {
                console.error('Error loading suggestions:', error);
                toast.error('Erreur lors du chargement des suggestions');
            } finally {
                setLoading(false);
            }
        };

        load();
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

    const handleExpand = (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            setAdminNote('');
        } else {
            setExpandedId(id);
            const s = suggestions.find(x => x.uid === id);
            setAdminNote(s?.adminNote || '');
        }
    };

    const handleApply = async (id: string) => {
        try {
            await titleSuggestionService.applySuggestion(id, userProfile?.uid || '');
            toast.success('Titre mis à jour avec succès');
            setExpandedId(null);
            setAdminNote('');
            const all = await titleSuggestionService.getAllSuggestions();
            setSuggestions(all);
        } catch (error) {
            console.error('Error applying suggestion:', error);
            toast.error('Erreur lors de l\'application de la suggestion');
        }
    };

    const handleReject = async (id: string) => {
        try {
            await titleSuggestionService.rejectSuggestion(id, userProfile?.uid || '', adminNote);
            toast.success('Suggestion rejetée');
            setExpandedId(null);
            setAdminNote('');
            const all = await titleSuggestionService.getAllSuggestions();
            setSuggestions(all);
        } catch (error) {
            console.error('Error rejecting suggestion:', error);
            toast.error('Erreur lors du rejet de la suggestion');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Retour</span>
                </button>

                <h1 className="text-2xl font-serif font-bold mb-6">Gérer les suggestions de titre</h1>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Chargement...</div>
                ) : suggestions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Aucune suggestion</div>
                ) : (
                    <div className="space-y-4">
                        {suggestions.map((s) => (
                            <div
                                key={s.uid}
                                className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                <button
                                    onClick={() => handleExpand(s.uid || '')}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium">{s.displayName}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${suggestionStatusColors[s.status] || ''}`}>
                                                    {s.status}
                                                </span>
                                                <span className="text-xs text-gray-400">{s.mediaType}</span>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                                <span className="line-through">{s.currentTitle}</span>
                                                {' → '}
                                                <span className="text-amber-600 dark:text-amber-400 font-medium">{s.suggestedTitle}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400 flex-shrink-0 ml-4">
                                        {s.createdAt?.toDate?.()?.toLocaleDateString() || ''}
                                    </div>
                                </button>

                                {expandedId === s.uid && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-1">Titre actuel</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 line-through">{s.currentTitle}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-1">Titre suggéré</p>
                                                <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">{s.suggestedTitle}</p>
                                            </div>
                                        </div>

                                        {s.reason && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-1">Raison :</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                                    {s.reason}
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">Contact :</p>
                                            <p className="text-sm text-gray-500">{s.userEmail}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">Média :</p>
                                            <p className="text-sm text-gray-500">ID: {s.mediaId} ({s.mediaType})</p>
                                        </div>

                                        {s.status === 'pending' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Note (optionnelle)</label>
                                                    <textarea
                                                        rows={2}
                                                        value={adminNote}
                                                        onChange={(e) => setAdminNote(e.target.value)}
                                                        placeholder="Ajouter une note..."
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleApply(s.uid || '')}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                                                    >
                                                        <CheckIcon className="w-4 h-4" />
                                                        Appliquer
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(s.uid || '')}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                        Rejeter
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {s.adminNote && s.status !== 'pending' && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-1">Note de l'admin :</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                                    {s.adminNote}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageTitleSuggestionsScreen;
