import React from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  GraphicEqRounded,
  PlayArrowRounded,
  QueueMusicRounded,
} from "@mui/icons-material";
import { useAudioPlayerStore } from "../../states/AudioPlayerState";

export interface AlbumTrackListProps {
  album: Plex.Metadata;
  tracks: Plex.Metadata[] | null;
}

export function AlbumTrackList({
  album,
  tracks,
}: AlbumTrackListProps) {
  const { currentTrack, isPlaying, playAlbum, addToQueue } =
    useAudioPlayerStore();

  if (!tracks) {
    return (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          py: 6,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (tracks.length === 0) {
    return (
      <Box sx={{ width: "100%", py: 4, textAlign: "center", color: "#64748b" }}>
        <Typography>No tracks found in this album.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        mt: 1,
      }}
    >
      {tracks.map((track, idx) => {
        const isCurrent = currentTrack?.ratingKey === track.ratingKey;
        const durationSec = track.duration ? track.duration / 1000 : 0;
        const m = Math.floor(durationSec / 60);
        const s = Math.floor(durationSec % 60);
        const formattedDuration = `${m}:${s < 10 ? "0" : ""}${s}`;

        return (
          <Paper
            key={track.ratingKey || idx}
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1.5,
              borderRadius: 2,
              bgcolor: isCurrent
                ? "rgba(229, 160, 13, 0.12)"
                : "rgba(255, 255, 255, 0.03)",
              border: isCurrent
                ? "1px solid rgba(229, 160, 13, 0.4)"
                : "1px solid rgba(255, 255, 255, 0.05)",
              transition: "all 0.2s ease",
              cursor: "pointer",
              "&:hover": {
                bgcolor: isCurrent
                  ? "rgba(229, 160, 13, 0.18)"
                  : "rgba(255, 255, 255, 0.07)",
                transform: "translateX(4px)",
              },
            }}
            onClick={() => playAlbum(album, tracks, idx)}
          >
            {/* Track number / Playing indicator */}
            <Box
              sx={{
                width: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isCurrent ? "#e5a00d" : "#64748b",
              }}
            >
              {isCurrent && isPlaying ? (
                <GraphicEqRounded sx={{ fontSize: 20 }} />
              ) : (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {track.index || idx + 1}
                </Typography>
              )}
            </Box>

            {/* Title & Subtitle */}
            <Box sx={{ flex: 1, minWidth: 0, px: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isCurrent ? 700 : 600,
                  color: isCurrent ? "#e5a00d" : "#fff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {track.title}
              </Typography>
              {(track.originalTitle || track.grandparentTitle) && (
                <Typography
                  variant="caption"
                  sx={{ color: "#64748b", display: "block" }}
                >
                  {track.originalTitle || track.grandparentTitle}
                </Typography>
              )}
            </Box>

            {/* Duration */}
            <Typography
              variant="caption"
              sx={{
                color: "#64748b",
                mr: 2,
                minWidth: 40,
                textAlign: "right",
              }}
            >
              {formattedDuration}
            </Typography>

            {/* Actions */}
            <Tooltip title="Add to Queue">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  addToQueue(track);
                }}
                sx={{ color: "#94a3b8", "&:hover": { color: "#e5a00d" } }}
              >
                <QueueMusicRounded fontSize="small" />
              </IconButton>
            </Tooltip>

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                playAlbum(album, tracks, idx);
              }}
              sx={{
                color: isCurrent ? "#e5a00d" : "#cbd5e1",
                "&:hover": { color: "#e5a00d" },
              }}
            >
              <PlayArrowRounded fontSize="small" />
            </IconButton>
          </Paper>
        );
      })}
    </Box>
  );
}

export default AlbumTrackList;
