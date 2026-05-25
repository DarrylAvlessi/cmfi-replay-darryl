import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from './icons';

const DesktopSearchBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    } else if (searchTerm) {
      setIsExpanded(false);
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
    <div
      className={`flex items-center transition-all duration-300 ease-in-out rounded-full ${
        isExpanded
          ? 'w-64 bg-gray-100 dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700'
          : 'w-10'
      }`}
    >
      <button
        onClick={handleExpand}
        className="flex-shrink-0 p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Rechercher"
      >
        <SearchIcon className="w-5 h-5" />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'opacity-100 w-full mr-2' : 'opacity-0 w-0 mr-0'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher..."
          className="w-full bg-transparent border-none outline-none py-2 pr-2 text-gray-900 dark:text-white placeholder-gray-500 text-sm"
        />
      </div>
    </div>
  );
};

export default DesktopSearchBar;
