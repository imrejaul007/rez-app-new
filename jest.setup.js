// Mock expo-modules-core before any module loads (prevents EXDevLauncher undefined crash in Node env)
jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(() => ({})),
  NativeModulesProxy: {},
  __esModule: true,
}));

// Mock expo-secure-store (used by apiClient.ts) — needs expo-modules-core
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  __esModule: true,
}));

// Mock react-native/Libraries/Components/Pressable/Pressable — RN jest preset
// doesn't include it, causing "type is invalid: got undefined" in all component tests.
// Also mock its transitive dependencies to break the import chain.
jest.mock('react-native/Libraries/Pressability/PressabilityDebug', () => ({
  __esModule: true,
  PressabilityDebugView: null,
}));

jest.mock('react-native/Libraries/StyleSheet/normalizeColor', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@react-native/normalize-colors', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native/Libraries/StyleSheet/Rect', () => ({
  __esModule: true,
  RectOrSize: null,
  normalizeRect: () => ({}),
  default: null,
}));

jest.mock('react-native/Libraries/Pressability/usePressability', () => ({
  __esModule: true,
  default: () => ({}),
}));

jest.mock('react-native/Libraries/StyleSheet/processColor', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'ios' },
}));

jest.mock('react-native/Libraries/Utilities/useMergeRefs', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native/Libraries/Components/Pressable/Pressable', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => React.createElement('View', { ...props, ref })),
  };
});

// Mock apiClient singleton — must be here (before walletApi loads) to avoid
// "apiClient_1.default.get is not a function" due to module evaluation order.
// apiClient is captured at walletApi.ts import time; this ensures the mock is
// registered before walletApi.ts loads and captures the reference.
const mockApiClientGet = jest.fn();
const mockApiClientPost = jest.fn();
const mockApiClientPut = jest.fn();
const mockApiClientDelete = jest.fn();

jest.mock('@/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: mockApiClientGet,
    post: mockApiClientPost,
    put: mockApiClientPut,
    delete: mockApiClientDelete,
  },
}));

// Expose mocks globally so individual test files can configure them
global.__mockApiClient = {
  get: mockApiClientGet,
  post: mockApiClientPost,
  put: mockApiClientPut,
  delete: mockApiClientDelete,
};

// Mock expo-constants before any module loads (prevents NativeModules.EXDevLauncher crash in Node env)
jest.mock('expo-constants', () => ({
  default: {
    manifest: {},
    expoConfig: { extra: {} },
    sessionId: 'test-session-id',
    platform: 'ios',
    releaseId: 'test-release-id',
    version: '1.0.0',
    name: null,
    slug: null,
    runningSimulator: false,
    systemFonts: [],
    linkedRouter: false,
    design: { name: 'default' },
    appOwnership: 'expo',
    __unsafeNoWarnManifest: null,
    __unsafeNoWarnManifest2: null,
  },
  AppOwnership: { EXPO: 'expo', STANDALONE: 'standalone', ADHOC: 'adhoc', INVALID: null },
  ExecutionEnvironment: { BARE: 'bare', STANDALONE: 'standalone', UNKNOWN: 'unknown' },
  UserInterfaceIdiom: { PHONEPAD: 'phonepad', TABLETPAD: 'tabletpad', UNKNOWN: 'unknown' },
}));

// Import Jest Native matchers for @testing-library/react-native
import '@testing-library/jest-native/extend-expect';

// ============================================
// Mock AsyncStorage with actual storage implementation
// ============================================
const storage = new Map();

const mockAsyncStorage = {
  setItem: jest.fn((key, value) => {
    storage.set(key, value);
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => Promise.resolve(storage.get(key) || null)),
  removeItem: jest.fn((key) => {
    storage.delete(key);
    return Promise.resolve();
  }),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([key, value]) => storage.set(key, value));
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys) =>
    Promise.resolve(keys.map(key => [key, storage.get(key) || null]))
  ),
  multiRemove: jest.fn((keys) => {
    keys.forEach(key => storage.delete(key));
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    storage.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

// ============================================
// Mock Expo Clipboard
// ============================================
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('')),
  hasStringAsync: jest.fn(() => Promise.resolve(false)),
  setString: jest.fn(),
  getString: jest.fn(() => ''),
}));

