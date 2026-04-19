import { useCallback, useEffect, useRef, useState } from 'react';
import MapboxGL from '../utils/mapbox';

type OfflinePack = Awaited<
  ReturnType<NonNullable<typeof MapboxGL>['offlineManager']['getPacks']>
>[number];

const DEFAULT_STYLE_URL = 'mapbox://styles/mapbox/streets-v12';
const DEFAULT_MIN_ZOOM = 12;
const DEFAULT_MAX_ZOOM = 18;

export function useOfflineMaps() {
  const [packs, setPacks] = useState<OfflinePack[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const activePackRef = useRef<string | null>(null);
  const noopAsync = useCallback(async () => {}, []);

  const refreshPacks = useCallback(async () => {
    if (!MapboxGL) {
      setPacks([]);
      return;
    }
    const list = await MapboxGL.offlineManager.getPacks();
    setPacks(list);
  }, []);

  useEffect(() => {
    void refreshPacks();
  }, [refreshPacks]);

  useEffect(() => {
    return () => {
      if (MapboxGL && activePackRef.current) {
        MapboxGL.offlineManager.unsubscribe(activePackRef.current);
        activePackRef.current = null;
      }
    };
  }, []);

  const downloadRegion = useCallback(
    async (
      name: string,
      bounds: { ne: [number, number]; sw: [number, number] },
      minZoom: number = DEFAULT_MIN_ZOOM,
      maxZoom: number = DEFAULT_MAX_ZOOM,
    ) => {
      if (!MapboxGL) return;

      const offlineManager = MapboxGL.offlineManager;
      const completeState = MapboxGL.OfflinePackDownloadState.Complete;

      await new Promise<void>((resolve, reject) => {
        activePackRef.current = name;
        setDownloading(true);
        setProgress(0);

        const progressListener = (_pack: OfflinePack, status: { name: string; state: number; percentage: number }) => {
          if (status.name !== name) return;
          const pct = Math.round(Math.min(100, Math.max(0, status.percentage)));
          setProgress(pct);
          if (status.state === completeState) {
            activePackRef.current = null;
            setDownloading(false);
            setProgress(100);
            void refreshPacks();
            resolve();
          }
        };

        const errorListener = (_pack: OfflinePack, err: { name: string; message: string }) => {
          if (err.name !== name) return;
          activePackRef.current = null;
          setDownloading(false);
          setProgress(0);
          reject(new Error(err.message));
        };

        offlineManager
          .createPack(
            {
              name,
              styleURL: DEFAULT_STYLE_URL,
              minZoom,
              maxZoom,
              bounds: [bounds.ne, bounds.sw],
            },
            progressListener,
            errorListener,
          )
          .catch((e: unknown) => {
            activePackRef.current = null;
            setDownloading(false);
            setProgress(0);
            reject(e instanceof Error ? e : new Error(String(e)));
          });
      });
    },
    [refreshPacks],
  );

  const deleteRegion = useCallback(
    async (name: string) => {
      if (!MapboxGL) return;
      await MapboxGL.offlineManager.deletePack(name);
      await refreshPacks();
    },
    [refreshPacks],
  );

  if (!MapboxGL) {
    return {
      packs,
      downloading: false,
      progress: 0,
      downloadRegion: noopAsync,
      deleteRegion: noopAsync,
      refreshPacks,
    };
  }

  return {
    packs,
    downloading,
    progress,
    downloadRegion,
    deleteRegion,
    refreshPacks,
  };
}
