import { VideoRecord } from '../lib/supabase';
import { ImportQueueState } from '../services/importQueueService';

// ✅ Grouped State Types
export type VideoPlayerState = {
  isOpen: boolean;
  selectedVideo: VideoRecord | null;
  videos: VideoRecord[];
  initialIndex: number;
  initialTimestamp?: number; // For seeking to specific timestamp (e.g., segment_start_time)
};

export type DayDebriefState = {
  isOpen: boolean;
  selectedDate: Date | null;
  videos: VideoRecord[];
};

export type SearchState = {
  showSearch: boolean;
  query: string;
  results: VideoRecord[];
  isSearching: boolean;
  showSearchBar: boolean;
  selectedLifeArea: string | null;
  lifeAreaResults: VideoRecord[];
  isSearchingLifeArea: boolean;
};


export type ImportState = {
  queueState: ImportQueueState | null;
  showProgress: boolean;
};

export type PaginationState = {
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
};

// ✅ Main State Type
export type LibraryState = {
  // Data
  videos: VideoRecord[];
  videosByDate: Record<string, VideoRecord[]>;
  currentStreak: number;

  // UI State
  loading: boolean;
  error: string | null;
  viewMode: 'calendar' | 'grid';
  showStreakModal: boolean;

  // Grouped States
  videoPlayer: VideoPlayerState;
  dayDebrief: DayDebriefState;
  search: SearchState;
  importState: ImportState;
  pagination: PaginationState;
};

// ✅ Action Types
export type LibraryAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; videos: VideoRecord[] }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'UPDATE_STREAK'; streak: number }
  | { type: 'SET_VIEW_MODE'; mode: 'calendar' | 'grid' }
  | { type: 'TOGGLE_STREAK_MODAL'; show: boolean }

  // Video Player Actions
  | { type: 'OPEN_VIDEO_PLAYER'; video: VideoRecord; videos: VideoRecord[]; initialIndex: number; initialTimestamp?: number }
  | { type: 'CLOSE_VIDEO_PLAYER' }

  // Day Debrief Actions
  | { type: 'OPEN_DAY_DEBRIEF'; date: Date; videos: VideoRecord[] }
  | { type: 'CLOSE_DAY_DEBRIEF' }

  // Search Actions
  | { type: 'OPEN_SEARCH' }
  | { type: 'TOGGLE_SEARCH_BAR'; show: boolean }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_SEARCH_RESULTS'; results: VideoRecord[] }
  | { type: 'SET_SEARCHING'; isSearching: boolean }
  | { type: 'CLOSE_SEARCH' }

  // Life Area Actions
  | { type: 'SELECT_LIFE_AREA'; lifeArea: string }
  | { type: 'SET_LIFE_AREA_RESULTS'; results: VideoRecord[] }
  | { type: 'SET_SEARCHING_LIFE_AREA'; isSearching: boolean }
  | { type: 'CLEAR_LIFE_AREA_SELECTION' }

  // Import Queue Actions
  | { type: 'UPDATE_IMPORT_STATE'; queueState: ImportQueueState | null }
  | { type: 'TOGGLE_IMPORT_PROGRESS'; show: boolean }

  // Pagination Actions
  | { type: 'LOAD_MORE_START' }
  | { type: 'LOAD_MORE_SUCCESS'; videos: VideoRecord[]; hasMore: boolean }
  | { type: 'LOAD_MORE_ERROR' }
  | { type: 'RESET_PAGINATION' };

// ✅ Initial State
export const initialLibraryState: LibraryState = {
  videos: [],
  videosByDate: {},
  currentStreak: 0,
  loading: false,
  error: null,
  viewMode: 'calendar',
  showStreakModal: false,

  videoPlayer: {
    isOpen: false,
    selectedVideo: null,
    videos: [],
    initialIndex: 0,
  },

  dayDebrief: {
    isOpen: false,
    selectedDate: null,
    videos: [],
  },

  search: {
    showSearch: false,
    query: '',
    results: [],
    isSearching: false,
    showSearchBar: false,
    selectedLifeArea: null,
    lifeAreaResults: [],
    isSearchingLifeArea: false,
  },

  importState: {
    queueState: null,
    showProgress: false,
  },

  pagination: {
    page: 0,
    hasMore: true,
    isLoadingMore: false,
  },
};

// ✅ Helper: Calculate videos by date
function calculateVideosByDate(videos: VideoRecord[]): Record<string, VideoRecord[]> {
  const byDate: Record<string, VideoRecord[]> = {};

  videos.forEach(video => {
    if (!video.created_at) return;
    const dateKey = new Date(video.created_at).toISOString().split('T')[0];
    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }
    byDate[dateKey].push(video);
  });

  return byDate;
}

