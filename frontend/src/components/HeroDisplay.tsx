import {
  PlayArrowRounded,
  InfoOutlined,
  VolumeOffRounded,
  VolumeUpRounded,
  PauseRounded,
} from "@mui/icons-material";
import { Box, Typography, Button, IconButton } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePreviewPlayer } from "../states/PreviewPlayerState";
import ReactPlayer from "../common/ReactPlayer";
import { useBigReader } from "./BigReader";
import { HeroWatchListButton } from "./MovieItem";
import { getBackendURL } from "../backendURL";
import { queryBuilder } from "../plex/QuickFunctions";
import { getLibraryMeta, getLibraryMetaChildren, getTranscodeImageURL } from "../plex";
import { useAudioPlayerStore } from "../states/AudioPlayerState";

function HeroDisplay({ item }: { item: Plex.Metadata }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { MetaScreenPlayerMuted, setMetaScreenPlayerMuted } =
    usePreviewPlayer();

  const previewVidURL = item?.Extras?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.key
    ? `${getBackendURL()}/dynproxy${item?.Extras?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.key.split("?")[0]}?${
        queryBuilder({
          "X-Plex-Token": localStorage.getItem("accessToken"),
          ...Object.fromEntries(new URL("http://localhost:3000" + item?.Extras?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.key).searchParams.entries()),
        })
      }`
    : null;

  const [previewVidPlaying, setPreviewVidPlaying] = useState<boolean>(false);

  useEffect(() => {
    setPreviewVidPlaying(false);

    if (!previewVidURL) return;

    const timeout = setTimeout(() => {
      if (window.scrollY > 100) return;
      if (searchParams.has("mid")) return;
      if (document.location.href.includes("mid=")) return;
      setPreviewVidPlaying(true);
    }, 3000);

    const onScroll = () => {
      if (!previewVidURL) return;
      if (window.scrollY > 100) setPreviewVidPlaying(false);
      else setPreviewVidPlaying(true);
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("scroll", onScroll);
    };
  }, [previewVidURL, searchParams]);

  return (
    <Box
      sx={{
        width: "100%",
        height: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}
    >
      {previewVidURL && (
        <Box
          sx={{
            position: "absolute",
            right: "2vw",
            bottom: { xs: "20vh", sm: "15vh", md: "20vh" },
            opacity: 1,
            transition: "all 1s ease",
            zIndex: 2,
            cursor: "pointer",
            pointerEvents: "all",

            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <IconButton
            sx={{
              backgroundColor: "#00000088",
            }}
            onClick={() => {
              setPreviewVidPlaying(!previewVidPlaying);
            }}
          >
            {previewVidPlaying ? <PauseRounded /> : <PlayArrowRounded />}
          </IconButton>

          <IconButton
            sx={{
              backgroundColor: "#00000088",
            }}
            onClick={() => {
              setMetaScreenPlayerMuted(!MetaScreenPlayerMuted);
            }}
          >
            {MetaScreenPlayerMuted ? <VolumeOffRounded /> : <VolumeUpRounded />}
          </IconButton>
        </Box>
      )}

      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          background: `linear-gradient(90deg, #000000AA, #000000AA), url(${getTranscodeImageURL(
            item?.art || item?.thumb,
            1920,
            1080
          )})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
          position: "relative",
        }}
      >
        {previewVidURL && (
          <Box
            sx={{
              position: "absolute",
              width: "100%",
              height: "100vh",
              left: 0,
              top: 0,
              filter: "brightness(0.5)",
              opacity: previewVidPlaying ? 1 : 0,
              transition: "all 2s ease",
              backgroundColor: previewVidPlaying ? "#000000" : "transparent",
              pointerEvents: "none",
              overflow: "hidden",
              zIndex: 0,
            }}
          >
            <ReactPlayer
              url={previewVidURL}
              controls={false}
              width="100%"
              height="100%"
              playing={previewVidPlaying}
              volume={MetaScreenPlayerMuted ? 0 : 0.5}
              muted={MetaScreenPlayerMuted}
              onEnded={() => {
                setPreviewVidPlaying(false);
              }}
              pip={false}
              config={{
                file: {
                  attributes: {
                    controlsList: "nodownload",
                    disablePictureInPicture: true,
                    disableRemotePlayback: true,
                    style: {
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                      zIndex: -1,
                    },
                  },
                },
              }}
            />
          </Box>
        )}

        <Box
          sx={{
            ml: { xs: 2, sm: 5, md: 10 },
            mb: { xs: "30vh", sm: "25vh", md: "40vh" },
            zIndex: 1,
            mr: { xs: 2, sm: 4, md: 0 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
              mb: 0,
            }}
          >
            {/* <img
              src="/plexIcon.png"
              alt=""
              height="35"
              style={{
                aspectRatio: 1,
                borderRadius: 8,
              }}
            /> */}
            <Typography
              sx={{
                fontSize: { xs: "16px", md: "24px" },
                fontWeight: "900",
                letterSpacing: "0.1em",
                color: (theme) => theme.palette.primary.main,
                textTransform: "uppercase",
              }}
            >
              {item.type}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3rem" },
              fontWeight: "bold",
            }}
          >
            {item.title}
          </Typography>
          <Typography
            sx={{
              fontSize: "medium",
              fontWeight: "light",
              maxWidth: { xs: "85vw", sm: "60vw", md: "35vw" },

              // make the text max 4 lines long and add ellipsis
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",

              userSelect: "none",
              cursor: "zoom-in",
            }}
            onClick={() => {
              useBigReader.getState().setBigReader(item.summary);
            }}
          >
            {item.summary}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-start",
              mt: { xs: 2.5, sm: 4 },
              gap: { xs: 1.5, sm: 2 },
              ml: 0,
              minHeight: "36.5px",
            }}
          >
            <Button
              variant="contained"
              sx={{
                fontWeight: "bold",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                gap: "10px",
                transition: "all 0.2s ease-in-out",
              }}
              onClick={async () => {
                if (!item) return;
                if (item.type === "track") {
                  useAudioPlayerStore.getState().playTrack(item);
                } else if (item.type === "album") {
                  const tracks = await getLibraryMetaChildren(item.ratingKey);
                  if (tracks && tracks.length > 0) {
                    useAudioPlayerStore.getState().playAlbum(item, tracks);
                  }
                } else if (item.type === "artist") {
                  const albums = await getLibraryMetaChildren(item.ratingKey);
                  if (albums && albums.length > 0) {
                    const tracks = await getLibraryMetaChildren(albums[0].ratingKey);
                    if (tracks && tracks.length > 0) {
                      useAudioPlayerStore.getState().playAlbum(albums[0], tracks);
                    }
                  }
                } else if (item.type === "show") {
                  try {
                    const data = await getLibraryMeta(item.ratingKey);
                    if (data?.OnDeck?.Metadata) {
                      navigate(
                        `/watch/${data.OnDeck.Metadata.ratingKey}${
                          data.OnDeck.Metadata.viewOffset
                            ? `?t=${data.OnDeck.Metadata.viewOffset}`
                            : ""
                        }`
                      );
                      return;
                    }
                    if (data?.Children?.Metadata?.[0]) {
                      const episodes = await getLibraryMetaChildren(
                        data.Children.Metadata[0].ratingKey
                      );
                      if (episodes && episodes.length > 0) {
                        navigate(`/watch/${episodes[0].ratingKey}`);
                        return;
                      }
                    }
                  } catch (e) {
                    console.error("Failed to resolve show episode:", e);
                  }
                  navigate(`/watch/${item.ratingKey}`);
                } else {
                  navigate(
                    `/watch/${item.ratingKey}${
                      item.viewOffset ? `?t=${item.viewOffset}` : ""
                    }`
                  );
                }
              }}
            >
              <PlayArrowRounded fontSize="medium" /> Play
            </Button>

            <Button
              variant="contained"
              sx={{
                fontWeight: "bold",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                "&:hover": {
                  "& > *:nth-child(2)": {
                    width: "91px",
                    ml: "10px",
                  },
                },
                transition: "all 0.2s ease-in-out",
              }}
              onClick={() => {
                if (!item) return;
                setPreviewVidPlaying(false);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set("mid", item.ratingKey.toString());
                  return next;
                });
              }}
            >
              <InfoOutlined fontSize="medium" />{" "}
              <Typography
                sx={{
                  width: "0px",
                  userSelect: "none",
                  display: "inline",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  transition: "all 0.2s ease-in-out",

                  fontSize: "0.875rem",
                  lineHeight: "1.75",
                }}
              >
                More Info
              </Typography>
            </Button>

            {!["artist", "album", "track"].includes(item.type) && (
              <HeroWatchListButton item={item} />
            )}
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          width: "100%",
          height: { xs: "50vh", sm: "45vh", md: "40vh" },
          position: "absolute",
          bottom: 0,
          left: 0,

          backgroundImage:
            "linear-gradient(180deg, #00000000, #000000AA, #000000FF)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "transparent",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}

export default HeroDisplay;
