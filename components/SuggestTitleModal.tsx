import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { titleSuggestionService } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon } from './icons';

interface SuggestTitleModalProps {
    isOpen: boolean;
    onClose: () => void;
    mediaId: string;
    mediaType: 'movie' | 'serie';
    currentTitle: string;
}

const SuggestTitleModal: React.FC<SuggestTitleModalProps> = ({ isOpen, onClose, mediaId, mediaType, currentTitle }) => {
    const { t, user, userProfile } = useAppContext();
    const [suggestedTitle, setSuggestedTitle] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!suggestedTitle.trim()) {
            toast.error(t('suggestTitleEmpty'));
            return;
        }
        if (suggestedTitle.trim() === currentTitle) {
            toast.error(t('suggestTitleSame'));
            return;
        }
        if (!user || !userProfile) {
            toast.error(t('suggestTitleLogin'));
            return;
        }

        setLoading(true);
        try {
            const trimmedReason = reason.trim();
            await titleSuggestionService.createSuggestion({
                userId: user.uid,
                userEmail: user.email || '',
                displayName: userProfile.display_name || 'User',
                mediaId,
                mediaType,
                currentTitle,
                suggestedTitle: suggestedTitle.trim(),
                ...(trimmedReason ? { reason: trimmedReason } : {}),
            });
            toast.success(t('suggestTitleSuccess'));
            onClose();
        } catch (error) {
            console.error('Error submitting suggestion:', error);
            toast.error(t('suggestTitleError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-black rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('suggestTitle')}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('currentTitle')}
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded-lg">
                            {currentTitle}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="suggestedTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('suggestedTitle')}
                        </label>
                        <input
                            id="suggestedTitle"
                            type="text"
                            value={suggestedTitle}
                            onChange={(e) => setSuggestedTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder={t('suggestTitlePlaceholder')}
                        />
                    </div>

                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('reason')}
                        </label>
                        <textarea
                            id="reason"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                            placeholder={t('reasonPlaceholder')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !suggestedTitle.trim() || suggestedTitle.trim() === currentTitle}
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-lg transition-colors text-sm"
                        >
                            {loading ? t('sending') : t('sendSuggestion')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SuggestTitleModal;
