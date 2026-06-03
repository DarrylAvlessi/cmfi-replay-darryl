// types.ts

export enum MediaType {
    Series = 'Series',
    Movie = 'Movie',
    Podcast = 'Podcast',
}

export interface Comment {
    id: string;
    user: {
        name: string;
        avatarUrl: string;
    };
    text: string;
    timestamp: string;
    likes?: number;
}

export interface Episode {
    episodeNumber: number;
    title: string;
    duration: string;
    thumbnailUrl: string;
    views?: number;
    likes?: number;
    comments?: Comment[];
}

export interface MediaContent {
    id: string;
    type: MediaType;
    title: string;
    author?: string;
    theme: string;
    imageUrl: string;
    duration?: string; // e.g., "45 min" or "1h 30m"
    episodes?: number;
    progress?: number; // 0 to 100
    description: string;
    languages: string[];
    seasons?: {
        seasonNumber: number;
        episodes: Episode[];
    }[];
    views?: number;
    likes?: number;
    comments?: Comment[];
    video_path_hd?: string;
}

export interface User {
    id: string;
    name: string;
    avatarUrl: string;
    isOnline: boolean;
    presence?: 'online' | 'offline' | 'idle' | 'away';
}

export enum ActiveTab {
    Home = 'Home',
    Search = 'Search',
    Profile = 'Profile',
}

export type Screen = ActiveTab | 'Bookmarks' | 'Preferences' | 'EditProfile' | 'MediaDetail' | 'VideoPlayer' | 'CategoryScreen';