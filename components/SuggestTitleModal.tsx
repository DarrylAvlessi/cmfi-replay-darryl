import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { titleSuggestionService } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon } from './icons';

interface SuggestTitleModalProps {
    isOpen: boolean;
    onClose: () => void;
    mediaId: string;
    mediaType: 'movie' | 'serie' | 'episode';
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
            <div className="broadcast-panel rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{t('suggestTitle')}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-mono-meta uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            {t('currentTitle')}
                        </label>
                        <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            {currentTitle}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="suggestedTitle" className="block text-xs font-mono-meta uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            {t('suggestedTitle')}
                        </label>
                        <input
                            id="suggestedTitle"
                            type="text"
                            value={suggestedTitle}
                            onChange={(e) => setSuggestedTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            placeholder={t('suggestTitlePlaceholder')}
                        />
                    </div>

                    <div>
                        <label htmlFor="reason" className="block text-xs font-mono-meta uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            {t('reason')}
                        </label>
                        <textarea
                            id="reason"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                            placeholder={t('reasonPlaceholder')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !suggestedTitle.trim() || suggestedTitle.trim() === currentTitle}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-blue-600/20"
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
