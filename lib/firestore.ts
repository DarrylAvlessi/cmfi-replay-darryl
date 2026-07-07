export type * from './firestore/types';

export {
  USERS_COLLECTION,
  MOVIES_COLLECTION,
  SERIES_COLLECTION,
  SEASONS_SERIES_COLLECTION,
  EPISODES_SERIES_COLLECTION,
  SERIE_CATEGORIES_COLLECTION,
  BOOKMARKS_COLLECTION,
  BOOK_DOC_COLLECTION,
  BOOK_SERIES_COLLECTION,
  LIKES_COLLECTION,
  COMMENTS_COLLECTION,
  STATS_VUES_COLLECTION,
  USER_VIEW_COLLECTION,
  APP_SETTINGS_COLLECTION,
  ADS_COLLECTION,
  NOTIFICATIONS_COLLECTION,
  USER_NAVIGATION_COLLECTION,
  USERS_REPORTS_COLLECTION,
  TITLE_SUGGESTIONS_COLLECTION,
  USER_DAILY_ACTIVITY_COLLECTION,
  INFO_BAR_COLLECTION,
} from './firestore/constants';

export {
  getCategoryName,
  generateDefaultAvatar,
  getLastWatchedPosition,
  getLastWatchedPositionForMovie,
  updateEpisodeViews,
  initializeMovieViews,
  updateAppSettings,
} from './firestore/utils';

export { userService, userMetricsService, userGeographyService } from './firestore/userService';
export { movieService, serieService, seasonSerieService, serieCategoryService } from './firestore/contentServices';
export { episodeSerieService } from './firestore/episodeSerieService';
export { bookDocService, bookSeriesService, likeService } from './firestore/bookmarkServices';
export { commentService, titleSuggestionService, reportService } from './firestore/socialServices';
export { statsVuesService, viewService, searchService, navigationTrackingService, dailyActivityService } from './firestore/statsServices';
export { notificationService, infoBarService, appSettingsService, adService } from './firestore/adminServices';
export { subscriptionService } from './subscriptionService';
