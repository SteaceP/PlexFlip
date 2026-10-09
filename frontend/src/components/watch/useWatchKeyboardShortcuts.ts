import { useEffect } from "react";
import { queryBuilder } from "../../plex/QuickFunctions";
import ReactPlayer from "../../common/ReactPlayer";
import { Socket } from "socket.io-client";

interface UseWatchKeyboardShortcutsOptions {
  togglePlay: () => void;
  playerRef: React.RefObject<ReactPlayer | null>;
  metadata: Plex.Metadata | null;
  playQueue: Plex.Metadata[] | null;
  socket?: Socket | null;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  navigate: (path: string) => void;
}

export function useWatchKeyboardShortcuts({
  togglePlay,
  playerRef,
  metadata,
  playQueue,
  socket,
  setVolume,
  navigate,
}: UseWatchKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const actions: { [key: string]: () => void } = {
        " ": () => togglePlay(),
        k: () => togglePlay(),
        j: () => {
          const l = playerRef.current?.getCurrentTime() ?? 0;
          playerRef.current?.seekTo(l - 10);
          socket?.emit("EVNT_SYNC_SEEK", l - 10);
        },
        l: () => {
          const l = playerRef.current?.getCurrentTime() ?? 0;
          playerRef.current?.seekTo(l + 10);
          socket?.emit("EVNT_SYNC_SEEK", l + 10);
        },
        s: () => {
          if (!metadata || !playerRef.current) return;
          const time = playerRef.current.getCurrentTime();
          for (const marker of metadata.Marker ?? []) {
            if (
              !(
                marker.startTimeOffset / 1000 <= time &&
                marker.endTimeOffset / 1000 >= time
              )
            )
              continue;

            switch (marker.type) {
              case "credits":
                {
                  if (!marker.final) {
                    playerRef.current.seekTo(marker.endTimeOffset / 1000 + 1);
                    return;
                  }

                  if (metadata.type === "movie") {
                    return navigate(
                      `/browse/${metadata.librarySectionID}?${queryBuilder({
                        mid: metadata.ratingKey,
                      })}`,
                    );
                  }

                  if (!playQueue) return;
                  const next = playQueue[1];
                  if (!next) {
                    return navigate(
                      `/browse/${metadata.librarySectionID}?${queryBuilder({
                        mid: metadata.grandparentRatingKey,
                        pid: metadata.parentRatingKey,
                        iid: metadata.ratingKey,
                      })}`,
                    );
                  }

                  navigate(`/watch/${next.ratingKey}`);
                }
                break;
              case "intro":
                playerRef.current.seekTo(marker.endTimeOffset / 1000 + 1);
                break;
            }
          }
        },
        f: () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        },
        ArrowLeft: () => {
          const l = playerRef.current?.getCurrentTime() ?? 0;
          playerRef.current?.seekTo(l - 10);
          socket?.emit("EVNT_SYNC_SEEK", l - 10);
        },
        ArrowRight: () => {
          const l = playerRef.current?.getCurrentTime() ?? 0;
          playerRef.current?.seekTo(l + 10);
          socket?.emit("EVNT_SYNC_SEEK", l + 10);
        },
        ArrowUp: () => setVolume((state) => Math.min(state + 5, 100)),
        ArrowDown: () => setVolume((state) => Math.max(state - 5, 0)),
        ",": () => {
          const l = playerRef.current?.getCurrentTime() ?? 0;
          playerRef.current?.seekTo(l - 0.04);
          socket?.emit("EVNT_SYNC_SEEK", l - 0.04);
        },
        ".": () => {
          const l = playerRef.current?.getCurrentTime() ?? 0;
          playerRef.current?.seekTo(l + 0.04);
          socket?.emit("EVNT_SYNC_SEEK", l + 0.04);
        },
      };

      if (actions[e.key]) actions[e.key]();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [metadata, navigate, playQueue, socket, togglePlay, playerRef, setVolume]);
}

export default useWatchKeyboardShortcuts;
