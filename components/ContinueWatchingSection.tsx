import React, { useRef, useEffect, useState } from 'react';
import { ContinueWatchingItem } from '../lib/firestore';
import { PlayIcon } from './icons';

interface ContinueWatchingCardProps {
    item: ContinueWatchingItem;
    onClick: () => void;
}

const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({ item, onClick }) => {
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    };

    const remainingTime = item.runtime - item.tempsRegarde;

    return (
        <div
            onClick={onClick}
        >
            <div className="group cursor-pointer transition-all duration-500 hover:scale-105 flex flex-col">
                {/* Image container avec meilleur design */}
                <div className="relative w-full aspect-[2/3] rounded-lg md:rounded-xl overflow-hidden bg-black dark:bg-gray-900 shadow-xl group-hover:shadow-2xl mb-3 transition-all duration-500 border-2 border-transparent group-hover:border-amber-500/60 dark:group-hover:border-amber-500/60">
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Play button overlay amélioré */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/40 backdrop-blur-[2px]">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/95 dark:bg-white/90 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300 border-2 border-white/50">
                            <PlayIcon className="w-7 h-7 md:w-8 md:h-8 text-gray-900 ml-1" />
                        </div>
                    </div>

                    {/* Progress bar améliorée */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 md:h-2 bg-black/50 backdrop-blur-sm">
                        <div
                            className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-500 shadow-lg shadow-amber-500/50"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                </div>

                {/* Info container amélioré */}
                <div className="px-2 py-2">
                    <h3 className="text-sm md:text-base font-serif font-bold text-gray-900 dark:text-white break-words min-h-[2.5rem] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                        {item.title}
                    </h3>
                    {item.type === 'episode' && item.serieTitle && item.serieTitle !== item.title && (
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-1.5">
                            {item.serieTitle}
                        </p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs md:text-sm text-amber-600 dark:text-amber-400 font-semibold">
                            {formatTime(remainingTime)} restant{item.type === 'episode' ? 'es' : ''}
                        </p>
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50 animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ContinueWatchingSectionProps {
    items: ContinueWatchingItem[];
    onItemClick: (item: ContinueWatchingItem) => void;
    title?: string;
}

const ContinueWatchingSection: React.FC<ContinueWatchingSectionProps> = ({
    items,
    onItemClick,
    title = 'Continuer la lecture'
}) => {
    if (items.length === 0) {
        return null;
    }

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftGradient, setShowLeftGradient] = useState(false);
    const [showRightGradient, setShowRightGradient] = useState(true);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const checkScroll = () => {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            setShowLeftGradient(scrollLeft > 10);
            setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 10);
        };

        checkScroll();
        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
        return () => {
            container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [items]);

    return (
        <div className="mb-8 md:mb-12">
            {/* Titre avec meilleure hiérarchie */}
            <div className="px-4 md:px-6 lg:px-8 mb-6">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
                    {title}
                </h2>
            </div>
            
            {/* Container avec gradients */}
            <div className="relative">
                {/* Gradient gauche */}
                {showLeftGradient && (
                    <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 lg:w-40 bg-gradient-to-r from-white dark:from-black via-white/80 dark:via-black/80 to-transparent z-20 pointer-events-none transition-opacity duration-500" />
                )}
                
                {/* Gradient droite */}
                {showRightGradient && (
                    <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 lg:w-40 bg-gradient-to-l from-white dark:from-black via-white/80 dark:via-black/80 to-transparent z-20 pointer-events-none transition-opacity duration-500" />
                )}
                
                <div className="px-4 md:px-6 lg:px-8">
                    <div className="relative">
                        <div 
                            ref={scrollContainerRef}
                            className="flex overflow-x-auto pb-6 -mx-2 px-2 scrollbar-hide scroll-smooth snap-x snap-mandatory"
                            style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
                        >
                            <div className="flex space-x-4 md:space-x-6">
                                {items.map((item) => (
                                    <div key={item.id} className="flex-none w-36 md:w-48 snap-start">
                                        <ContinueWatchingCard
                                            item={item}
                                            onClick={() => onItemClick(item)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContinueWatchingSection;
