import assert from 'node:assert/strict';
import { test } from 'node:test';
import Module from 'node:module';

const openedUrls: string[] = [];
const storage = new Map<string, string>();

const moduleStubs: Record<string, unknown> = {
  'react-native': {
    Platform: { OS: 'ios' },
    Linking: {
      openURL: async (url: string) => {
        openedUrls.push(url);
      },
    },
  },
  '@react-native-async-storage/async-storage': {
    __esModule: true,
    default: {
      getItem: async (key: string) => storage.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  },
  'expo-constants': {
    __esModule: true,
    default: {
      expoConfig: {
        extra: {
          iosAppStoreId: '6761516426',
          androidPackage: 'com.snaproad.app',
        },
      },
    },
  },
};

const modProto = Module as unknown as {
  _load: (req: string, parent: unknown, isMain: boolean) => unknown;
};
const origLoad = modProto._load;
modProto._load = function patched(request: string, parent: unknown, isMain: boolean) {
  if (request === 'expo-store-review') {
    throw new Error('native module missing in current build');
  }
  if (Object.prototype.hasOwnProperty.call(moduleStubs, request)) {
    return moduleStubs[request];
  }
  return origLoad.call(this, request, parent, isMain);
};

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const storeReview = require('./storeReview') as typeof import('./storeReview');

test('store review helper does not crash when native module is missing', async () => {
  await storeReview.maybeRequestStoreReviewAfterTrip({
    counted: true,
    isNavigating: false,
    distanceMiles: 8,
  });

  assert.equal(storage.size, 0, 'missing native module should no-op before changing prompt cadence');
});

test('store review page falls back to configured iOS write-review URL', async () => {
  openedUrls.length = 0;
  await storeReview.openStoreReviewPage();

  assert.equal(
    openedUrls[0],
    'itms-apps://itunes.apple.com/app/viewContentsUserReviews/id6761516426?action=write-review',
  );
});
