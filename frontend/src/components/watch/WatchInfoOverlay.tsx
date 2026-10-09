import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { getTranscodeImageURL } from "../../plex";
import { durationToText } from "../MovieItemSlider";

interface WatchInfoOverlayProps {
  showInfo: boolean;
  metadata: Plex.Metadata | null;
  showmetadata: Plex.Metadata | null;
}

export const WatchInfoOverlay: React.FC<WatchInfoOverlayProps> = ({
  showInfo,
  metadata,
  showmetadata,
}) => {
  const theme = useTheme();

  if (!metadata) return null;

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        padding: "10px",
        left: "0",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        px: "8vw",
        gap: "4vw",
        opacity: showInfo ? 1 : 0,
        transition: "all 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
        zIndex: 1000,
        pointerEvents: "none",
        ...(metadata.type === "movie" && {
          justifyContent: "center",
          padding: "0",
        }),
      }}
    >
      <img
        src={`${getTranscodeImageURL(
          metadata.thumb as string,
          1500,
          1500,
        )}`}
        alt=""
        style={{
          height: "25vw",
          width: "auto",
          objectFit: "cover",
          borderRadius: "1rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          transform: `translateX(${
            showInfo ? 0 : -40
          }vw) perspective(1000px) rotateY(${showInfo ? 0 : -30}deg)`,
          transition: "transform 0.7s cubic-bezier(0.23, 1, 0.32, 1)",
          transitionDelay: "0.2s",
          border: "2px solid rgba(255,255,255,0.1)",
        }}
      />
      <Box
        sx={{
          width: "45vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          textAlign: "left",
          transform: `translateX(${showInfo ? 0 : -80}vw)`,
          transition: "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
          transitionDelay: "0.1s",
        }}
      >
        {metadata.type === "episode" && (
          <>
            <Typography
              sx={{
                fontSize: "0.9vw",
                color: theme.palette.primary.main,
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                mb: 0.5,
              }}
            >
              {showmetadata?.childCount &&
                showmetadata?.childCount > 1 &&
                `Season ${metadata.parentIndex}`}
            </Typography>

            <Typography
              sx={{
                fontSize: "2.5vw",
                fontWeight: 700,
                color: "#FFF",
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              {metadata.grandparentTitle}
            </Typography>

            <Typography
              sx={{
                fontSize: "1.2vw",
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                mt: 2,
                mb: 0.5,
              }}
            >
              {metadata.title}{" "}
              <span style={{ opacity: 0.6 }}>· EP.{metadata.index}</span>
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "flex-start",
                mt: 0,
                mb: 1,
                gap: 2,
              }}
            >
              {metadata.year && (
                <Typography
                  sx={{
                    fontSize: "0.8vw",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {metadata.year}
                </Typography>
              )}
              {metadata.rating && (
                <Typography
                  sx={{
                    fontSize: "0.8vw",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {metadata.rating}
                </Typography>
              )}
              {metadata.contentRating && (
                <Typography
                  sx={{
                    fontSize: "0.7vw",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.9)",
                    border: `1px solid rgba(255,255,255,0.3)`,
                    borderRadius: "4px",
                    px: 1,
                    py: 0.3,
                  }}
                >
                  {metadata.contentRating}
                </Typography>
              )}
              {metadata.duration && (
                <Typography
                  sx={{
                    fontSize: "0.9vw",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {durationToText(metadata.duration)}
                </Typography>
              )}
            </Box>

            <Typography
              sx={{
                fontSize: "1vw",
                color: "rgba(255,255,255,0.8)",
                lineHeight: 1.6,
                maxWidth: "90%",
                position: "relative",
                "&:before": {
                  content: '""',
                  position: "absolute",
                  left: "-20px",
                  top: "8px",
                  bottom: "8px",
                  width: "3px",
                  background: theme.palette.primary.main,
                  borderRadius: "4px",
                  opacity: 0.8,
                },
              }}
            >
              {metadata.summary}
            </Typography>
          </>
        )}

        {metadata.type === "movie" && (
          <>
            <Typography
              sx={{
                fontSize: "3.5vw",
                fontWeight: 700,
                color: "#FFF",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              {metadata.title}
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "flex-start",
                mt: 2,
                mb: 3,
                gap: 2,
              }}
            >
              {metadata.year && (
                <Typography
                  sx={{
                    fontSize: "0.8vw",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {metadata.year}
                </Typography>
              )}
              {metadata.rating && (
                <Typography
                  sx={{
                    fontSize: "0.8vw",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {metadata.rating}
                </Typography>
              )}
              {metadata.contentRating && (
                <Typography
                  sx={{
                    fontSize: "0.7vw",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.9)",
                    border: `1px solid rgba(255,255,255,0.3)`,
                    borderRadius: "4px",
                    px: 1,
                    py: 0.3,
                  }}
                >
                  {metadata.contentRating}
                </Typography>
              )}
              {metadata.duration && (
                <Typography
                  sx={{
                    fontSize: "0.8vw",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {durationToText(metadata.duration)}
                </Typography>
              )}
            </Box>

            {metadata.tagline && (
              <Typography
                sx={{
                  fontSize: "1vw",
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                  mt: 1,
                  mb: 2,
                  fontStyle: "italic",
                }}
              >
                {metadata.tagline}
              </Typography>
            )}
            <Typography
              sx={{
                fontSize: "1vw",
                color: "rgba(255,255,255,0.8)",
                lineHeight: 1.6,
                maxWidth: "90%",
                position: "relative",
                "&:before": {
                  content: '""',
                  position: "absolute",
                  left: "-20px",
                  top: "8px",
                  bottom: "8px",
                  width: "3px",
                  background: theme.palette.primary.main,
                  borderRadius: "4px",
                  opacity: 0.8,
                },
              }}
            >
              {metadata.summary}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default WatchInfoOverlay;
