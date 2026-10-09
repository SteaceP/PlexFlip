import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Fade,
  IconButton,
  Paper,
  Popper,
  Typography,
} from "@mui/material";
import { SkipNextRounded } from "@mui/icons-material";
import { getTranscodeImageURL } from "../../plex";

interface WatchNextEpisodePopperProps {
  queue?: Plex.Metadata[];
}

export const WatchNextEpisodePopper: React.FC<WatchNextEpisodePopperProps> = ({
  queue,
}) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!queue || !queue[1]) return null;

  const nextItem = queue[1];

  return (
    <>
      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement="top-start"
        transition
        sx={{
          zIndex: 10000,
          "& .MuiPaper-root": {
            overflow: "hidden",
            borderRadius: 1,
            background: "transparent",
          },
        }}
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 10],
            },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Paper
              sx={{
                width: "35vw",
                height: "auto",
                aspectRatio: "32/8",
                overflow: "hidden",
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "flex-start",
              }}
            >
              <img
                src={`${getTranscodeImageURL(nextItem.thumb, 500, 500)}`}
                alt=""
                style={{
                  height: "100%",
                  aspectRatio: "16/9",
                  width: "auto",
                }}
              />

              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  p: 2,
                  backgroundColor: "#00000088",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.7vw",
                    fontWeight: "700",
                    letterSpacing: "0.15em",
                    color: (theme) => theme.palette.primary.main,
                    textTransform: "uppercase",
                  }}
                >
                  {nextItem.type}{" "}
                  {nextItem.type === "episode" && nextItem.index}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.8vw",
                    fontWeight: "bold",
                    color: "#FFF",
                  }}
                >
                  {nextItem.title}
                </Typography>

                <Typography
                  sx={{
                    mt: "2px",
                    fontSize: "0.6vw",
                    color: "#FFF",
                    display: "-webkit-box",
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {nextItem.summary}
                </Typography>
              </Box>
            </Paper>
          </Fade>
        )}
      </Popper>
      <IconButton
        onClick={() => {
          navigate(`/watch/${nextItem.ratingKey}`);
        }}
        onKeyDown={(e) => {
          e.preventDefault();
        }}
        onMouseEnter={(e) => setAnchorEl(e.currentTarget)}
        onMouseLeave={() => setAnchorEl(null)}
      >
        <SkipNextRounded fontSize="small" />
      </IconButton>
    </>
  );
};

export default WatchNextEpisodePopper;
