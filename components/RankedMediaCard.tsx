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
            <div className="relative aspect-video bg-slate-200 dark:bg-[#0f172a] rounded-2xl overflow-hidden shadow-xl group-hover:shadow-2xl transition-all duration-300 border border-slate-200/80 dark:border-slate-800 group-hover:border-blue-500 dark:group-hover:border-sky-400">
                {viewCount !== undefined && (
                    <div className="absolute top-3 right-3 z-10 flex items-center bg-slate-950/85 border border-white/10 text-white font-mono-meta text-xs font-bold px-3 py-1 rounded-lg">
                        <EyeIcon className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                        <span>{viewCount.toLocaleString()}</span>
                    </div>
                )}
                
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#060911]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div
                    onClick={handlePlay}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-950/50 backdrop-blur-[2px]"
                >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                        <PlayIcon className="w-6 h-6 md:w-7 md:h-7 text-white ml-0.5" />
                    </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/55 to-transparent pointer-events-none" />

                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 flex items-end space-x-3 md:space-x-4">
                    <div className="flex-shrink-0">
                        <span className="text-sky-400 text-5xl md:text-6xl lg:text-7xl font-display font-black leading-none drop-shadow-2xl">
                            {rank}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0 pb-1">
                        <h3 className="text-white text-base md:text-lg lg:text-xl font-display font-bold truncate drop-shadow-xl">
                            {title}
                        </h3>
                        {author && (
                            <p className="text-slate-300 text-xs md:text-sm truncate mt-0.5">
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
