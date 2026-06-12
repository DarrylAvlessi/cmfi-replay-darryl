import { MediaContent, MediaType } from '../types';
import { Movie, Serie } from '../lib/db';

export const transformMovieToMediaContent = (movie: Movie): MediaContent => ({
    id: movie.uid,
    type: MediaType.Movie,
    title: movie.title,
    author: undefined,
    theme: '',
    imageUrl: movie.picture_path || movie.backdrop_path || movie.poster_path,
    duration: movie.runtime_h_m,
    description: movie.overview,
    languages: [movie.original_language],
    video_path_hd: movie.video_path_hd
});

export const transformSerieToMediaContent = (serie: Serie, mediaType: MediaType.Series | MediaType.Podcast = MediaType.Series): MediaContent => ({
    id: serie.uid_serie,
    type: mediaType,
    title: serie.title_serie,
    author: '',
    theme: '',
    imageUrl: serie.image_path || serie.back_path,
    duration: serie.runtime_h_m,
    description: serie.overview_serie,
    languages: [],
    video_path_hd: ''
});
