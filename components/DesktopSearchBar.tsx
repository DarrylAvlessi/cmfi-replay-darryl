import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { SearchIcon, XMarkIcon } from './icons';

interface DesktopSearchBarProps {
  onActiveChange?: (active: boolean) => void;
  fullWidth?: boolean;
}

const DesktopSearchBar: React.FC<DesktopSearchBarProps> = ({ onActiveChange, fullWidth = false }) => {
  const { t } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onActiveChange?.(isExpanded);
  }, [isExpanded, onActiveChange]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isExpanded) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        handleExpand();
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isExpanded]);

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    } else if (searchTerm) {
      navigate('/home');
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    if (!searchTerm.trim()) {
      setIsExpanded(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchTerm('');
      if (searchTerm) {
        navigate('/home');
      }
      setIsExpanded(false);
    }
  };

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] z-30"
          onClick={() => {
            setIsExpanded(false);
            inputRef.current?.blur();
          }}
          aria-hidden="true"
        />
      )}
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className={`flex items-center overflow-hidden transition-all duration-200 rounded-xl relative z-40 border ${
          isExpanded
            ? `${fullWidth ? 'w-full' : 'w-72'} bg-white dark:bg-[#0f172a] border-blue-500/50 ring-2 ring-blue-500/20 shadow-lg`
            : 'w-auto border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <button
          type="button"
          onClick={handleExpand}
          className={`flex items-center gap-2 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors ${
            isExpanded ? 'pr-2' : ''
          }`}
          aria-label={t('search')}
        >
          <SearchIcon className="w-4 h-4 flex-shrink-0" />
          {!isExpanded && (
            <>
              <span className="hidden xl:inline text-xs font-medium text-slate-500 dark:text-slate-400 pr-2">
                {t('search')}...
              </span>
              <kbd className="hidden xl:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono-meta font-semibold rounded bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                /
              </kbd>
            </>
          )}
        </button>

        {isExpanded && (
          <div className="flex items-center flex-1 min-w-0 pr-2">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-transparent border-none outline-none py-1.5 text-slate-900 dark:text-white placeholder-slate-400 text-sm"
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClear}
                className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                aria-label={t('clearSearch')}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </form>
    </>
  );
};

export default DesktopSearchBar;
