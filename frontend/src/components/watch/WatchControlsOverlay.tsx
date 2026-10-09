import React, { useState, useEffect } from "react";
import {
  alpha,
  Box,
  Fade,
  GlobalStyles,
  IconButton,
  Paper,
  Popover,
  Slider,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ArrowBackIosNewRounded,
  FullscreenRounded,
  PauseRounded,
  PeopleRounded,
  PlayArrowRounded,
  TuneRounded,
  VolumeUpRounded,
} from "@mui/icons-material";
import { VideoSeekSlider } from "react-video-seek-slider";
import "react-video-seek-slider/styles.css";
import { getTranscodeImageURL } from "../../plex";
import { useUserSettings } from "../../states/UserSettingsState";
import WatchShowChildView from "../WatchShowChildView";
import WatchNextEpisodePopper from "./WatchNextEpisodePopper";
import { getFormatedTime } from "./WatchUtils";

interface WatchControlsOverlayProps {
  showControls: boolean;
  playing: boolean;
  controlElementsVisible: boolean;
  metadata: Plex.Metadata;
  playQueue: Plex.Metadata[] | null;
  progress: number;
  buffered: number;
  duration: number;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  playbackBarRef: React.RefObject<HTMLDivElement | null>;
  tuneButtonRef: React.RefObject<HTMLButtonElement | null>;
  onToggleTune: (buttonEl: HTMLButtonElement) => void;
  onOpenSync: () => void;
  room: unknown;
  isHost: boolean;
  controlElementsVisibleState: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ];
  onVolumePopoverChange?: (open: boolean) => void;
  onBack: () => void;
}

