import React, { useState, useEffect } from 'react';
import { infoBarService } from '../lib/db';

const InfoBar: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveMessages = async () => {
      try {
        const activeMessages = await infoBarService.getAllActiveMessages();
        if (activeMessages && activeMessages.length > 0) {
          const messageTexts = activeMessages
            .filter((msg) => msg.message && msg.message.trim())
            .map((msg) => msg.message.trim());
          setMessages(messageTexts);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('Error fetching active info bar messages:', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveMessages();
    const interval = setInterval(fetchActiveMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || messages.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden border-y border-blue-500/20 bg-gradient-to-r from-blue-600/10 via-sky-500/10 to-blue-600/10 dark:from-[#0b1530] dark:via-[#0e1d3f] dark:to-[#0b1530]">
      <div className="flex items-center py-2">
        <div className="flex-shrink-0 flex items-center gap-2 pl-4 pr-3 border-r border-blue-500/20">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-[10px] font-mono-meta font-bold uppercase tracking-widest text-blue-600 dark:text-sky-400">
            Info
          </span>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div
            className="inline-flex items-center animate-scroll"
            style={{
              animation: 'scroll 40s linear infinite',
              whiteSpace: 'nowrap',
              width: 'max-content',
              paddingRight: '100%',
            }}
          >
            {messages.map((msg, index) => (
              <React.Fragment key={index}>
                <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-sky-100">
                  {msg}
                </span>
                {index < messages.length - 1 && (
                  <span className="mx-4 text-sky-500 font-bold">•</span>
                )}
              </React.Fragment>
            ))}
            <span className="ml-8 text-xs sm:text-sm font-medium text-slate-800 dark:text-sky-100">
              {messages.map((msg, index) => (
                <React.Fragment key={`dup-${index}`}>
                  {msg}
                  {index < messages.length - 1 && (
                    <span className="mx-4 text-sky-500 font-bold">•</span>
                  )}
                </React.Fragment>
              ))}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-35%, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default InfoBar;
