import { useState, useEffect } from 'react';

export type ConnectionQuality = 'slow' | 'medium' | 'fast';

interface NetworkStatus {
    effectiveType: string;
    downlink: number;
    saveData: boolean;
    connectionQuality: ConnectionQuality;
}

function getConnectionQuality(et: string): ConnectionQuality {
    if (et === 'slow-2g' || et === '2g') return 'slow';
    if (et === '3g') return 'medium';
    return 'fast';
}

export function useNetworkStatus(): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>(() => {
        const conn = (navigator as any).connection;
        if (conn) {
            return {
                effectiveType: conn.effectiveType || '4g',
                downlink: conn.downlink || 10,
                saveData: conn.saveData || false,
                connectionQuality: getConnectionQuality(conn.effectiveType || '4g'),
            };
        }
        return { effectiveType: '4g', downlink: 10, saveData: false, connectionQuality: 'fast' };
    });

    useEffect(() => {
        const conn = (navigator as any).connection;
        if (!conn) return;

        const update = () => {
            setStatus({
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                saveData: conn.saveData,
                connectionQuality: getConnectionQuality(conn.effectiveType),
            });
        };

        update();
        conn.addEventListener('change', update);
        return () => conn.removeEventListener('change', update);
    }, []);

    return status;
}
