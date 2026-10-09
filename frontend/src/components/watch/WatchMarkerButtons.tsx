import React from "react";
import { alpha, Box, Button, Fade, Typography, useTheme } from "@mui/material";
import { SkipNext } from "@mui/icons-material";
import PlaybackNextEPButton from "../PlaybackNextEPButton";
import ReactPlayer from "../../common/ReactPlayer";

interface WatchMarkerButtonsProps {
  metadata: Plex.Metadata | null;
  progress: number;
  room: unknown;
  isHost: boolean;
  playerRef: React.RefObject<ReactPlayer | null>;
  playbackBarRef: React.RefObject<HTMLDivElement | null>;
  playQueue: Plex.Metadata[] | null;
  navigate: (path: string) => void;
  playing: boolean;
}

export const WatchMarkerButtons: React.FC<WatchMarkerButtonsProps> = ({
  metadata,
  progress,
  room,
  isHost,
  playerRef,
  playbackBarRef,
  playQueue,
  navigate,
  playing,
}) => {
  const theme = useTheme();

  if (!metadata) return null;

  const barHeight = playbackBarRef.current?.clientHeight ?? 0;
  const canShowMarker = room ? isHost : true;

  const introMarkers =
    metadata.Marker?.filter(
      (marker) =>
        marker.startTimeOffset / 1000 <= progress &&
        marker.endTimeOffset / 1000 >= progress &&
        marker.type === "intro",
    ) ?? [];

  const nonFinalCreditMarkers =
    metadata.Marker?.filter(
      (marker) =>
        marker.startTimeOffset / 1000 <= progress &&
        marker.endTimeOffset / 1000 >= progress &&
        marker.type === "credits" &&
        !marker.final,
    ) ?? [];

  const finalCreditMarkers =
    metadata.Marker?.filter(
      (marker) =>
        marker.startTimeOffset / 1000 <= progress &&
        marker.endTimeOffset / 1000 >= progress &&
        marker.type === "credits" &&
        marker.final,
    ) ?? [];

  return (
    <>
      <Fade
        mountOnEnter
        unmountOnExit
        in={canShowMarker && introMarkers.length > 0}
      >
        <Box
          sx={{
            position: "absolute",
            bottom: `${barHeight + 40}px`,
            right: "40px",
            zIndex: 2,
          }}
        >
          <Button
            sx={{
              px: 3,
              py: 1.5,
              backgroundColor: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(20px)",
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              color: "#fff",
              "&:hover": {
                backgroundColor: "rgba(0,0,0,0.9)",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
              },
            }}
            variant="contained"
            onClick={() => {
              if (!playerRef.current || introMarkers.length === 0) return;
              const time = introMarkers[0].endTimeOffset / 1000;
              playerRef.current.seekTo(time + 1);
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
              }}
            >
              <SkipNext sx={{ fontSize: 18 }} />
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  letterSpacing: "0.025em",
                }}
              >
                Skip Intro
              </Typography>
            </Box>
          </Button>
        </Box>
      </Fade>

      <Fade
        mountOnEnter
        unmountOnExit
        in={canShowMarker && nonFinalCreditMarkers.length > 0}
      >
        <Box
          sx={{
            position: "absolute",
            bottom: `${barHeight + 40}px`,
            right: "40px",
            zIndex: 2,
          }}
        >
          <Button
            sx={{
              px: 3,
              py: 1.5,
              backgroundColor: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(20px)",
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              color: "#fff",
              "&:hover": {
                backgroundColor: "rgba(0,0,0,0.9)",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
              },
            }}
            variant="contained"
            onClick={() => {
              if (!playerRef.current || nonFinalCreditMarkers.length === 0) return;
              const time = nonFinalCreditMarkers[0].endTimeOffset / 1000;
              playerRef.current.seekTo(time + 1);
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
              }}
            >
              <SkipNext sx={{ fontSize: 18 }} />
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  letterSpacing: "0.025em",
                }}
              >
                Skip Credits
              </Typography>
            </Box>
          </Button>
        </Box>
      </Fade>

      <Fade
        mountOnEnter
        unmountOnExit
        in={canShowMarker && finalCreditMarkers.length > 0}
      >
        <Box
          sx={{
            position: "absolute",
            bottom: `${barHeight + 40}px`,
            right: "40px",
            zIndex: 2,
          }}
        >
          <PlaybackNextEPButton
            player={playerRef as unknown as React.MutableRefObject<unknown>}
            playbackBarRef={
              playbackBarRef as unknown as React.MutableRefObject<HTMLDivElement | null>
            }
            metadata={metadata}
            playQueue={playQueue}
            navigate={navigate}
            playing={playing}
          />
        </Box>
      </Fade>
    </>
  );
};

export default WatchMarkerButtons;