// ✅ Reducer Function
export function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'FETCH_SUCCESS': {
      const videosByDate = calculateVideosByDate(action.videos);

      return {
        ...state,
        loading: false,
        videos: action.videos,
        videosByDate,
        error: null,
      };
    }

    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.error,
      };

    case 'UPDATE_STREAK':
      return {
        ...state,
        currentStreak: action.streak,
      };

    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.mode,
      };

    case 'TOGGLE_STREAK_MODAL':
      return {
        ...state,
        showStreakModal: action.show,
      };

    // Video Player
    case 'OPEN_VIDEO_PLAYER':
      return {
        ...state,
        videoPlayer: {
          isOpen: true,
          selectedVideo: action.video,
          videos: action.videos,
          initialIndex: action.initialIndex,
          initialTimestamp: action.initialTimestamp,
        },
      };

    case 'CLOSE_VIDEO_PLAYER':
      return {
        ...state,
        videoPlayer: {
          isOpen: false,
          selectedVideo: null,
          videos: [],
          initialIndex: 0,
        },
      };

    // Day Debrief
    case 'OPEN_DAY_DEBRIEF':
      return {
        ...state,
        dayDebrief: {
          isOpen: true,
          selectedDate: action.date,
          videos: action.videos,
        },
      };

    case 'CLOSE_DAY_DEBRIEF':
      return {
        ...state,
        dayDebrief: {
          isOpen: false,
          selectedDate: null,
          videos: [],
        },
      };

    // Search
    case 'OPEN_SEARCH':
      return {
        ...state,
        search: {
          ...state.search,
          showSearch: true,
          showSearchBar: false, // Close expanded bar when opening full search
        },
      };

    case 'TOGGLE_SEARCH_BAR':
      return {
        ...state,
        search: {
          ...state.search,
          showSearchBar: action.show,
        },
      };

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        search: {
          ...state.search,
          query: action.query,
        },
      };

    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        search: {
          ...state.search,
          results: action.results,
        },
      };

    case 'SET_SEARCHING':
      return {
        ...state,
        search: {
          ...state.search,
          isSearching: action.isSearching,
        },
      };

    case 'CLOSE_SEARCH':
      return {
        ...state,
        search: {
          showSearch: false,
          query: '',
          results: [],
          isSearching: false,
          showSearchBar: false,
          selectedLifeArea: null,
          lifeAreaResults: [],
          isSearchingLifeArea: false,
        },
      };

    // Life Area
    case 'SELECT_LIFE_AREA':
      return {
        ...state,
        search: {
          ...state.search,
          selectedLifeArea: action.lifeArea,
          query: '', // Clear text search when selecting life area
        },
      };

    case 'SET_LIFE_AREA_RESULTS':
      return {
        ...state,
        search: {
          ...state.search,
          lifeAreaResults: action.results,
        },
      };

    case 'SET_SEARCHING_LIFE_AREA':
      return {
        ...state,
        search: {
          ...state.search,
          isSearchingLifeArea: action.isSearching,
        },
      };

    case 'CLEAR_LIFE_AREA_SELECTION':
      return {
        ...state,
        search: {
          ...state.search,
          selectedLifeArea: null,
          lifeAreaResults: [],
          isSearchingLifeArea: false,
        },
      };

    // Import Queue
    case 'UPDATE_IMPORT_STATE':
      return {
        ...state,
        importState: {
          ...state.importState,
          queueState: action.queueState,
        },
      };

    case 'TOGGLE_IMPORT_PROGRESS':
      return {
        ...state,
        importState: {
          ...state.importState,
          showProgress: action.show,
        },
      };

    // Pagination
    case 'LOAD_MORE_START':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          isLoadingMore: true,
        },
      };

    case 'LOAD_MORE_SUCCESS': {
      const allVideos = [...state.videos, ...action.videos];
      const videosByDate = calculateVideosByDate(allVideos);

      return {
        ...state,
        videos: allVideos,
        videosByDate,
        pagination: {
          page: state.pagination.page + 1,
          hasMore: action.hasMore,
          isLoadingMore: false,
        },
      };
    }

    case 'LOAD_MORE_ERROR':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          isLoadingMore: false,
        },
      };

    case 'RESET_PAGINATION':
      return {
        ...state,
        pagination: {
          page: 0,
          hasMore: true,
          isLoadingMore: false,
        },
      };

    default:
      return state;
  }
}
