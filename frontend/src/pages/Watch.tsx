import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getLibraryDir,
  getLibraryMeta,
  getLibraryMetaChildren,
  getPlayQueue,
  getServerPreferences,
  getTimelineUpdate,
  getUniversalDecision,
  sendUniversalPing,
} from "../plex";
import CenteredSpinner from "../components/CenteredSpinner";
import { Box } from "@mui/material";
import ReactPlayer from "../common/ReactPlayer";
import {
  getIncludeProps,
  queryBuilder,
} from "../plex/QuickFunctions";
import { useSessionStore } from "../states/SessionState";
import {
  SessionStateEmitter,
  useSyncSessionState,
} from "../states/SyncSessionState";
import { useSyncInterfaceState } from "../components/PlexFlipSync";
import { absoluteDifference } from "../common/NumberExtra";
import {
  autoMatchMediaTracks,
  getCurrentVideoLevels,
  getFormatedTime,
  getWatchUrl,
  QualityState,
  useWatchKeyboardShortcuts,
  WatchControlsOverlay,
  WatchErrorBackdrop,
  WatchInfoOverlay,
  WatchMarkerButtons,
  WatchTunePopover,
} from "../components/watch";

let SessionID = "";
export { SessionID, getFormatedTime, getCurrentVideoLevels };

