import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reportService } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon } from '../components/icons';

const reportTypes: { value: 'bug' | 'suggestion' | 'question'; labelKey: string; descKey: string }[] = [
    { value: 'bug', labelKey: 'reportBug', descKey: 'reportBugDesc' },
    { value: 'suggestion', labelKey: 'suggestion', descKey: 'suggestionDesc' },
    { value: 'question', labelKey: 'question', descKey: 'questionDesc' },
];

const HelpScreen: React.FC = () => {
    const navigate = useNavigate();
    const { t, user, userProfile } = useAppContext();
    const [type, setType] = useState<'bug' | 'suggestion' | 'question'>('bug');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            toast.error(t('fillAllFields'));
            return;
        }
        if (!user || !userProfile) {
            toast.error(t('pleaseLogin'));
            return;
        }

        setLoading(true);
        try {
            await reportService.createReport({
                userId: user.uid,
                userEmail: user.email || '',
                displayName: userProfile.display_name || 'User',
                type,
                message: message.trim(),
            });
            toast.success(t('reportSubmitted'));
            setMessage('');
            setType('bug');
            navigate('/profile');
        } catch (error) {
            console.error('Error submitting report:', error);
            toast.error(t('errorOccurred'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>{t('back')}</span>
                </button>

                <h1 className="text-2xl font-serif font-bold mb-2">{t('help')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">{t('contactUs')}</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-3">{t('reportType')}</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {reportTypes.map((rt) => (
                                <button
                                    key={rt.value}
                                    type="button"
                                    onClick={() => setType(rt.value)}
                                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                                        type === rt.value
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <div className="font-medium text-sm">{t(rt.labelKey)}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t(rt.descKey)}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium mb-2">
                            {t('reportMessage')}
                        </label>
                        <textarea
                            id="message"
                            rows={6}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t('reportPlaceholder')}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !message.trim()}
                        className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-lg transition-colors"
                    >
                        {loading ? t('processing') : t('submitReport')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default HelpScreen;