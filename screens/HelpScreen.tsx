import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reportService, Report, titleSuggestionService, TitleSuggestion } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon } from '../components/icons';

const reportTypes: { value: 'bug' | 'suggestion' | 'question'; labelKey: string; descKey: string }[] = [
    { value: 'bug', labelKey: 'reportBug', descKey: 'reportBugDesc' },
    { value: 'suggestion', labelKey: 'suggestion', descKey: 'suggestionDesc' },
    { value: 'question', labelKey: 'question', descKey: 'questionDesc' },
];

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    read: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const HelpScreen: React.FC = () => {
    const navigate = useNavigate();
    const { t, user, userProfile } = useAppContext();
    const [type, setType] = useState<'bug' | 'suggestion' | 'question'>('bug');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState<Report[]>([]);
    const [activeTab, setActiveTab] = useState<'submit' | 'myReports' | 'mySuggestions'>('submit');
    const [loadingReports, setLoadingReports] = useState(true);
    const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoadingReports(false);
            return;
        }

        setLoadingReports(true);
        const unsubscribe = reportService.subscribeToUserReports(user.uid, (data) => {
            setReports(data);
            setLoadingReports(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) {
            setLoadingSuggestions(false);
            return;
        }

        setLoadingSuggestions(true);
        const unsubscribe = titleSuggestionService.subscribeToUserSuggestions(user.uid, (data) => {
            setSuggestions(data);
            setLoadingSuggestions(false);
        });

        return () => unsubscribe();
    }, [user]);

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

                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button
                        onClick={() => setActiveTab('submit')}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                            activeTab === 'submit'
                                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {t('submitReport')}
                    </button>
                    <button
                        onClick={() => setActiveTab('myReports')}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                            activeTab === 'myReports'
                                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {t('myReports')} ({reports.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('mySuggestions')}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                            activeTab === 'mySuggestions'
                                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Suggestions de titres ({suggestions.length})
                    </button>
                </div>

                {activeTab === 'submit' && (
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
                )}

                {activeTab === 'myReports' && (
                    <div>
                        {loadingReports ? (
                            <div className="text-center py-8 text-gray-500">{t('loading')}</div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">{t('noReports')}</div>
                        ) : (
                            <div className="space-y-3">
                                {reports.map((report) => (
                                    <div
                                        key={report.uid}
                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-black"
                                    >
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                {report.type}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[report.status] || ''}`}>
                                                {t('reportStatus')}: {report.status}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-auto">
                                                {report.createdAt?.toDate?.()?.toLocaleDateString() || ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {report.message}
                                        </p>
                                        {report.adminResponse && (
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <p className="text-xs font-medium text-gray-500 mb-1">{t('adminResponse')}:</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                                    {report.adminResponse}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'mySuggestions' && (
                    <div>
                        {loadingSuggestions ? (
                            <div className="text-center py-8 text-gray-500">{t('loading')}</div>
                        ) : suggestions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">Aucune suggestion de titre</div>
                        ) : (
                            <div className="space-y-3">
                                {suggestions.map((s) => (
                                    <div
                                        key={s.uid}
                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-black"
                                    >
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                s.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    : s.status === 'accepted'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {s.status}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-auto">
                                                {s.createdAt?.toDate?.()?.toLocaleDateString() || ''}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <p>
                                                <span className="text-gray-500">Titre actuel :</span>{' '}
                                                <span className="text-gray-900 dark:text-white line-through">{s.currentTitle}</span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Suggestion :</span>{' '}
                                                <span className="text-amber-600 dark:text-amber-400 font-semibold">{s.suggestedTitle}</span>
                                            </p>
                                            {s.reason && (
                                                <p className="text-gray-500 dark:text-gray-400 mt-1 italic">"{s.reason}"</p>
                                            )}
                                        </div>
                                        {s.adminNote && (
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <p className="text-xs font-medium text-gray-500 mb-1">Note de l'administrateur :</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                                    {s.adminNote}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HelpScreen;