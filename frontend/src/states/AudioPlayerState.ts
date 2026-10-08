import { create } from "zustand";
import { authedGet, getXPlexProps, queryBuilder } from "../plex/QuickFunctions";
import { getBackendURL } from "../backendURL";

export type RepeatMode = "off" | "all" | "one";

export interface AudioPlayerState {
  currentTrack: Plex.Metadata | null;
  queue: Plex.Metadata[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  originalQueue: Plex.Metadata[];
  isQueueOpen: boolean;
  isNowPlayingOpen: boolean;

  // Actions
  playTrack: (track: Plex.Metadata, queue?: Plex.Metadata[]) => void;
  playAlbum: (album: Plex.Metadata, tracks: Plex.Metadata[], startIndex?: number) => void;
  addToQueue: (items: Plex.Metadata | Plex.Metadata[]) => void;
  playNext: (items: Plex.Metadata | Plex.Metadata[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  clearQueue: () => void;
  removeFromQueue: (index: number) => void;
  setQueueOpen: (open: boolean) => void;
  setNowPlayingOpen: (open: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  scrobbleCurrentTrack: () => void;
}

export function getTrackStreamURL(track: Plex.Metadata): string {
  const partKey = track.Media?.[0]?.Part?.[0]?.key;
  if (!partKey) return "";
  return `${getBackendURL()}/dynproxy${partKey}?${queryBuilder({
    ...getXPlexProps(),
  })}`;
}

export const useAudioPlayerStore = create<AudioPlayerState>((set, get) => {
  const savedVol = parseFloat(localStorage.getItem("audio_player_volume") ?? "0.8");
  const initialVolume = isNaN(savedVol) ? 0.8 : Math.max(0, Math.min(1, savedVol));

  return {
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: initialVolume,
    isMuted: false,
    repeatMode: "off",
    isShuffled: false,
    originalQueue: [],
    isQueueOpen: false,
    isNowPlayingOpen: false,

    playTrack: (track, queue) => {
      const q = queue && queue.length > 0 ? queue : [track];
      const index = q.findIndex((t) => t.ratingKey === track.ratingKey);
      const queueIndex = index >= 0 ? index : 0;

      set({
        currentTrack: track,
        queue: q,
        queueIndex,
        originalQueue: [...q],
        isPlaying: true,
        currentTime: 0,
        duration: (track.duration ? track.duration / 1000 : 0),
      });
    },

    playAlbum: (album, tracks, startIndex = 0) => {
      if (!tracks || tracks.length === 0) return;
      const validIndex = Math.max(0, Math.min(tracks.length - 1, startIndex));
      const trackToPlay = tracks[validIndex];

      // Enrich tracks with parent metadata if missing
      const enrichedTracks = tracks.map((t) => ({
        ...t,
        parentTitle: t.parentTitle || album.title,
        parentRatingKey: t.parentRatingKey || album.ratingKey,
        parentThumb: t.parentThumb || album.thumb,
        grandparentTitle: t.grandparentTitle || album.parentTitle,
        grandparentRatingKey: t.grandparentRatingKey || album.parentRatingKey,
        thumb: t.thumb || album.thumb,
      }));

      set({
        currentTrack: enrichedTracks[validIndex],
        queue: enrichedTracks,
        queueIndex: validIndex,
        originalQueue: [...enrichedTracks],
        isPlaying: true,
        currentTime: 0,
        duration: (trackToPlay.duration ? trackToPlay.duration / 1000 : 0),
      });
    },

    addToQueue: (items) => {
      const newItems = Array.isArray(items) ? items : [items];
      set((state) => {
        const updatedQueue = [...state.queue, ...newItems];
        return {
          queue: updatedQueue,
          originalQueue: [...state.originalQueue, ...newItems],
        };
      });
    },

    playNext: (items) => {
      const newItems = Array.isArray(items) ? items : [items];
      set((state) => {
        const nextIndex = state.queueIndex + 1;
        const updatedQueue = [
          ...state.queue.slice(0, nextIndex),
          ...newItems,
          ...state.queue.slice(nextIndex),
        ];
        return {
          queue: updatedQueue,
          originalQueue: [...state.originalQueue, ...newItems],
        };
      });
    },

    togglePlay: () => {
      set((state) => ({ isPlaying: !state.isPlaying }));
    },

    pause: () => {
      set({ isPlaying: false });
    },

    resume: () => {
      if (get().currentTrack) {
        set({ isPlaying: true });
      }
    },

    nextTrack: () => {
      const { queue, queueIndex, repeatMode } = get();
      if (queue.length === 0) return;

      if (queueIndex < queue.length - 1) {
        const nextIdx = queueIndex + 1;
        const nextTrack = queue[nextIdx];
        set({
          currentTrack: nextTrack,
          queueIndex: nextIdx,
          isPlaying: true,
          currentTime: 0,
          duration: (nextTrack.duration ? nextTrack.duration / 1000 : 0),
        });
      } else if (repeatMode === "all") {
        const nextTrack = queue[0];
        set({
          currentTrack: nextTrack,
          queueIndex: 0,
          isPlaying: true,
          currentTime: 0,
          duration: (nextTrack.duration ? nextTrack.duration / 1000 : 0),
        });
      } else {
        set({ isPlaying: false, currentTime: 0 });
      }
    },

    previousTrack: () => {
      const { queue, queueIndex, currentTime } = get();
      if (queue.length === 0) return;

      // If more than 3 seconds in, restart track
      if (currentTime > 3) {
        set({ currentTime: 0 });
        const audioEl = document.getElementById("plexflip-audio-player") as HTMLAudioElement | null;
        if (audioEl) audioEl.currentTime = 0;
        return;
      }

      if (queueIndex > 0) {
        const prevIdx = queueIndex - 1;
        const prevTrack = queue[prevIdx];
        set({
          currentTrack: prevTrack,
          queueIndex: prevIdx,
          isPlaying: true,
          currentTime: 0,
          duration: (prevTrack.duration ? prevTrack.duration / 1000 : 0),
        });
      } else {
        set({ currentTime: 0 });
        const audioEl = document.getElementById("plexflip-audio-player") as HTMLAudioElement | null;
        if (audioEl) audioEl.currentTime = 0;
      }
    },

    seek: (time) => {
      set({ currentTime: time });
      const audioEl = document.getElementById("plexflip-audio-player") as HTMLAudioElement | null;
      if (audioEl) {
        audioEl.currentTime = time;
      }
    },

    setVolume: (volume) => {
      const clamped = Math.max(0, Math.min(1, volume));
      localStorage.setItem("audio_player_volume", clamped.toString());
      set({ volume: clamped, isMuted: clamped === 0 });
      const audioEl = document.getElementById("plexflip-audio-player") as HTMLAudioElement | null;
      if (audioEl) {
        audioEl.volume = clamped;
        audioEl.muted = clamped === 0;
      }
    },

    toggleMute: () => {
      set((state) => {
        const newMuted = !state.isMuted;
        const audioEl = document.getElementById("plexflip-audio-player") as HTMLAudioElement | null;
        if (audioEl) {
          audioEl.muted = newMuted;
        }
        return { isMuted: newMuted };
      });
    },

    toggleRepeat: () => {
      set((state) => {
        const modes: RepeatMode[] = ["off", "all", "one"];
        const nextIdx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
        return { repeatMode: modes[nextIdx] };
      });
    },

    toggleShuffle: () => {
      set((state) => {
        const willShuffle = !state.isShuffled;
        if (willShuffle) {
          // Keep current playing track at index 0, shuffle the rest
          const remaining = state.queue.filter((_, idx) => idx !== state.queueIndex);
          for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
          }
          const current = state.queue[state.queueIndex];
          const newQueue = current ? [current, ...remaining] : remaining;
          return {
            isShuffled: true,
            queue: newQueue,
            queueIndex: 0,
          };
        } else {
          // Restore original queue
          const current = state.currentTrack;
          const origIdx = state.originalQueue.findIndex((t) => t.ratingKey === current?.ratingKey);
          return {
            isShuffled: false,
            queue: [...state.originalQueue],
            queueIndex: origIdx >= 0 ? origIdx : 0,
          };
        }
      });
    },

    clearQueue: () => {
      set({
        queue: [],
        originalQueue: [],
        queueIndex: 0,
        currentTrack: null,
        isPlaying: false,
      });
    },

    removeFromQueue: (index) => {
      set((state) => {
        if (index === state.queueIndex) {
          // If removing currently playing track, move to next
          const newQueue = state.queue.filter((_, i) => i !== index);
          if (newQueue.length === 0) {
            return {
              queue: [],
              originalQueue: [],
              queueIndex: 0,
              currentTrack: null,
              isPlaying: false,
            };
          }
          const nextIdx = Math.min(index, newQueue.length - 1);
          return {
            queue: newQueue,
            queueIndex: nextIdx,
            currentTrack: newQueue[nextIdx],
          };
        }
        const newQueue = state.queue.filter((_, i) => i !== index);
        const newIndex = index < state.queueIndex ? state.queueIndex - 1 : state.queueIndex;
        return {
          queue: newQueue,
          queueIndex: newIndex,
        };
      });
    },

    setQueueOpen: (open) => set({ isQueueOpen: open }),
    setNowPlayingOpen: (open) => set({ isNowPlayingOpen: open }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setDuration: (duration) => set({ duration }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    scrobbleCurrentTrack: () => {
      const { currentTrack } = get();
      if (!currentTrack?.ratingKey) return;
      authedGet(`/:/scrobble?${queryBuilder({
        key: currentTrack.ratingKey,
        identifier: "com.plexapp.plugins.library",
        ...getXPlexProps(),
      })}`).catch((err) => console.log("Audio scrobble error:", err));
    },
  };
});