export const WatchControlsOverlay: React.FC<WatchControlsOverlayProps> = ({
  showControls,
  playing,
  controlElementsVisible,
  metadata,
  playQueue,
  progress,
  buffered,
  duration,
  volume,
  onVolumeChange,
  onTogglePlay,
  onSeek,
  playbackBarRef,
  tuneButtonRef,
  onToggleTune,
  onOpenSync,
  room,
  isHost,
  controlElementsVisibleState,
  onVolumePopoverChange,
  onBack,
}) => {
  const theme = useTheme();
  const { settings } = useUserSettings();

  const [volumePopoverAnchor, setVolumePopoverAnchor] =
    useState<HTMLButtonElement | null>(null);
  const volumePopoverOpen = Boolean(volumePopoverAnchor);

  useEffect(() => {
    onVolumePopoverChange?.(volumePopoverOpen);
  }, [volumePopoverOpen, onVolumePopoverChange]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const isBarVisible = showControls || !playing;

  return (
    <>
      <GlobalStyles
        styles={{
          ".ui-video-seek-slider .track .main .connect": {
            backgroundColor: `${theme.palette.primary.main} !important`,
          },
          ".ui-video-seek-slider .thumb .handler": {
            backgroundColor: `${theme.palette.primary.main} !important`,
          },
        }}
      />

      <Fade
        in={showControls || !playing || controlElementsVisible}
        style={{
          transitionDuration: "1s",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 1,
            width: "100vw",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background:
              settings["DISABLE_WATCHSCREEN_DARKENING"] === "true"
                ? "transparent"
                : "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.8) 100%)",
            pointerEvents: "none",
          }}
        >
          {/* Top Bar / Back Button */}
          <Box
            sx={{
              mt: 3,
              mx: 3,
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-start",
              alignItems: "center",
              pointerEvents: "all",
            }}
          >
            <IconButton
              onClick={onBack}
              sx={{
                width: 48,
                height: 48,
                backgroundColor: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(20px)",
                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.8)",
                  transform: "scale(1.05)",
                },
              }}
            >
              <ArrowBackIosNewRounded fontSize="medium" />
            </IconButton>
          </Box>

          {/* Standalone Backdrop Blur Background */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              height: playbackBarRef.current?.clientHeight || 200,
              background:
                "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              zIndex: -1,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              transition: "bottom 0.5s ease",
            }}
            style={{
              bottom: isBarVisible
                ? 0
                : -(playbackBarRef.current?.clientHeight || 200),
            }}
          />

          {/* Playback Controls Bar */}
          <Box
            ref={playbackBarRef}
            sx={{
              mt: "auto",
              mb: 0,
              mx: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "all",
              px: 4,
              py: 2,
              transition: "transform 0.5s ease",
            }}
            style={{
              transform: isBarVisible ? "translateY(0)" : "translateY(100%)",
            }}
          >
            {/* Progress Bar Section */}
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                mb: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  minWidth: "45px",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: 500,
                }}
              >
                {getFormatedTime(progress)}
              </Typography>

              <Box
                sx={{
                  flex: 1,
                  height: "18px",
                  position: "relative",
                }}
              >
                <VideoSeekSlider
                  max={duration * 1000}
                  currentTime={progress * 1000}
                  bufferTime={buffered * 1000}
                  onChange={(value) => onSeek(value / 1000)}
                  getPreviewScreenUrl={(value) => {
                    if (
                      !metadata.Media ||
                      !metadata.Media[0].Part[0].indexes
                    ) {
                      return "";
                    }
                    return getTranscodeImageURL(
                      `/library/parts/${metadata.Media[0].Part[0].id}/indexes/sd/${value}`,
                      240,
                      135,
                    );
                  }}
                />
              </Box>

              <Typography
                variant="caption"
                sx={{
                  minWidth: "45px",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: 500,
                }}
              >
                {getFormatedTime(Math.max(0, duration - progress))}
              </Typography>
            </Box>

            {/* Controls Section */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              {/* Left Controls */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <IconButton
                  onClick={onTogglePlay}
                  onKeyDown={(e) => {
                    e.preventDefault();
                  }}
                  sx={{
                    width: 48,
                    height: 48,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.2)",
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  {playing ? (
                    <PauseRounded fontSize="medium" />
                  ) : (
                    <PlayArrowRounded fontSize="medium" />
                  )}
                </IconButton>

                {playQueue && !(room && !isHost) && (
                  <WatchNextEpisodePopper queue={playQueue} />
                )}
              </Box>

              {/* Center Title */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  mx: 4,
                }}
              >
                {metadata.type === "movie" && (
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#fff",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                    }}
                  >
                    {metadata.title}
                  </Typography>
                )}

                {metadata.type === "episode" && (
                  <>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.7)",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                      }}
                    >
                      {metadata.grandparentTitle}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: "#fff",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        mt: 0.5,
                      }}
                    >
                      S{metadata.parentIndex}E{metadata.index} • {metadata.title}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Right Controls */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <IconButton
                  onKeyDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={(event) => {
                    setVolumePopoverAnchor(event.currentTarget);
                  }}
                  sx={{
                    width: 40,
                    height: 40,
                  }}
                >
                  <VolumeUpRounded fontSize="small" />
                </IconButton>

                {metadata.type === "episode" && !(room && !isHost) && (
                  <WatchShowChildView
                    item={metadata}
                    controlElementsVisibleState={controlElementsVisibleState}
                  />
                )}

                <IconButton
                  ref={tuneButtonRef}
                  onKeyDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={(event) => {
                    onToggleTune(event.currentTarget);
                  }}
                >
                  <TuneRounded fontSize="small" />
                </IconButton>

                {Boolean(room) && (
                  <IconButton
                    onKeyDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={onOpenSync}
                  >
                    <PeopleRounded fontSize="small" />
                  </IconButton>
                )}

                <IconButton
                  onKeyDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={toggleFullscreen}
                >
                  <FullscreenRounded fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Volume Popover */}
            <Popover
              open={volumePopoverOpen}
              anchorEl={volumePopoverAnchor}
              onClose={() => {
                setVolumePopoverAnchor(null);
              }}
              anchorOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
              transformOrigin={{
                vertical: "bottom",
                horizontal: "center",
              }}
              elevation={0}
              sx={{
                userSelect: "none",
                "& .MuiPaper-root": {
                  overflow: "hidden",
                  borderRadius: 1,
                  background: "transparent",
                },
              }}
            >
              <Paper
                sx={{
                  height: "auto",
                  userSelect: "none",
                  backgroundColor: "#00000088",
                  backdropFilter: "blur(20px)",
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  py: 3,
                  px: 2,
                }}
              >
                <Slider
                  sx={{
                    height: "100px",
                    "& .MuiSlider-thumb": {
                      width: 16,
                      height: 16,
                      backgroundColor: theme.palette.primary.main,
                      border: "2px solid rgba(255,255,255,0.3)",
                    },
                    "& .MuiSlider-track": {
                      backgroundColor: theme.palette.primary.main,
                      border: "none",
                      width: 4,
                    },
                    "& .MuiSlider-rail": {
                      backgroundColor: "rgba(255,255,255,0.2)",
                      width: 4,
                    },
                  }}
                  value={volume}
                  onChange={(_event, val) => {
                    const numVal = val as number;
                    onVolumeChange(numVal);
                    localStorage.setItem("volume", numVal.toString());
                  }}
                  aria-labelledby="continuous-slider"
                  min={0}
                  max={100}
                  step={1}
                  orientation="vertical"
                />
              </Paper>
            </Popover>
          </Box>
        </Box>
      </Fade>
    </>
  );
};

export default WatchControlsOverlay;
