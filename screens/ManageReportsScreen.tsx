import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService, Report } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon, CommentIcon } from '../components/icons';
import { toast } from 'react-toastify';

const typeLabels: Record<string, string> = {
    bug: 'Bug',
    suggestion: 'Suggestion',
    question: 'Question',
};

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    read: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const ManageReportsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile } = useAppContext();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [responseText, setResponseText] = useState('');

    const isAdmin = userProfile?.isAdmin ?? (userProfile as any)?.['isAdmin '];

    useEffect(() => {
        if (!isAdmin) return;

        const load = async () => {
            setLoading(true);
            try {
                const all = await reportService.getAllReports();
                setReports(all);
            } catch (error) {
                console.error('Error loading reports:', error);
                toast.error('Erreur lors du chargement des signalements');
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

    const handleExpand = (reportId: string) => {
        if (expandedId === reportId) {
            setExpandedId(null);
            setResponseText('');
        } else {
            setExpandedId(reportId);
            const report = reports.find(r => r.uid === reportId);
            setResponseText(report?.adminResponse || '');
        }
    };

    const handleRespond = async (reportId: string) => {
        if (!responseText.trim()) return;
        try {
            await reportService.respondToReport(reportId, responseText.trim(), userProfile?.uid || '');
            toast.success('Réponse envoyée');
            setExpandedId(null);
            setResponseText('');
            const all = await reportService.getAllReports();
            setReports(all);
        } catch (error) {
            console.error('Error responding to report:', error);
            toast.error('Erreur lors de l\'envoi de la réponse');
        }
    };

    const handleStatusChange = async (reportId: string, status: 'pending' | 'read' | 'resolved') => {
        try {
            await reportService.updateReportStatus(reportId, status);
            const all = await reportService.getAllReports();
            setReports(all);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Erreur lors de la mise à jour du statut');
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

                <h1 className="text-2xl font-serif font-bold mb-6">Gérer les signalements</h1>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Chargement...</div>
                ) : reports.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Aucun signalement</div>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <div
                                key={report.uid}
                                className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                <button
                                    onClick={() => handleExpand(report.uid || '')}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <CommentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium">{report.displayName}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                    {typeLabels[report.type] || report.type}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[report.status] || ''}`}>
                                                    {report.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                                {report.message}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400 flex-shrink-0 ml-4">
                                        {report.createdAt?.toDate?.()?.toLocaleDateString() || ''}
                                    </div>
                                </button>

                                {expandedId === report.uid && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                                        <div>
                                            <p className="text-sm font-medium mb-1">Message :</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {report.message}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium mb-1">Contact :</p>
                                            <p className="text-sm text-gray-500">{report.userEmail}</p>
                                        </div>

                                        {report.adminResponse && (
                                            <div>
                                                <p className="text-sm font-medium mb-1">Réponse :</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                                    {report.adminResponse}
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                {report.adminResponse ? 'Modifier la réponse' : 'Répondre'}
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={responseText}
                                                onChange={(e) => setResponseText(e.target.value)}
                                                placeholder="Écrire une réponse..."
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm"
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 flex-wrap">
                                            <button
                                                onClick={() => handleRespond(report.uid || '')}
                                                disabled={!responseText.trim()}
                                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                Envoyer la réponse
                                            </button>

                                            <div className="flex items-center gap-2 ml-auto">
                                                <span className="text-xs text-gray-500">Statut :</span>
                                                {(['pending', 'read', 'resolved'] as const).map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => handleStatusChange(report.uid || '', s)}
                                                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                                                            report.status === s
                                                                ? 'bg-amber-500 text-white border-amber-500'
                                                                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-500'
                                                        }`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
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

export default ManageReportsScreen;