// ============================================
// Mock NativeSettingsManager before react-native
// ============================================
jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  __esModule: true,
  default: {
    getConstants: jest.fn(() => ({ settings: {} })),
    setValues: jest.fn(),
    deleteValues: jest.fn(),
  },
}));

// ============================================
// Mock React Native modules
// ============================================
// NOTE: RN 0.79 uses TurboModules (DevMenu, etc.) that are unavailable in a
// Node test environment. Calling jest.requireActual('react-native') or
// jest.requireMock('react-native') inside a jest.mock('react-native') factory
// causes either an Invariant Violation or infinite recursion.
// The jest-expo preset provides a complete react-native mock — we rely on that
// and patch individual sub-APIs where tests need specific behavior.
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(() =>
    Promise.resolve({ action: 'sharedAction', activityType: null })
  ),
  sharedAction: 'sharedAction',
  dismissedAction: 'dismissedAction',
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// ============================================
// Mock Expo Router
// ============================================
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  useSegments: jest.fn(() => []),
  Stack: {
    Screen: jest.fn(({ children }) => children),
  },
  Link: jest.fn(({ children }) => children),
  Redirect: jest.fn(() => null),
}));

// ============================================
// Mock Expo Linear Gradient
// ============================================
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: jest.fn(({ children }) => children),
}));

// ============================================
// Mock Expo Vector Icons
// ============================================
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  Feather: 'Feather',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

// ============================================
// Mock Expo Status Bar
// ============================================
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// ============================================
// Mock Expo Font
// ============================================
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// ============================================
// Mock Expo Splash Screen
// ============================================
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// ============================================
// Mock Expo Linking
// ============================================
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `exp://localhost:8081/${path}`),
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// ============================================
// Mock NetInfo
// ============================================
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
}));

// ============================================
// Mock Socket.io Client
// ============================================
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  };
  return {
    io: jest.fn(() => mockSocket),
  };
});

// ============================================
// Mock Expo Camera
// ============================================
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
    getCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
  },
}));

// ============================================
// Mock Expo Location
// ============================================
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 28.7041,
        longitude: 77.1025,
        accuracy: 10,
      },
    })
  ),
}));

// ============================================
// Mock Expo Notifications
// ============================================
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'ExponentPushToken[test]' })
  ),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// ============================================
// Mock Stripe React Native
// ============================================
jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: jest.fn(({ children }) => children),
  CardField: jest.fn(() => null),
  useStripe: jest.fn(() => ({
    confirmPayment: jest.fn(() => Promise.resolve({ paymentIntent: {} })),
    createPaymentMethod: jest.fn(() => Promise.resolve({ paymentMethod: {} })),
  })),
}));

// ============================================
// Mock Reanimated
// ============================================
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// ============================================
// Mock Gesture Handler
// ============================================
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn((Component) => Component),
    Directions: {},
  };
});

// ============================================
// Mock React Navigation
// ============================================
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  useFocusEffect: jest.fn(),
}));

// ============================================
// Silence the warning: Animated: `useNativeDriver` is not supported
// ============================================
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// ============================================
// Mock React Native modules
// ============================================
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// ============================================
// Global test timeout
// ============================================
jest.setTimeout(10000);

// ============================================
// Console error/warning suppression for known issues
// ============================================
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('Not implemented: HTMLFormElement'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('componentWillReceiveProps') ||
      args[0].includes('componentWillMount'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// ============================================
// Clear all mocks after each test
// ============================================
afterEach(() => {
  jest.clearAllMocks();
  storage.clear();
});

