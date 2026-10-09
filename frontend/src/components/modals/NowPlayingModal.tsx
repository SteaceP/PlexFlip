import React from "react";
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Slider,
  Stack,
  Avatar,
  Tooltip,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import RepeatOneRoundedIcon from "@mui/icons-material/RepeatOneRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import { useAudioPlayerStore } from "../../states/AudioPlayerState";
import { getTranscodeImageURL } from "../../plex";
import { useSearchParams } from "react-router-dom";

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function NowPlayingModal() {
  const [, setSearchParams] = useSearchParams();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    isNowPlayingOpen,
    setNowPlayingOpen,
    setQueueOpen,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
  } = useAudioPlayerStore();

  if (!currentTrack) return null;

  const bgImage = getTranscodeImageURL(
    currentTrack.art || currentTrack.thumb || currentTrack.parentThumb,
    1920,
    1080
  );
  const coverImage = getTranscodeImageURL(
    currentTrack.thumb || currentTrack.parentThumb,
    600,
    600
  );

  const artistName =
    currentTrack.grandparentTitle ||
    currentTrack.originalTitle ||
    currentTrack.parentTitle ||
    "Unknown Artist";
  const albumName = currentTrack.parentTitle || "";

  return (
    <Dialog
      fullScreen
      open={isNowPlayingOpen}
      onClose={() => setNowPlayingOpen(false)}
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#07090e",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Blurred background image */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(40px) brightness(0.25)",
          transform: "scale(1.15)",
          zIndex: 0,
        }}
      />
      {/* Dark gradient overlay */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(7,9,14,0.7) 0%, rgba(7,9,14,0.92) 100%)",
          zIndex: 1,
        }}
      />

      {/* Content wrapper */}
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          p: { xs: 2.5, sm: 4, md: 6 },
          maxWidth: "800px",
          mx: "auto",
          width: "100%",
        }}
      >
        {/* Top Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#e5a00d",
                fontWeight: 700,
              }}
            >
              Now Playing
            </Typography>
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              Plex Audio Stream
            </Typography>
          </Box>
          <IconButton
            onClick={() => setNowPlayingOpen(false)}
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.08)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        {/* Center: Large Artwork & Track Info */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            my: "auto",
            py: 2,
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: { xs: "240px", sm: "320px", md: "380px" },
              height: { xs: "240px", sm: "320px", md: "380px" },
              mb: 4,
              borderRadius: 4,
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(229,160,13,0.15)",
              border: "1px solid rgba(255,255,255,0.12)",
              transition: "transform 0.3s ease",
              "&:hover": {
                transform: "scale(1.02)",
              },
            }}
          >
            <Avatar
              variant="square"
              src={coverImage}
              alt={currentTrack.title}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              fontFamily: '"Inter Variable", sans-serif',
              mb: 1,
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentTrack.title}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
            <Typography
              variant="h6"
              sx={{
                color: "#e5a00d",
                fontWeight: 600,
                cursor: currentTrack.grandparentRatingKey ? "pointer" : "default",
                "&:hover": currentTrack.grandparentRatingKey ? { textDecoration: "underline" } : {},
              }}
              onClick={() => {
                if (currentTrack.grandparentRatingKey) {
                  setNowPlayingOpen(false);
                  setSearchParams({ mid: currentTrack.grandparentRatingKey });
                }
              }}
            >
              {artistName}
            </Typography>
            {albumName && (
              <>
                <Typography sx={{ color: "#64748b" }}>•</Typography>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "#94a3b8",
                    cursor: currentTrack.parentRatingKey ? "pointer" : "default",
                    "&:hover": currentTrack.parentRatingKey ? { textDecoration: "underline" } : {},
                  }}
                  onClick={() => {
                    if (currentTrack.parentRatingKey) {
                      setNowPlayingOpen(false);
                      setSearchParams({ mid: currentTrack.parentRatingKey });
                    }
                  }}
                >
                  {albumName}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* Bottom: Progress Bar & Controls */}
        <Box sx={{ width: "100%", mt: "auto" }}>
          {/* Scrubber Slider */}
          <Box sx={{ width: "100%", mb: 2 }}>
            <Slider
              size="small"
              value={currentTime}
              min={0}
              max={duration || 100}
              onChange={(_, val) => seek(val as number)}
              sx={{
                color: "#e5a00d",
                height: 5,
                "& .MuiSlider-thumb": {
                  width: 14,
                  height: 14,
                  transition: "0.2s cubic-bezier(.47,1.64,.41,.8)",
                  "&:hover, &.Mui-focusVisible": {
                    boxShadow: "0 0 0 8px rgba(229, 160, 13, 0.2)",
                  },
                },
                "& .MuiSlider-rail": {
                  color: "rgba(255,255,255,0.15)",
                },
              }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 500 }}>
                {formatDuration(currentTime)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 500 }}>
                {formatDuration(duration)}
              </Typography>
            </Box>
          </Box>

          {/* Main Controls Row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {/* Left buttons (Shuffle) */}
            <Tooltip title={isShuffled ? "Shuffle On" : "Shuffle Off"}>
              <IconButton
                onClick={toggleShuffle}
                sx={{
                  color: isShuffled ? "#e5a00d" : "#94a3b8",
                  "&:hover": { color: "#fff" },
                }}
              >
                <ShuffleRoundedIcon />
              </IconButton>
            </Tooltip>

            {/* Center: Previous, Play/Pause, Next */}
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                onClick={previousTrack}
                sx={{
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.06)",
                  p: 1.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                }}
              >
                <SkipPreviousRoundedIcon sx={{ fontSize: 28 }} />
              </IconButton>

              <IconButton
                onClick={togglePlay}
                sx={{
                  bgcolor: "#e5a00d",
                  color: "#000",
                  p: 2,
                  boxShadow: "0 4px 20px rgba(229,160,13,0.5)",
                  "&:hover": {
                    bgcolor: "#f59e0b",
                    transform: "scale(1.06)",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                {isPlaying ? (
                  <PauseRoundedIcon sx={{ fontSize: 36 }} />
                ) : (
                  <PlayArrowRoundedIcon sx={{ fontSize: 36 }} />
                )}
              </IconButton>

              <IconButton
                onClick={nextTrack}
                sx={{
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.06)",
                  p: 1.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                }}
              >
                <SkipNextRoundedIcon sx={{ fontSize: 28 }} />
              </IconButton>
            </Stack>

            {/* Right buttons (Repeat & Queue) */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title={`Repeat: ${repeatMode.toUpperCase()}`}>
                <IconButton
                  onClick={toggleRepeat}
                  sx={{
                    color: repeatMode !== "off" ? "#e5a00d" : "#94a3b8",
                    "&:hover": { color: "#fff" },
                  }}
                >
                  {repeatMode === "one" ? <RepeatOneRoundedIcon /> : <RepeatRoundedIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="View Queue">
                <IconButton
                  onClick={() => setQueueOpen(true)}
                  sx={{ color: "#94a3b8", "&:hover": { color: "#fff" } }}
                >
                  <QueueMusicRoundedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Volume Slider Row */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 3, gap: 1.5, maxWidth: "320px", mx: "auto" }}>
            <IconButton size="small" onClick={toggleMute} sx={{ color: "#94a3b8" }}>
              {isMuted || volume === 0 ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
            </IconButton>
            <Slider
              size="small"
              value={isMuted ? 0 : volume * 100}
              min={0}
              max={100}
              onChange={(_, val) => setVolume((val as number) / 100)}
              sx={{
                color: "#94a3b8",
                "& .MuiSlider-thumb": { width: 10, height: 10 },
                "& .MuiSlider-track": { color: "#e5a00d" },
              }}
            />
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
