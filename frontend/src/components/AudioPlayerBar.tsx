import React, { useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Avatar,
  Tooltip,
  Badge,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import RepeatOneRoundedIcon from "@mui/icons-material/RepeatOneRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeDownRoundedIcon from "@mui/icons-material/VolumeDownRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAudioPlayerStore,
  getTrackStreamURL,
} from "../states/AudioPlayerState";
import { getTranscodeImageURL } from "../plex";
import QueueDrawer from "./modals/QueueDrawer";
import NowPlayingModal from "./modals/NowPlayingModal";
import { useSearchParams } from "react-router-dom";

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function AudioPlayerBar() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [, setSearchParams] = useSearchParams();

  const {
    currentTrack,
    queue,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    nextTrack,
    previousTrack,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    setQueueOpen,
    setNowPlayingOpen,
    scrobbleCurrentTrack,
  } = useAudioPlayerStore();

  const hasScrobbledRef = useRef<boolean>(false);

  // Synchronize audio source when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute("src");
      return;
    }

    hasScrobbledRef.current = false;
    const streamURL = getTrackStreamURL(currentTrack);
    if (audio.src !== streamURL) {
      audio.src = streamURL;
      audio.load();
    }

    if (useAudioPlayerStore.getState().isPlaying) {
      audio.play().catch((err) => {
        console.warn("Audio playback autoplay prevented or error:", err);
      });
    }

    // MediaSession setup
    if ("mediaSession" in navigator && currentTrack) {
      const artist =
        currentTrack.grandparentTitle ||
        currentTrack.originalTitle ||
        currentTrack.parentTitle ||
        "";
      const album = currentTrack.parentTitle || "";
      const artworkPath = currentTrack.thumb || currentTrack.parentThumb;
      const artworkSrc = artworkPath
        ? getTranscodeImageURL(artworkPath, 512, 512)
        : "";

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist,
        album,
        artwork: artworkSrc
          ? [{ src: artworkSrc, sizes: "512x512", type: "image/jpeg" }]
          : [],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        useAudioPlayerStore.getState().resume();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        useAudioPlayerStore.getState().pause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        useAudioPlayerStore.getState().previousTrack();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        useAudioPlayerStore.getState().nextTrack();
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          useAudioPlayerStore.getState().seek(details.seekTime);
        }
      });
    }
  }, [currentTrack]);

  // Synchronize play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn("Audio play error:", err);
      });
    } else {
      audio.pause();
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  // Synchronize volume and mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  // Audio element events
  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);

    // Scrobble to Plex once past 85% of duration
    if (
      !hasScrobbledRef.current &&
      audio.duration > 15 &&
      audio.currentTime / audio.duration > 0.85
    ) {
      hasScrobbledRef.current = true;
      scrobbleCurrentTrack();
    }
  }, [setCurrentTime, scrobbleCurrentTrack]);

  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || (currentTrack?.duration ? currentTrack.duration / 1000 : 0));
  }, [setDuration, currentTrack]);

  const onEnded = useCallback(() => {
    if (repeatMode === "one") {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } else {
      nextTrack();
    }
  }, [repeatMode, nextTrack]);

  if (!currentTrack) {
    return (
      <audio
        id="plexflip-audio-player"
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ display: "none" }}
      />
    );
  }

  const thumbUrl = getTranscodeImageURL(
    currentTrack.thumb || currentTrack.parentThumb,
    100,
    100
  );
  const artistName =
    currentTrack.grandparentTitle ||
    currentTrack.originalTitle ||
    currentTrack.parentTitle ||
    "Unknown Artist";
  const albumName = currentTrack.parentTitle || "";

  return (
    <>
      <audio
        id="plexflip-audio-player"
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ display: "none" }}
      />

      <QueueDrawer />
      <NowPlayingModal />

      <AnimatePresence>
        <Box
          component={motion.div}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "82px",
            bgcolor: "rgba(11, 15, 25, 0.92)",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.6)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 2, sm: 3, md: 4 },
            userSelect: "none",
          }}
        >
          {/* Left: Track Information & Album Artwork */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              width: { xs: "40%", sm: "30%", md: "25%" },
              minWidth: 0,
            }}
          >
            <Avatar
              variant="rounded"
              src={thumbUrl}
              alt={currentTrack.title}
              sx={{
                width: 52,
                height: 52,
                borderRadius: 1.5,
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                cursor: "pointer",
                transition: "transform 0.2s ease",
                "&:hover": { transform: "scale(1.05)" },
              }}
              onClick={() => setNowPlayingOpen(true)}
            />

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "#fff",
                  fontFamily: '"Inter Variable", sans-serif',
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  "&:hover": { color: "#e5a00d" },
                }}
                onClick={() => setNowPlayingOpen(true)}
              >
                {currentTrack.title}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: "#94a3b8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                  cursor: currentTrack.grandparentRatingKey ? "pointer" : "default",
                  "&:hover": currentTrack.grandparentRatingKey ? { color: "#e5a00d" } : {},
                }}
                onClick={() => {
                  if (currentTrack.grandparentRatingKey) {
                    setSearchParams({ mid: currentTrack.grandparentRatingKey });
                  }
                }}
              >
                {artistName}
                {albumName ? ` • ${albumName}` : ""}
              </Typography>
            </Box>
          </Box>

          {/* Center: Playback Controls & Progress Scrubber */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: "55%", sm: "45%", md: "40%" },
              maxWidth: "560px",
            }}
          >
            {/* Control buttons */}
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.5 }, mb: 0.5 }}>
              <Tooltip title={isShuffled ? "Shuffle On" : "Shuffle Off"}>
                <IconButton
                  size="small"
                  onClick={toggleShuffle}
                  sx={{
                    color: isShuffled ? "#e5a00d" : "#94a3b8",
                    "&:hover": { color: "#fff" },
                  }}
                >
                  <ShuffleRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Previous Track">
                <IconButton
                  size="small"
                  onClick={previousTrack}
                  sx={{ color: "#cbd5e1", "&:hover": { color: "#fff" } }}
                >
                  <SkipPreviousRoundedIcon sx={{ fontSize: 24 }} />
                </IconButton>
              </Tooltip>

              <IconButton
                onClick={togglePlay}
                sx={{
                  bgcolor: "#e5a00d",
                  color: "#000",
                  width: 40,
                  height: 40,
                  boxShadow: "0 2px 12px rgba(229,160,13,0.4)",
                  "&:hover": {
                    bgcolor: "#f59e0b",
                    transform: "scale(1.06)",
                  },
                  transition: "all 0.15s ease",
                  mx: 0.5,
                }}
              >
                {isPlaying ? (
                  <PauseRoundedIcon sx={{ fontSize: 24 }} />
                ) : (
                  <PlayArrowRoundedIcon sx={{ fontSize: 24 }} />
                )}
              </IconButton>

              <Tooltip title="Next Track">
                <IconButton
                  size="small"
                  onClick={nextTrack}
                  sx={{ color: "#cbd5e1", "&:hover": { color: "#fff" } }}
                >
                  <SkipNextRoundedIcon sx={{ fontSize: 24 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title={`Repeat: ${repeatMode.toUpperCase()}`}>
                <IconButton
                  size="small"
                  onClick={toggleRepeat}
                  sx={{
                    color: repeatMode !== "off" ? "#e5a00d" : "#94a3b8",
                    "&:hover": { color: "#fff" },
                  }}
                >
                  {repeatMode === "one" ? (
                    <RepeatOneRoundedIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <RepeatRoundedIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Scrubber slider */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                gap: 1.5,
              }}
            >
              <Typography variant="caption" sx={{ color: "#64748b", minWidth: "32px", textAlign: "right", fontSize: "11px" }}>
                {formatDuration(currentTime)}
              </Typography>

              <Slider
                size="small"
                value={currentTime}
                min={0}
                max={duration || 100}
                onChange={(_, val) => seek(val as number)}
                sx={{
                  color: "#e5a00d",
                  height: 4,
                  padding: "8px 0",
                  "& .MuiSlider-thumb": {
                    width: 10,
                    height: 10,
                    transition: "0.2s cubic-bezier(.47,1.64,.41,.8)",
                    "&:hover, &.Mui-focusVisible": {
                      boxShadow: "0 0 0 6px rgba(229, 160, 13, 0.2)",
                    },
                  },
                  "& .MuiSlider-rail": {
                    color: "rgba(255,255,255,0.12)",
                  },
                }}
              />

              <Typography variant="caption" sx={{ color: "#64748b", minWidth: "32px", fontSize: "11px" }}>
                {formatDuration(duration)}
              </Typography>
            </Box>
          </Box>

          {/* Right: Volume, Queue, Expand */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: { xs: 0.5, sm: 1.5 },
              width: { xs: "auto", sm: "25%" },
            }}
          >
            {/* Volume control */}
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                gap: 1,
                width: "120px",
              }}
            >
              <IconButton size="small" onClick={toggleMute} sx={{ color: "#94a3b8", p: 0.5 }}>
                {isMuted || volume === 0 ? (
                  <VolumeOffRoundedIcon sx={{ fontSize: 18 }} />
                ) : volume < 0.5 ? (
                  <VolumeDownRoundedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <VolumeUpRoundedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
              <Slider
                size="small"
                value={isMuted ? 0 : volume * 100}
                min={0}
                max={100}
                onChange={(_, val) => setVolume((val as number) / 100)}
                sx={{
                  color: "#94a3b8",
                  height: 3,
                  "& .MuiSlider-thumb": { width: 8, height: 8 },
                  "& .MuiSlider-track": { color: "#e5a00d" },
                  "& .MuiSlider-rail": { color: "rgba(255,255,255,0.15)" },
                }}
              />
            </Box>

            {/* Queue Drawer toggle */}
            <Tooltip title="Queue">
              <IconButton
                size="small"
                onClick={() => setQueueOpen(true)}
                sx={{ color: "#94a3b8", "&:hover": { color: "#fff" } }}
              >
                <Badge badgeContent={queue.length} color="primary" max={99} sx={{ "& .MuiBadge-badge": { fontSize: "10px", height: "16px", minWidth: "16px" } }}>
                  <QueueMusicRoundedIcon sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Expand / Full Now Playing Modal */}
            <Tooltip title="Expand Now Playing">
              <IconButton
                size="small"
                onClick={() => setNowPlayingOpen(true)}
                sx={{ color: "#94a3b8", "&:hover": { color: "#fff" } }}
              >
                <OpenInFullRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </AnimatePresence>
    </>
  );
}
