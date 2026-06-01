import React from 'react';
import { MediaContent } from '../types';
import { PlayIcon } from './icons';

interface LikedMediaCardProps {
    item: MediaContent;
    likeCount: number;
    variant?: 'poster' | 'thumbnail';
    onSelect?: (item: MediaContent) => void;
    onPlay?: (item: MediaContent) => void;
}

const LikedMediaCard: React.FC<LikedMediaCardProps> = ({
    item,
    likeCount,
    variant = 'thumbnail',
    onSelect,
    onPlay
}) => {
    const { title, imageUrl, author } = item;
    const handleSelect = () => onSelect && onSelect(item);
    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPlay && onPlay(item);
    };

    if (variant === 'poster') {
        return (
            <div onClick={handleSelect} className="flex-shrink-0 w-36 md:w-48 space-y-2 cursor-pointer group">
                <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-all duration-300 border-2 border-transparent group-hover:border-amber-500/60 dark:group-hover:border-amber-500/60">
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                    <div
                        onClick={handlePlay}
                        className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                        <PlayIcon className="w-12 h-12 text-white opacity-80" />
                    </div>
                    {/* Badge de likes */}
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full flex items-center space-x-1">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-red-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white text-xs font-semibold">{likeCount}</span>
                    </div>
                </div>
                <h3 className="text-gray-900 dark:text-white text-sm font-semibold truncate">{title}</h3>
                {author && <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{author}</p>}
            </div>
        );
    }

    // Default variant: 'thumbnail'
    return (
        <div onClick={handleSelect} className="flex-shrink-0 w-64 md:w-80 space-y-2 cursor-pointer">
            <div className="relative aspect-video bg-gray-300 dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg group border-2 border-transparent group-hover:border-amber-500/60 dark:group-hover:border-amber-500/60 transition-all duration-300">
                <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                <div
                    onClick={handlePlay}
                    className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <PlayIcon className="w-12 h-12 text-white opacity-80" />
                </div>
                {/* Badge de likes */}
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center space-x-1.5">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-red-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white text-sm font-semibold">{likeCount}</span>
                </div>
            </div>
            <h3 className="text-gray-900 dark:text-white font-semibold truncate">{title}</h3>
            {author && <p className="text-gray-500 dark:text-gray-400 text-sm truncate">{author}</p>}
        </div>
    );
};

export default LikedMediaCard;
