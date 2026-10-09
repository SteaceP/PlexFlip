import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Backdrop,
  Box,
  Button,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import { queryBuilder } from "../../plex/QuickFunctions";
import ReactPlayer from "../../common/ReactPlayer";

interface WatchErrorBackdropProps {
  error: string | false;
  onClose: () => void;
  metadata: Plex.Metadata | null;
  playerRef: React.RefObject<ReactPlayer | null>;
}

export const WatchErrorBackdrop: React.FC<WatchErrorBackdropProps> = ({
  error,
  onClose,
  metadata,
  playerRef,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Backdrop
      open={error !== false}
      sx={{
        zIndex: 10000,
        backdropFilter: "blur(8px)",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          p: 4,
          background: "#121216",
          color: theme.palette.text.primary,
          borderRadius: 2,
          maxWidth: "500px",
          width: "90%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" sx={{ mb: 3, textAlign: "center" }}>
          {error}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
            width: "100%",
            justifyContent: "center",
          }}
        >
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              onClose();

              // If the video is already 5 seconds in, reload the page with the current time
              const currentTime = playerRef.current?.getCurrentTime() ?? 0;
              if (currentTime > 5) {
                const url = new URL(window.location.href);
                url.searchParams.set(
                  "t",
                  Math.floor(currentTime * 1000).toString(),
                );
                window.location.href = url.toString();
              } else {
                window.location.reload();
              }
            }}
          >
            Reload
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              onClose();
              if (!metadata) return navigate("/");

              if (metadata.type === "movie") {
                navigate(
                  `/browse/${metadata.librarySectionID}?${queryBuilder({
                    mid: metadata.ratingKey,
                  })}`,
                );
              }

              if (metadata.type === "episode") {
                navigate(
                  `/browse/${metadata.librarySectionID}?${queryBuilder({
                    mid: metadata.grandparentRatingKey,
                  })}`,
                );
              }
            }}
          >
            Home
          </Button>
          <Button variant="text" onClick={onClose}>
            Ignore
          </Button>
        </Box>
      </Paper>
    </Backdrop>
  );
};

export default WatchErrorBackdrop;
