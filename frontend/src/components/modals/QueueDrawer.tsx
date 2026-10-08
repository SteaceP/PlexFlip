import React from "react";
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Tooltip,
  Paper,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import ClearAllRoundedIcon from "@mui/icons-material/ClearAllRounded";
import { useAudioPlayerStore } from "../../states/AudioPlayerState";
import { getTranscodeImageURL } from "../../plex";

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function QueueDrawer() {
  const {
    queue,
    queueIndex,
    currentTrack,
    isQueueOpen,
    setQueueOpen,
    playTrack,
    removeFromQueue,
    clearQueue,
    isPlaying,
  } = useAudioPlayerStore();

  const upNext = queue.slice(queueIndex + 1);

  return (
    <Drawer
      anchor="right"
      open={isQueueOpen}
      onClose={() => setQueueOpen(false)}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: "400px" },
          bgcolor: "#0b0f19",
          color: "#fff",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          p: 2.5,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Inter Variable", sans-serif' }}>
            Play Queue
          </Typography>
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            ({queue.length} track{queue.length === 1 ? "" : "s"})
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {queue.length > 0 && (
            <Tooltip title="Clear Queue">
              <IconButton size="small" onClick={clearQueue} sx={{ color: "#94a3b8", "&:hover": { color: "#ef4444" } }}>
                <ClearAllRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => setQueueOpen(false)} sx={{ color: "#94a3b8" }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>
      </Box>

      {queue.length === 0 ? (
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 1, color: "#64748b" }}>
          <Typography variant="body1">Queue is empty</Typography>
          <Typography variant="caption">Play tracks or albums to populate the queue</Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
          {/* Now Playing section */}
          {currentTrack && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: "0.1em", color: "#e5a00d", fontWeight: 700 }}>
                Now Playing
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  mt: 1,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "rgba(229, 160, 13, 0.1)",
                  border: "1px solid rgba(229, 160, 13, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Avatar
                  variant="rounded"
                  src={getTranscodeImageURL(currentTrack.thumb || currentTrack.parentThumb, 60, 60)}
                  sx={{ width: 48, height: 48, borderRadius: 1.5 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {currentTrack.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                    {currentTrack.grandparentTitle || currentTrack.originalTitle || currentTrack.parentTitle || "Unknown Artist"}
                  </Typography>
                </Box>
                {isPlaying ? (
                  <GraphicEqRoundedIcon sx={{ color: "#e5a00d", fontSize: 22 }} />
                ) : (
                  <PlayArrowRoundedIcon sx={{ color: "#e5a00d", fontSize: 22 }} />
                )}
              </Paper>
            </Box>
          )}

          {/* Up Next Section */}
          {upNext.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", fontWeight: 700, mb: 1, display: "block" }}>
                Up Next ({upNext.length})
              </Typography>
              <List disablePadding>
                {upNext.map((item, relIdx) => {
                  const absoluteIdx = queueIndex + 1 + relIdx;
                  return (
                    <ListItem
                      key={`${item.ratingKey}-${absoluteIdx}`}
                      disablePadding
                      sx={{
                        mb: 0.75,
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: "rgba(255,255,255,0.03)",
                        "&:hover": {
                          bgcolor: "rgba(255,255,255,0.07)",
                        },
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Avatar
                          variant="rounded"
                          src={getTranscodeImageURL(item.thumb || item.parentThumb, 48, 48)}
                          sx={{ width: 36, height: 36, borderRadius: 1 }}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.title}
                        secondary={item.grandparentTitle || item.originalTitle || item.parentTitle || ""}
                        primaryTypographyProps={{
                          variant: "body2",
                          fontWeight: 500,
                          noWrap: true,
                          sx: { color: "#fff", fontSize: "13px" },
                        }}
                        secondaryTypographyProps={{
                          variant: "caption",
                          noWrap: true,
                          sx: { color: "#64748b", fontSize: "11px" },
                        }}
                        sx={{ my: 0, mr: 1, minWidth: 0 }}
                      />
                      <Typography variant="caption" sx={{ color: "#64748b", mr: 1 }}>
                        {formatDuration(item.duration ? item.duration / 1000 : 0)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => playTrack(item, queue)}
                        sx={{ color: "#94a3b8", "&:hover": { color: "#e5a00d" } }}
                      >
                        <PlayArrowRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => removeFromQueue(absoluteIdx)}
                        sx={{ color: "#64748b", "&:hover": { color: "#ef4444" } }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </Box>
      )}
    </Drawer>
  );
}
