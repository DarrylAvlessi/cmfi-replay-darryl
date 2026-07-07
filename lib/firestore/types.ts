import { Timestamp, DocumentReference } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email: string;
    display_name: string;
    photo_url?: string;
    presence: 'online' | 'offline' | 'idle' | 'away';
    hasAcceptedPrivacyPolicy: boolean;
    rgpdAcceptedAt?: Date | Timestamp;
    created_time: string;
    theme: 'light' | 'dark';
    language: string;
    bookmarkedIds: string[];
    createdAt?: Date | Timestamp;
    updatedAt?: Date | Timestamp;
    isAdmin?: boolean;
    lastSeen?: Date | Timestamp;
    country?: string;
    phoneNumber?: string;
}

export interface SerieCategory {
    id: string;
    name: string;
    nameFr?: string;
    description?: string;
    color?: string;
    order?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Serie {
    id: string;
    uid_serie: string;
    title_serie: string;
    overview_serie: string;
    image_path: string;
    back_path: string;
    lang: string;
    runtime_h_m: string;
    homedisplayed: boolean;
    is_hidden: boolean;
    serie_type?: 'serie' | 'podcast';
    categoryId?: string;
    seasonsCount?: number;
    episodesCount?: number;
    totalDuration?: number;
    statsUpdatedAt?: Timestamp;
}

export interface SeasonSerie {
    id: string;
    uid_season: string;
    uid_serie: string;
    title_season: string;
    title_serie: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    season_number: number;
    nb_episodes: number;
    year_season: number;
    isSecret?: boolean;
    allowedUserIds?: string[];
}

export interface EpisodeSerie {
    id: string;
    TranscriptText: string;
    backdrop_path: string;
    embedUrl: string;
    episode_numero: number;
    hidden: boolean;
    original_title: string;
    overview: string;
    overviewFr: string;
    picture_path: string;
    runtime: number;
    runtime_h_m: string;
    search_keywords: string[];
    title: string;
    title_lowercase: string;
    title_serie: string;
    uid_episode: string;
    uid_season: string;
    video_path_hd: string;
    video_path_sd: string;
    views?: number;
    likesCount?: number;
    other_seasons?: { [seasonUid: string]: number };
}

export interface Movie {
    uid: string;
    title: string;
    original_title: string;
    original_language: string;
    overview: string;
    backdrop_path: string;
    picture_path: string;
    poster_path: string;
    embedUrl: string;
    video_path_hd: string;
    video_path_sd: string;
    hidden: boolean;
    homedisplayed: boolean;
    runtime: string;
    runtime_h_m: string;
    popular: boolean;
    trending: boolean;
    views?: number;
    likesCount?: number;
}

export interface UserBookmark {
    id: string;
    userId: string;
    movieId: string;
    createdAt: Date | Timestamp;
}

export interface Like {
    isliked: boolean;
    liked_at: string;
    likedby: string;
    title: string;
    uid: string;
    username: string;
    contentType: 'movie' | 'episode';
}

export interface BookDoc {
    add_at: string;
    description: string;
    email: string;
    image: string;
    isseries: boolean;
    title: string;
    uid: string;
}

export interface BookSeries {
    add_at: string;
    description: string;
    email: string;
    image: string;
    isbooked: boolean;
    isseries: boolean;
    moviepath: string;
    runtime: string;
    title: string;
    uid?: string;
    refEpisode?: DocumentReference;
}

export interface StatsVues {
    id?: string;
    dateDernierUpdate: Date | Timestamp;
    idEpisodeSerie?: DocumentReference;
    uid: string;
    nombreLectures: number;
    tempsRegarde: number;
    user: DocumentReference;
}

export interface UserView {
    view_date: string;
    uid: string;
    video_type: 'movie' | 'episode';
    user_uid: string;
}

export interface NavigationEntry {
    page_path: string;
    page_name: string;
    timestamp: Date | Timestamp;
    video_title?: string;
    video_uid?: string;
}

export interface UserNavigation {
    id?: string;
    user_uid: string;
    lastTwoPages: NavigationEntry[];
    updatedAt: Date | Timestamp;
}

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: Date | Timestamp;
    link?: string;
}

export interface Report {
    uid?: string;
    userId: string;
    userEmail: string;
    displayName: string;
    type: 'bug' | 'suggestion' | 'question';
    message: string;
    status: 'pending' | 'read' | 'resolved';
    adminResponse?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    respondedAt?: Timestamp;
    respondedBy?: string;
}

export interface TitleSuggestion {
    uid?: string;
    userId: string;
    userEmail: string;
    displayName: string;
    mediaId: string;
    mediaType: 'movie' | 'serie' | 'episode';
    currentTitle: string;
    suggestedTitle: string;
    reason?: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    respondedAt?: Timestamp;
    respondedBy?: string;
    adminNote?: string;
}

export interface Comment {
    id: string;
    comment: string;
    created_at: string;
    created_by: string;
    uid: string;
    user_photo_url?: string;
    likes: number;
    liked_by: string[];
    parent_id: string | null;
    edited: boolean;
    edited_at?: string;
}

export interface ContinueWatchingItem {
    id: string;
    uid: string;
    title: string;
    imageUrl: string;
    progress: number;
    tempsRegarde: number;
    runtime: number;
    type: 'movie' | 'episode';
    episodeNumber?: number;
    seasonNumber?: number;
    serieTitle?: string;
    episodeTitle?: string;
    uid_episode?: string;
    episodeId?: string;
    dateDernierUpdate: Date | Timestamp;
}

export interface SearchResult {
    id: string;
    uid: string;
    title: string;
    description: string;
    imageUrl: string;
    type: 'movie' | 'serie' | 'podcast' | 'season' | 'episode';
    serieTitle?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    uid_serie?: string;
    uid_season?: string;
    uid_episode?: string;
}

export interface InfoBarMessage {
    id: string;
    message: string;
    isActive: boolean;
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
    createdBy?: string;
}

export interface AppSettings {
    homeViewMode: 'default' | 'prime' | 'netflix';
    updatedAt: Date | Timestamp;
    updatedBy?: string;
}

export interface Ad {
    id: string;
    videoUrl: string;
    title?: string;
    skipAfterSeconds?: number;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy?: string;
}

export interface AdSettings {
    enabled: boolean;
    skipAfterSeconds: number;
    updatedAt: Timestamp;
    updatedBy?: string;
}
