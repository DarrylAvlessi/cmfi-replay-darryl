import * as real from './firestore';
import * as mock from './mock/index';

const useMock = import.meta.env.VITE_USE_MOCK_DB === 'true';

const mod = useMock ? mock : real;

if (useMock) {
  console.log('🔧 Using MOCK Firestore database');
}

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
} from './firestore';

export const {
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
  getCategoryName,
  generateDefaultAvatar,
  getLastWatchedPosition,
  getLastWatchedPositionForMovie,
  updateEpisodeViews,
  initializeMovieViews,
  updateAppSettings,
  subscriptionService,
} = mod;
