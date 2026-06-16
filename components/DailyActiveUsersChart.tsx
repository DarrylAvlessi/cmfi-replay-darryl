import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';

interface DailyActiveUsersChartProps {
    data: Array<{ date: string; activeUsers: number }>;
    loading: boolean;
    days: number;
    onDaysChange: (days: number) => void;
}

const DailyActiveUsersChart: React.FC<DailyActiveUsersChartProps> = ({ data, loading, days, onDaysChange }) => {
    const { t, language } = useAppContext();

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr + 'T00:00:00');
        const daysArr = [t('daySun'), t('dayMon'), t('dayTue'), t('dayWed'), t('dayThu'), t('dayFri'), t('daySat')];
        const day = daysArr[date.getDay()];
        const dayNum = date.getDate();
        const month = date.getMonth() + 1;
        return `${day} ${dayNum}/${month}`;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const date = new Date(label + 'T00:00:00');
        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {payload[0].value === 1
                        ? t('chartActiveUsers_one', { count: '1' })
                        : t('chartActiveUsers_other', { count: String(payload[0].value) })
                    }
                </p>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    const totalActive = data.reduce((sum, d) => sum + d.activeUsers, 0);
    const avgActive = data.length > 0 ? Math.round(totalActive / data.length) : 0;
    const peakDay = data.reduce((max, d) => d.activeUsers > max.activeUsers ? d : max, data[0] || { date: '', activeUsers: 0 });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('chartAvg')} <span className="font-semibold text-gray-900 dark:text-white">{avgActive}</span> {t('chartPerDay')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('chartPeak')} <span className="font-semibold text-amber-600 dark:text-amber-400">{peakDay.activeUsers}</span>
                        {peakDay.date && (
                            <span className="text-gray-400 dark:text-gray-500"> ({formatDate(peakDay.date)})</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onDaysChange(14)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            days === 14
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        {t('chartDays14')}
                    </button>
                    <button
                        onClick={() => onDaysChange(30)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            days === 30
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        {t('chartDays30')}
                    </button>
                </div>
            </div>

            {data.every(d => d.activeUsers === 0) ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg mb-2">{t('chartNoData')}</p>
                    <p className="text-sm mt-1">{t('chartNoDataDesc')}</p>
                </div>
            ) : (
                <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }} />
                            <Bar
                                dataKey="activeUsers"
                                fill="#f59e0b"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default DailyActiveUsersChart;
