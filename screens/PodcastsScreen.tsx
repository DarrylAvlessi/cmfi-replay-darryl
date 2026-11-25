import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MediaContent } from '../types';
import CategoryScreen from './CategoryScreen';

interface PodcastsScreenProps {
    onSelectMedia: (media: MediaContent) => void;
    onPlay: (media: MediaContent) => void;
}

const PodcastsScreen: React.FC<PodcastsScreenProps> = ({ onSelectMedia, onPlay }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/home');
    };

    return (
        <CategoryScreen
            onBack={handleBack}
            onSelectMedia={onSelectMedia}
            onPlay={onPlay}
        />
    );
};

export default PodcastsScreen;
