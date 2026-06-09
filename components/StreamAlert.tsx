import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DonationAlert {
  id: string;
  amount: number;
  donorName: string;
  streamerName: string;
  createdAt: Timestamp;
}

interface StreamAlertProps {
  streamerId: string;
}

const ALERT_DURATION = 5000;

const StreamAlert: React.FC<StreamAlertProps> = ({ streamerId }) => {
  const [alerts, setAlerts] = useState<DonationAlert[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const donationsRef = collection(db, 'donations');
    const q = query(
      donationsRef,
      where('streamerId', '==', streamerId),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as Omit<DonationAlert, 'id'>;
          const alert: DonationAlert = {
            id: change.doc.id,
            ...data,
          };

          if (!seenIds.current.has(alert.id)) {
            seenIds.current.add(alert.id);
            setAlerts((prev) => [...prev, alert]);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [streamerId]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    seenIds.current.delete(id);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onRemove={removeAlert} />
      ))}
    </div>
  );
};

interface AlertItemProps {
  alert: DonationAlert;
  onRemove: (id: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(alert.id), 300);
    }, ALERT_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [alert.id, onRemove]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 ${
        visible && !exiting
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="font-bold text-lg truncate">
          {alert.donorName} donated €{alert.amount.toFixed(2)}
        </p>
        <p className="text-sm text-white/80 truncate">
          to {alert.streamerName}
        </p>
      </div>
    </div>
  );
};

export default StreamAlert;
