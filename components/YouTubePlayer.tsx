// components/YouTubePlayer.tsx
// Iframe player for YouTube-backed episodes. Used instead of VideoPlayer
// when the episode is a curated YouTube video (see isYouTubeEpisode).

import React from 'react';

interface YouTubePlayerProps {
    videoId: string;
    title?: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, title }) => {
    return (
        <div className="relative w-full aspect-video bg-black overflow-hidden">
            <iframe
                key={videoId}
                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                title={title || 'YouTube video player'}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            />
        </div>
    );
};

export default YouTubePlayer;
