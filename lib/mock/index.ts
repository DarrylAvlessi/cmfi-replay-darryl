export type {
  UserProfile,
  SerieCategory,
  Serie,
  SeasonSerie,
  EpisodeSerie,
  Movie,
  UserBookmark,
  Like,
  BookDoc,
  BookSeries,
  StatsVues,
  UserView,
  NavigationEntry,
  UserNavigation,
  Notification,
  Report,
  TitleSuggestion,
  Comment,
  ContinueWatchingItem,
  SearchResult,
  InfoBarMessage,
  AppSettings,
  Ad,
  AdSettings,
} from '../firestore';

export { getCategoryName, generateDefaultAvatar } from '../firestore';
import {
  getLastWatchedPosition as realGetLastWatchedPosition,
  getLastWatchedPositionForMovie as realGetLastWatchedPositionForMovie,
} from '../firestore';

export {
  userService,
  titleSuggestionService,
  commentService,
  movieService,
  serieService,
  seasonSerieService,
  episodeSerieService,
  serieCategoryService,
  likeService,
  bookDocService,
  bookSeriesService,
  statsVuesService,
  searchService,
  viewService,
  userMetricsService,
  userGeographyService,
  infoBarService,
  appSettingsService,
  adService,
  notificationService,
  navigationTrackingService,
  reportService,
} from './mockServices';

export const getLastWatchedPosition = realGetLastWatchedPosition;
export const getLastWatchedPositionForMovie = realGetLastWatchedPositionForMovie;
export const updateEpisodeViews = async (): Promise<void> => {};
export const initializeMovieViews = async (): Promise<{ success: boolean; updated: number }> => ({ success: true, updated: 0 });
export const updateAppSettings = async (_updates: Record<string, unknown>): Promise<void> => {};
export { subscriptionService } from '../subscriptionService';
