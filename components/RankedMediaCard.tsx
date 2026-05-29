import React from 'react';
import { MediaContent } from '../types';
import { PlayIcon, EyeIcon } from './icons';

interface RankedMediaCardProps {
    item: MediaContent;
    rank: number;
    viewCount?: number;
    onSelect?: (item: MediaContent) => void;
    onPlay?: (item: MediaContent) => void;
}

const RankedMediaCard: React.FC<RankedMediaCardProps> = ({
    item,
    rank,
    viewCount,
    onSelect,
    onPlay
}) => {
    const { title, imageUrl, author } = item;
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
        // Si on a un gestionnaire onPlay, on l'appelle, sinon on utilise onSelect
        if (onPlay) {
            onPlay(item);
        } else if (onSelect) {
            onSelect(item);
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className="flex-shrink-0 w-44 md:w-72 lg:w-80 cursor-pointer group transition-all duration-500 hover:scale-105"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(e as any);
                }
            }}
        >
            <div className="relative aspect-video bg-gray-300 dark:bg-gray-700 rounded-2xl overflow-hidden shadow-xl group-hover:shadow-2xl transition-all duration-500 border-2 border-gray-200/80 dark:border-gray-700/80 group-hover:border-blue-500 dark:group-hover:border-blue-400">
                {/* Badge de vues amélioré */}
                {viewCount !== undefined && (
                    <div className="absolute top-3 right-3 z-10 flex items-center bg-black/90 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                        <EyeIcon className="w-3.5 h-3.5 mr-1.5" />
                        <span>{viewCount.toLocaleString()}</span>
                    </div>
                )}
                
                {/* Image avec meilleur hover */}
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Gradient overlay qui apparaît au hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Overlay au hover avec bouton play premium - style Continue Watching */}
                <div
                    onClick={handlePlay}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/40 backdrop-blur-[2px]"
                >
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/95 dark:bg-white/90 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300 border-2 border-white/50">
                        <PlayIcon className="w-7 h-7 md:w-8 md:h-8 text-gray-900 ml-1" />
                    </div>
                </div>

                {/* Gradient en bas amélioré */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

                {/* Numéro de classement et informations premium */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end space-x-3 md:space-x-4">
                    {/* Numéro de classement avec style premium */}
                    <div className="flex-shrink-0">
                        <span className="text-amber-500 dark:text-amber-400 text-6xl md:text-7xl lg:text-8xl font-black leading-none drop-shadow-2xl" style={{
                            textShadow: '3px 3px 8px rgba(0,0,0,0.9), 0 0 20px rgba(245, 158, 11, 0.5)'
                        }}>
                            {rank}
                        </span>
                    </div>

                    {/* Titre et genre améliorés */}
                    <div className="flex-1 min-w-0 pb-2">
                        <h3 className="text-white text-lg md:text-xl lg:text-2xl font-black truncate drop-shadow-xl">
                            {title}
                        </h3>
                        {author && (
                            <p className="text-gray-200 text-sm md:text-base truncate drop-shadow-lg mt-1">
                                {author}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RankedMediaCard;