function Watch() {
  const { itemID } = useParams<{ itemID: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const { sessionID } = useSessionStore();

  const [metadata, setMetadata] = useState<Plex.Metadata | null>(null);
  const [showmetadata, setShowMetadata] = useState<Plex.Metadata | null>(null);
  const [playQueue, setPlayQueue] = useState<Plex.Metadata[] | null>(null);
  const player = useRef<ReactPlayer | null>(null);

  const [quality, setQuality] = useState<QualityState>({
    ...(localStorage.getItem("quality") && {
      bitrate: parseInt(localStorage.getItem("quality") ?? "10000"),
    }),
  });

  const [volume, setVolume] = useState<number>(
    parseInt(localStorage.getItem("volume") ?? "100"),
  );

  const lastAppliedTime = useRef<number>(0);
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(playing);
  const [, setReady] = useState(false);
  const seekToAfterLoad = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);

  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [showTune, setShowTune] = useState(false);
  const tuneButtonRef = useRef<HTMLButtonElement | null>(null);

  const playbackBarRef = useRef<HTMLDivElement | null>(null);

  const [buffering, setBuffering] = useState(false);
  const [showError, setShowError] = useState<string | false>(false);

  const { room, socket, isHost } = useSyncSessionState();
  const { setOpen: setSyncInterfaceOpen } = useSyncInterfaceState();

  const [controlElementsVisible, setControlElementsVisible] = useState(false);

  useEffect(() => {
    setControlElementsVisible(isVolumeOpen || showTune);
  }, [isVolumeOpen, showTune]);

  const loadMetadata = useCallback(
    async (targetItemID: string) => {
      let loadedMeta: Plex.Metadata | null = null;
      try {
        const mediacontainer = await getLibraryDir(
          `/library/metadata/${targetItemID}`,
          {
            ...getIncludeProps(),
          },
        );
        loadedMeta = mediacontainer.Metadata?.[0] ?? null;
        if (!loadedMeta) return;

        if (loadedMeta.type === "show") {
          const show = await getLibraryMeta(targetItemID);
          if (show?.OnDeck?.Metadata?.ratingKey) {
            navigate(
              `/watch/${show.OnDeck.Metadata.ratingKey}${
                show.OnDeck.Metadata.viewOffset
                  ? `?t=${show.OnDeck.Metadata.viewOffset}`
                  : ""
              }`,
              { replace: true },
            );
            return;
          }
          const seasons = await getLibraryMetaChildren(targetItemID);
          if (seasons && seasons.length > 0) {
            const episodes = await getLibraryMetaChildren(seasons[0].ratingKey);
            if (episodes && episodes.length > 0) {
              navigate(`/watch/${episodes[0].ratingKey}`, { replace: true });
              return;
            }
          }
          return;
        }

        if (loadedMeta.type === "season") {
          const episodes = await getLibraryMetaChildren(targetItemID);
          if (episodes && episodes.length > 0) {
            navigate(`/watch/${episodes[0].ratingKey}`, { replace: true });
            return;
          }
          return;
        }

        if (["movie", "episode"].includes(loadedMeta.type as string)) {
          setMetadata(loadedMeta);
          if (loadedMeta.type === "episode") {
            getLibraryMeta(loadedMeta.grandparentRatingKey as string).then(
              (show) => {
                setShowMetadata(show);
              },
            );
          }
        } else {
          console.error("Invalid metadata type");
        }
      } catch (e) {
        console.error("Error loading library metadata:", e);
        return;
      }

      if (!loadedMeta) return;

      try {
        await getUniversalDecision(targetItemID, {
          maxVideoBitrate: quality.bitrate,
          autoAdjustQuality: quality.auto,
        });
      } catch (e) {
        console.warn("getUniversalDecision warning:", e);
      }
      const serverPreferences = await getServerPreferences();

      getPlayQueue(
        `server://${serverPreferences.machineIdentifier}/com.plexapp.plugins.library/library/metadata/${loadedMeta.ratingKey}`,
      ).then((queue) => {
        setPlayQueue(queue);
      });
    },
    [navigate, quality.auto, quality.bitrate],
  );

  const [url, setURL] = useState<string>("");
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const whenMouseMoves = () => {
      clearTimeout(timeout);
      setShowControls(true);
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    };

    document.addEventListener("mousemove", whenMouseMoves);
    return () => {
      document.removeEventListener("mousemove", whenMouseMoves);
    };
  }, [playing]);

  const [showInfo, setShowInfo] = useState(false);
  const showInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    playingRef.current = playing;
    if (showInfoTimeoutRef.current) {
      clearTimeout(showInfoTimeoutRef.current);
      showInfoTimeoutRef.current = null;
    }

    if (!playingRef.current) {
      showInfoTimeoutRef.current = setTimeout(() => {
        if (!playingRef.current) setShowInfo(true);
      }, 5000);
    } else {
      setShowInfo(false);
    }

    return () => {
      if (showInfoTimeoutRef.current) {
        clearTimeout(showInfoTimeoutRef.current);
        showInfoTimeoutRef.current = null;
      }
    };
  }, [playing]);

  useEffect(() => {
    if (!playing) return;

    if (showControls) document.body.style.cursor = "default";
    else document.body.style.cursor = "none";

    return () => {
      document.body.style.cursor = "default";
    };
  }, [playing, showControls]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!itemID) return;
      await sendUniversalPing();
    }, 10000);

    if (itemID && isHost) {
      socket?.emit("RES_SYNC_SET_PLAYBACK", {
        key: itemID,
        state: playing ? "playing" : "paused",
        time: player.current?.getCurrentTime() ?? 0,
      } satisfies PlexFlip.Sync.PlayBackState);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isHost, itemID, playing, socket]);

  useEffect(() => {
    if (!socket || !room) return;

    const resyncInterval = setInterval(async () => {
      if (!itemID || !socket || !isHost) return;

      socket.emit("RES_SYNC_RESYNC_PLAYBACK", {
        key: itemID,
        state: playing ? "playing" : "paused",
        time: player.current?.getCurrentTime() ?? 0,
      } satisfies PlexFlip.Sync.PlayBackState);
    }, 2500);

    const resyncPlayback = async (data: PlexFlip.Sync.PlayBackState) => {
      if (data.key !== itemID) {
        navigate(`/watch/${data.key}?t=${Math.floor((data.time ?? 0) * 1000)}`);
        return;
      }

      if (data.time) {
        const dif = absoluteDifference(
          player.current?.getCurrentTime() ?? 0,
          data.time,
        );

        if (dif > 2) player.current?.seekTo(data.time, "seconds");
      }

      if (data.state === "playing") setPlaying(true);
      if (data.state === "paused") setPlaying(false);
    };

    const endPlayback = async () => {
      navigate("/sync/waitingroom");
    };

    const pausePlayback = async () => {
      setPlaying(false);
    };
    const resumePlayback = async () => {
      setPlaying(true);
    };
    const seekPlayback = async (time: number) => {
      player.current?.seekTo(time, "seconds");
    };

    if (!isHost) SessionStateEmitter.on("PLAYBACK_RESYNC", resyncPlayback);
    if (!isHost) SessionStateEmitter.on("PLAYBACK_END", endPlayback);

    SessionStateEmitter.on("PLAYBACK_PAUSE", pausePlayback);
    SessionStateEmitter.on("PLAYBACK_RESUME", resumePlayback);
    SessionStateEmitter.on("PLAYBACK_SEEK", seekPlayback);

    return () => {
      SessionStateEmitter.off("PLAYBACK_RESYNC", resyncPlayback);
      SessionStateEmitter.off("PLAYBACK_END", endPlayback);

      SessionStateEmitter.off("PLAYBACK_PAUSE", pausePlayback);
      SessionStateEmitter.off("PLAYBACK_RESUME", resumePlayback);
      SessionStateEmitter.off("PLAYBACK_SEEK", seekPlayback);

      clearInterval(resyncInterval);
    };
  }, [isHost, itemID, navigate, playing, room, socket]);

  useEffect(() => {
    if (!itemID) return;

    const updateTimeline = async () => {
      if (!player.current) return;
      const timelineUpdateData = await getTimelineUpdate(
        parseInt(itemID),
        Math.floor(player.current.getDuration()) * 1000,
        buffering ? "buffering" : playing ? "playing" : "paused",
        Math.floor(player.current.getCurrentTime()) * 1000,
      );

      if (!timelineUpdateData) return;

      const { terminationCode, terminationText } =
        timelineUpdateData.MediaContainer;
      if (terminationCode) {
        setShowError(`${terminationCode} - ${terminationText}`);
        setPlaying(false);
        socket?.emit("EVNT_SYNC_PAUSE");
      }
    };

    const updateInterval = setInterval(updateTimeline, 5000);

    return () => clearInterval(updateInterval);
  }, [buffering, itemID, playing, socket]);

  useEffect(() => {
    (async () => {
      setReady(false);

      if (!itemID) return;

      const loadedMeta = await getLibraryMeta(itemID);
      await autoMatchMediaTracks(loadedMeta);

      console.log(`Setting URL: ${getWatchUrl(loadedMeta, quality)}`);

      await loadMetadata(itemID);
      setURL(getWatchUrl(loadedMeta, quality));
      setShowError(false);
    })();
  }, [itemID, loadMetadata, quality]);

  useEffect(() => {
    SessionID = sessionID;
  }, [sessionID]);

  const togglePlay = useCallback(() => {
    const internalPlayer = player.current?.getInternalPlayer() as HTMLVideoElement | null;
    const isPaused = internalPlayer ? internalPlayer.paused : !playing;
    if (isPaused) {
      setPlaying(true);
      socket?.emit("EVNT_SYNC_RESUME");
      internalPlayer?.play().catch(() => {});
    } else {
      setPlaying(false);
      socket?.emit("EVNT_SYNC_PAUSE");
      internalPlayer?.pause();
    }
  }, [playing, socket]);

  useWatchKeyboardShortcuts({
    togglePlay,
    playerRef: player,
    metadata,
    playQueue,
    socket,
    setVolume,
    navigate,
  });

  const handleBack = () => {
    if (room && !isHost) socket?.disconnect();
    if (room && isHost) socket?.emit("RES_SYNC_PLAYBACK_END");

    if (itemID && player.current) {
      getTimelineUpdate(
        parseInt(itemID),
        Math.floor(player.current?.getDuration() * 1000),
        "stopped",
        Math.floor(player.current?.getCurrentTime() * 1000),
      );
    }

    if (!metadata) return navigate("/");

    if (metadata.type === "movie") {
      navigate(
        `/browse/${metadata.librarySectionID}?${queryBuilder({
          mid: metadata.ratingKey,
        })}`,
      );
    } else if (metadata.type === "episode") {
      navigate(
        `/browse/${metadata.librarySectionID}?${queryBuilder({
          mid: metadata.grandparentRatingKey,
        })}`,
      );
    } else {
      navigate("/");
    }
  };

  const handleStreamReload = (
    meta: Plex.Metadata,
    targetQuality: QualityState,
  ) => {
    setURL("");
    setTimeout(() => {
      setURL(getWatchUrl(meta, targetQuality));
    }, 100);
  };

  return (
    <>
      <WatchErrorBackdrop
        error={showError}
        onClose={() => setShowError(false)}
        metadata={metadata}
        playerRef={player}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: buffering ? "flex" : "none",
            zIndex: 2,
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <CenteredSpinner />
        </Box>

        <WatchInfoOverlay
          showInfo={showInfo}
          metadata={metadata}
          showmetadata={showmetadata}
        />

        <WatchTunePopover
          open={showTune}
          anchorEl={tuneButtonRef.current}
          onClose={() => setShowTune(false)}
          metadata={metadata}
          itemID={itemID}
          quality={quality}
          onQualityChange={setQuality}
          loadMetadata={loadMetadata}
          playerRef={player}
          seekToAfterLoadRef={seekToAfterLoad}
          onStreamReload={handleStreamReload}
        />

        {!metadata ? (
          <CenteredSpinner />
        ) : (
          <>
            <WatchMarkerButtons
              metadata={metadata}
              progress={progress}
              room={room}
              isHost={isHost}
              playerRef={player}
              playbackBarRef={playbackBarRef}
              playQueue={playQueue}
              navigate={navigate}
              playing={playing}
            />

            <WatchControlsOverlay
              showControls={showControls}
              playing={playing}
              controlElementsVisible={controlElementsVisible}
              metadata={metadata}
              playQueue={playQueue}
              progress={progress}
              buffered={buffered}
              duration={player.current?.getDuration() ?? 0}
              volume={volume}
              onVolumeChange={setVolume}
              onTogglePlay={togglePlay}
              onSeek={(seconds) => {
                player.current?.seekTo(seconds);
                socket?.emit("EVNT_SYNC_SEEK", seconds);
              }}
              playbackBarRef={playbackBarRef}
              tuneButtonRef={tuneButtonRef}
              onToggleTune={(btn) => {
                tuneButtonRef.current = btn;
                setShowTune((prev) => !prev);
              }}
              onOpenSync={() => setSyncInterfaceOpen(true)}
              room={room}
              isHost={isHost}
              controlElementsVisibleState={[
                controlElementsVisible,
                setControlElementsVisible,
              ]}
              onVolumePopoverChange={setIsVolumeOpen}
              onBack={handleBack}
            />

            <ReactPlayer
              ref={player}
              playing={playing}
              volume={volume / 100}
              progressInterval={500}
              onClick={(e: MouseEvent) => {
                e.preventDefault();

                switch (e.detail) {
                  case 1:
                    togglePlay();
                    break;
                  case 2:
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen();
                      setPlaying(true);
                      socket?.emit("EVNT_SYNC_RESUME");
                    } else {
                      document.exitFullscreen();
                    }
                    break;
                  default:
                    break;
                }
              }}
              onReady={() => {
                if (!player.current) return;
                setReady(true);

                if (seekToAfterLoad.current !== null) {
                  player.current.seekTo(seekToAfterLoad.current);
                  seekToAfterLoad.current = null;
                }

                const seekTo = params.has("t")
                  ? parseInt(params.get("t") as string)
                  : ((metadata?.viewOffset && metadata?.viewOffset > 5000
                      ? metadata?.viewOffset
                      : null) ?? null);

                if (!seekTo) return;
                if (lastAppliedTime.current === seekTo) return;
                player.current.seekTo(seekTo / 1000);
                lastAppliedTime.current = seekTo;
              }}
              onProgress={(prog) => {
                setProgress(prog.playedSeconds);
                setBuffered(prog.loadedSeconds);
              }}
              onPause={() => {
                setPlaying(false);
              }}
              onPlay={() => {
                setPlaying(true);
              }}
              onBuffer={() => {
                setBuffering(true);
              }}
              onBufferEnd={() => {
                setBuffering(false);
              }}
              onError={(err) => {
                console.log("Player error:");
                console.error(err);

                setPlaying(false);
                socket?.emit("EVNT_SYNC_PAUSE");
                if (showError) return;

                if (!err.error) return;
                const message = err.error.message.replace(
                  /https?:\/\/[^\s]+/g,
                  "Media",
                );

                setShowError(message);
              }}
              config={{
                file: {
                  hlsVersion: "1.6.7",
                  dashVersion: "4.7.4",
                  hlsOptions: {
                    xhrSetup: (xhr: XMLHttpRequest) => {
                      const token = localStorage.getItem("accessToken");
                      if (token) {
                        xhr.setRequestHeader("X-Plex-Token", token);
                      }
                    },
                  },
                  attributes: {
                    controlsList: "nodownload",
                    disablePictureInPicture: true,
                    disableRemotePlayback: true,
                    autoplay: true,
                  },
                },
              }}
              onEnded={() => {
                if (room && !isHost) return;
                if (!playQueue) return console.log("No play queue");

                if (metadata.type !== "episode") {
                  if (room && isHost) socket?.emit("RES_SYNC_PLAYBACK_END");
                  return navigate(
                    `/browse/${metadata.librarySectionID}?${queryBuilder({
                      mid: metadata.ratingKey,
                    })}`,
                  );
                }

                const next = playQueue[1];
                if (!next) {
                  if (room && isHost) socket?.emit("RES_SYNC_PLAYBACK_END");
                  return navigate(
                    `/browse/${metadata.librarySectionID}?${queryBuilder({
                      mid: metadata.grandparentRatingKey,
                      pid: metadata.parentRatingKey,
                      iid: metadata.ratingKey,
                    })}`,
                  );
                }

                navigate(`/watch/${next.ratingKey}`);
              }}
              url={url}
              width="100%"
              height="100%"
            />
          </>
        )}
      </Box>
    </>
  );
}

export default Watch;
