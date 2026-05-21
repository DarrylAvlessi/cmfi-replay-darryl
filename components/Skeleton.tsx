import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height
}) => {
    const baseClasses = "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-black dark:via-gray-700 dark:to-black animate-shimmer bg-[length:200%_100%]";

    const variantClasses = {
        text: "rounded",
        circular: "rounded-full",
        rectangular: "rounded-none",
        rounded: "rounded-md",
    };

    const style = {
        width: width,
        height: height,
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
};

export const MediaCardSkeleton: React.FC<{ variant?: 'poster' | 'thumbnail' }> = ({ variant = 'poster' }) => {
    if (variant === 'poster') {
        return (
            <div className="flex-shrink-0 w-[140px] space-y-2">
                <div className="relative">
                    <Skeleton variant="rounded" height={210} className="w-full" />
                    {/* Play button skeleton */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-black/10 animate-pulse" />
                    </div>
                </div>
                <Skeleton variant="text" height={16} width="80%" />
                <Skeleton variant="text" height={12} width="60%" />
            </div>
        );
    }

    return (
        <div className="flex-shrink-0 w-[240px] space-y-2">
            <div className="relative">
                <Skeleton variant="rounded" height={135} className="w-full" />
                {/* Play button skeleton */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/10 dark:bg-black/10 animate-pulse" />
                </div>
            </div>
            <Skeleton variant="text" height={16} width="90%" />
            <Skeleton variant="text" height={12} width="70%" />
        </div>
    );
};

export const UserAvatarSkeleton: React.FC = () => {
    return (
        <div className="flex-shrink-0 flex flex-col items-center space-y-2 w-[72px]">
            <div className="relative">
                <Skeleton variant="circular" width={64} height={64} />
                {/* Online indicator skeleton */}
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
            </div>
            <Skeleton variant="text" height={12} width={50} />
        </div>
    );
};

export const HeroSkeleton: React.FC = () => {
    return (
        <div className="relative w-full h-[50vh] min-h-[400px] overflow-hidden">
            {/* Background image skeleton */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-900 dark:via-black dark:to-gray-900 animate-shimmer bg-[length:200%_100%]" />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Content skeleton */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-12 space-y-4">
                {/* Title */}
                <div className="space-y-2">
                    <Skeleton variant="text" height={40} width="60%" className="bg-gray-700/50" />
                    <Skeleton variant="text" height={32} width="45%" className="bg-gray-700/50" />
                </div>

                {/* Description */}
                <div className="space-y-2 max-w-2xl">
                    <Skeleton variant="text" height={16} width="90%" className="bg-gray-700/50" />
                    <Skeleton variant="text" height={16} width="80%" className="bg-gray-700/50" />
                </div>

                {/* Buttons */}
                <div className="flex space-x-4 pt-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-full bg-gray-700/50 animate-pulse" />
                        <Skeleton variant="rounded" height={48} width={140} className="bg-gray-700/50" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-full bg-gray-700/50 animate-pulse" />
                        <Skeleton variant="rounded" height={48} width={140} className="bg-gray-700/50" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ContinueWatchingSkeleton: React.FC = () => {
    return (
        <div className="mb-8">
            <Skeleton variant="text" height={28} width="250px" className="mx-4 mb-4" />
            <div className="px-4">
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex-none w-48 sm:w-56 md:w-64 lg:w-72">
                            <div className="flex flex-col">
                                {/* Video thumbnail with progress */}
                                <div className="relative">
                                    <Skeleton variant="rounded" className="aspect-video w-full" />
                                    {/* Play button */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-14 h-14 rounded-full bg-white/20 dark:bg-black/20 animate-pulse" />
                                    </div>
                                    {/* Progress bar */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-400 dark:bg-gray-600">
                                        <div
                                            className="h-full bg-amber-500 animate-pulse"
                                            style={{ width: `${30 + (i * 15)}%` }}
                                        />
                                    </div>
                                </div>
                                {/* Title and metadata */}
                                <div className="mt-2 space-y-2">
                                    <Skeleton variant="text" height={16} width="90%" />
                                    <Skeleton variant="text" height={12} width="60%" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const CategoryTilesSkeleton: React.FC = () => {
    return (
        <div className="px-4 py-6">
            <Skeleton variant="text" height={28} width="200px" className="mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="relative group">
                        <Skeleton variant="rounded" className="aspect-video w-full" />
                        {/* Icon skeleton */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/20 dark:bg-black/20 animate-pulse" />
                        </div>
                        {/* Title skeleton */}
                        <div className="absolute bottom-4 left-4 right-4">
                            <Skeleton variant="text" height={20} width="70%" className="bg-white/30 dark:bg-black/30" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MostLikedSkeleton: React.FC = () => {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between px-4 mb-4">
                <Skeleton variant="text" height={28} width="200px" />
                {/* Navigation buttons skeleton */}
                <div className="flex space-x-2">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-black animate-pulse" />
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-black animate-pulse" />
                </div>
            </div>
            <div className="px-4">
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex-none w-48 sm:w-56 md:w-64 lg:w-72">
                            <div className="relative group">
                                {/* Rank badge */}
                                <div className="absolute -left-3 -top-3 z-10">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                        <Skeleton variant="text" height={20} width={20} className="bg-white/30" />
                                    </div>
                                </div>

                                {/* Video thumbnail */}
                                <div className="relative">
                                    <Skeleton variant="rounded" className="aspect-video w-full" />

                                    {/* Play button */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-14 h-14 rounded-full bg-white/20 dark:bg-black/20 animate-pulse" />
                                    </div>

                                    {/* Stats badge */}
                                    <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/70 rounded-full px-2 py-1">
                                        <div className="w-4 h-4 rounded-full bg-red-500/50 animate-pulse" />
                                        <Skeleton variant="text" height={12} width={30} className="bg-white/30" />
                                    </div>
                                </div>

                                {/* Title and metadata */}
                                <div className="mt-2 space-y-2">
                                    <Skeleton variant="text" height={16} width="90%" />
                                    <Skeleton variant="text" height={12} width="60%" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
