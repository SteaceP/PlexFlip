import { create } from "zustand";
import { PlexTv } from "../plex/plextv";
import { EventEmitter } from "events";
import { CloudService } from "../common/CloudService";
import { useUserSettings } from "./UserSettingsState";

export const WatchListCacheEmitter = new EventEmitter();

interface WatchListCacheState {
    watchListCache: Plex.Metadata[];
    setWatchListCache: (watchListCache: Plex.Metadata[]) => void;
    addItem: (item: Plex.Metadata) => void;
    removeItem: (item: string) => void;
    loadWatchListCache: () => void;
    syncWithCloud: () => Promise<void>;
    isOnWatchList: (item: string) => boolean;
}

export const useWatchListCache = create<WatchListCacheState>((set) => ({
    watchListCache: [],
    setWatchListCache: (watchListCache) => set({ watchListCache }),
    addItem: async (item) => {
        if (useWatchListCache.getState().watchListCache.includes(item)) return;
        await PlexTv.addToWatchlist(item.guid.split("/")[3]);

        if (useUserSettings.getState().settings["ENABLE_CLOUD_WATCHLIST"] === "true") {
            CloudService.addToWatchlist(item);
        }

        set((state) => ({ watchListCache: [item, ...state.watchListCache] }))
        WatchListCacheEmitter.emit("watchListUpdate", item);
    },
    removeItem: async (item) => {
        if (!useWatchListCache.getState().isOnWatchList(item)) return;
        await PlexTv.removeFromWatchlist(item.split("/")[3]);

        if (useUserSettings.getState().settings["ENABLE_CLOUD_WATCHLIST"] === "true") {
            CloudService.removeFromWatchlist(item);
        }

        set((state) => ({ watchListCache: state.watchListCache.filter((i) => i.guid !== item) }));
        WatchListCacheEmitter.emit("watchListUpdate", item);
    },
    loadWatchListCache: async () => {
        const watchList = await PlexTv.getWatchlist();
        let combined: Plex.Metadata[] = watchList ? [...watchList] : [];

        if (useUserSettings.getState().settings["ENABLE_CLOUD_WATCHLIST"] === "true") {
            try {
                const cloudItems = await CloudService.getWatchlist();
                if (cloudItems && cloudItems.length > 0) {
                    const existingGuids = new Set(combined.map((i) => i.guid));
                    for (const item of cloudItems) {
                        if (item?.guid && !existingGuids.has(item.guid)) {
                            combined.push(item);
                            existingGuids.add(item.guid);
                        }
                    }
                }
            } catch (err) {
                console.warn("Could not load cloud watchlist:", err);
            }
        }

        set({ watchListCache: combined });
    },
    syncWithCloud: async () => {
        const currentItems = useWatchListCache.getState().watchListCache;
        for (const item of currentItems) {
            if (item?.guid) {
                await CloudService.addToWatchlist(item);
            }
        }
        await useWatchListCache.getState().loadWatchListCache();
    },
    isOnWatchList: (item): boolean => useWatchListCache.getState().watchListCache.find((i) => i.guid === item) !== undefined,
}));