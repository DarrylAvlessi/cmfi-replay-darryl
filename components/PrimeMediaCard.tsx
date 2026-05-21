import React from 'react';
import { MediaContent } from '../types';
import { PlayIcon } from './icons';
import { useAppContext } from '../context/AppContext';

interface PrimeMediaCardProps {
    item: MediaContent;
    rank?: number;
    badge?: 'TOP 10' | 'NOUVEAU FILM' | 'NOUVEAU' | null;
    onSelect?: (item: MediaContent) => void;
    onPlay?: (item: MediaContent) => void;
}

const PrimeMediaCard: React.FC<PrimeMediaCardProps> = ({
    item,
    rank,
    badge,
    onSelect,
    onPlay
}) => {
    const { title, imageUrl, author } = item;
    const { theme } = useAppContext();
    
    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect && onSelect(item);
    };

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPlay && onPlay(item);
    };
    
    const handleCardClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onPlay) {
            onPlay(item);
        } else if (onSelect) {
            onSelect(item);
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className="flex-shrink-0 w-56 md:w-64 lg:w-72 cursor-pointer group transition-all duration-300 hover:scale-105"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(e as any);
                }
            }}
        >
            <div className="relative aspect-[16/9] bg-gray-300 dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300">
                {/* Image */}
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Gradient overlay en bas pour le texte */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

                {/* Numéro de classement en haut à droite */}
                {rank && (
                    <div className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-white text-base md:text-lg font-bold rounded-full shadow-xl ${
                        rank === 1 
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' // Or
                            : rank === 2 
                                ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' // Argent
                                : rank === 3 
                                    ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100' // Bronze
                                    : theme === 'dark' 
                                        ? 'bg-blue-600' 
                                        : 'bg-blue-500'
                    }`}>
                        {rank}
                    </div>
                )}

                {/* Badge personnalisé si fourni (pour d'autres badges comme "NOUVEAU FILM") */}
                {badge && !rank && (
                    <div className={`absolute top-3 right-3 z-10 px-3 py-1.5 text-white text-xs md:text-sm font-bold rounded shadow-xl ${
                        theme === 'dark' ? 'bg-amber-600' : 'bg-amber-500'
                    }`}>
                        {badge}
                    </div>
                )}

                {/* Overlay au hover avec bouton play */}
                <div
                    onClick={handlePlay}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 backdrop-blur-[2px]"
                >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                        <PlayIcon className="w-6 h-6 md:w-7 md:h-7 text-gray-900 ml-1" />
                    </div>
                </div>

                {/* Contenu en bas avec logo Prime */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                    {/* Titre - Style Prime Video - Titre complet sans troncature */}
                    <h3 className="text-white text-lg md:text-xl lg:text-2xl font-bold mb-3 drop-shadow-2xl leading-tight break-words">
                        {title}
                    </h3>
                </div>
            </div>
        </div>
    );
};

export default PrimeMediaCard;

