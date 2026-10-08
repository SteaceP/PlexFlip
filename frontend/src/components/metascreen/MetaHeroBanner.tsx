import React from "react";
import { Box, IconButton } from "@mui/material";
import {
  CloseRounded,
  VolumeOffRounded,
  VolumeUpRounded,
} from "@mui/icons-material";
import ReactPlayer from "react-player";
import { getTranscodeImageURL } from "../../plex";
import { usePreviewPlayer } from "../../states/PreviewPlayerState";

export interface MetaHeroBannerProps {
  art: string | undefined;
  previewVidURL: string | null;
  previewVidPlaying: boolean;
  setPreviewVidPlaying: (playing: boolean) => void;
  onClose: () => void;
}

export function MetaHeroBanner({
  art,
  previewVidURL,
  previewVidPlaying,
  setPreviewVidPlaying,
  onClose,
}: MetaHeroBannerProps) {
  const { MetaScreenPlayerMuted, setMetaScreenPlayerMuted } =
    usePreviewPlayer();

  return (
    <>
      {/* Close button — always on top of everything */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
          zIndex: 50,
        }}
      >
        <IconButton
          sx={{ backgroundColor: "#000000BB" }}
          onClick={onClose}
        >
          <CloseRounded fontSize="medium" />
        </IconButton>
        <IconButton
          sx={{
            backgroundColor: "#000000BB",
            opacity: previewVidURL ? 1 : 0,
            transition: "all 1s ease",
          }}
          onClick={() => setMetaScreenPlayerMuted(!MetaScreenPlayerMuted)}
        >
          {MetaScreenPlayerMuted ? <VolumeOffRounded /> : <VolumeUpRounded />}
        </IconButton>
      </Box>

      {/* Backdrop image and preview video player */}
      <Box
        sx={{
          width: "100%",
          maxWidth: "100%",
          height: { xs: "50vh", sm: "auto" },
          aspectRatio: { xs: "auto", sm: "16/9" },
          backgroundImage: `url(${getTranscodeImageURL(
            art as string,
            1920,
            1080
          )})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#000000AA",
          backgroundBlendMode: "darken",

          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          padding: { xs: 0, sm: "1%" },
          borderTopLeftRadius: { xs: 0, sm: "10px" },
          borderTopRightRadius: { xs: 0, sm: "10px" },
          position: "relative",
          zIndex: 0,
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            left: 0,
            top: 0,
            filter: "brightness(0.8)",
            opacity: previewVidPlaying ? 1 : 0,
            transition: "all 2s ease",
            backgroundColor: previewVidPlaying ? "#000000" : "transparent",
            pointerEvents: "none",

            borderTopLeftRadius: { xs: 0, sm: "10px" },
            borderTopRightRadius: { xs: 0, sm: "10px" },
            overflow: "hidden",

            "& video": {
              objectFit: "cover",
              width: "100%",
              height: "100%",
            },
          }}
        >
          <ReactPlayer
            url={previewVidURL ?? undefined}
            controls={false}
            width="100%"
            height="100%"
            autoplay={true}
            playing={previewVidPlaying}
            volume={MetaScreenPlayerMuted ? 0 : 0.5}
            muted={MetaScreenPlayerMuted}
            onEnded={() => {
              setPreviewVidPlaying(false);
            }}
            style={{
              width: "100%",
              height: "100%",
            }}
            pip={false}
            config={{
              file: {
                attributes: {
                  disablePictureInPicture: true,
                  style: { objectFit: "cover" },
                },
              },
            }}
          />
        </Box>
      </Box>

      {/* Gradient fade overlay */}
      <Box
        sx={{
          mt: { xs: "-25vh", sm: "-15vh" },
          height: { xs: "25vh", sm: "30vh" },
          width: "100%",
          background:
            "linear-gradient(180deg, #12121600, #121216FF, #121216FF)",
          zIndex: 1,
          pointerEvents: "none",
          position: "relative",
        }}
      />
    </>
  );
}

export default MetaHeroBanner;
