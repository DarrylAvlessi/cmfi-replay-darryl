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
    setTimeout(() => inputRef.current?.focus(), 100);
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

  const handleOverlayClick = () => {
    setIsExpanded(false);
    inputRef.current?.blur();
  };

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 z-30"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out rounded-full relative z-40 ${
          isExpanded
            ? `${fullWidth ? 'w-full' : 'w-64'} bg-gray-100 dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700`
            : 'w-10 border border-transparent'
        }`}
      >
        <button
          type="button"
          onClick={handleExpand}
          className="flex-shrink-0 p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={t('search')}
        >
          <SearchIcon className="w-5 h-5" />
        </button>
        <div className={`flex items-center flex-1 min-w-0 transition-opacity duration-300 ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent border-none outline-none py-2 text-gray-900 dark:text-white placeholder-gray-500 text-sm"
            autoComplete="off"
          />
          {isExpanded && searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="flex-shrink-0 p-1 mr-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('clearSearch')}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </>
  );
};

export default DesktopSearchBar;
