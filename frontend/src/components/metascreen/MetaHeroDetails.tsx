import React from "react";
import { Box, Button, Collapse, Tooltip, Typography } from "@mui/material";
import {
  CheckCircleOutlineRounded,
  CheckCircleRounded,
  PlayArrowRounded,
  QueueMusicRounded,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getLibraryMetaChildren,
  getTranscodeImageURL,
  setMediaPlayedStatus,
} from "../../plex";
import { durationToText } from "../MovieItemSlider";
import { HeroWatchListButton } from "../MovieItem";
import { useBigReader } from "../BigReader";
import { useConfirmModal } from "../ConfirmModal";
import { useAudioPlayerStore } from "../../states/AudioPlayerState";
import RatingButton from "./RatingButton";

export interface MetaHeroDetailsProps {
  data: Plex.Metadata;
  setData: (data: Plex.Metadata) => void;
  musicChildren: Plex.Metadata[] | null;
  languages: string[] | null;
  subTitles: string[] | null;
}

export function MetaHeroDetails({
  data,
  setData,
  musicChildren,
  languages,
  subTitles,
}: MetaHeroDetailsProps) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "center", sm: "flex-end" },
        justifyContent: "center",
        width: "100%",
        padding: "0 3%",
        mt: { xs: "-25vh", sm: "-35vh", md: "-55vh" },
        gap: "3%",
        zIndex: 2,
      }}
    >
      {/* Poster */}
      <Box
        sx={{
          width: { xs: "60%", sm: "30%" },
          maxWidth: { xs: "280px", sm: "none" },
          mb: { xs: 4, sm: 0 },
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: (theme) =>
            `0 20px 25px -5px ${theme.palette.common.black}`,
          position: "relative",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "scale(1.02)",
            boxShadow: (theme) =>
              `0 25px 30px -5px ${theme.palette.common.black}`,
          },
        }}
      >
        <img
          src={`${getTranscodeImageURL(data?.thumb as string, 600, 900)}`}
          alt={data?.title || ""}
          style={{
            width: "100%",
            aspectRatio: ["artist", "album", "track"].includes(
              data?.type || ""
            )
              ? "1/1"
              : "2/3",
            backgroundColor: "#00000088",
            objectFit: "cover",
            display: "block",
          }}
        />
      </Box>

      {/* Info & Details */}
      <Box
        sx={{
          width: { xs: "100%", sm: "70%" },
          display: "flex",
          flexDirection: "column",
          alignItems: { xs: "center", sm: "flex-start" },
          justifyContent: "flex-end",
          height: "100%",
          marginLeft: { xs: 0, sm: "1%" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: { xs: "center", sm: "flex-start" },
            justifyContent: "flex-start",
            width: "100%",
            height: "65%",
          }}
        >
          {/* Media Type */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: { xs: "center", sm: "flex-start" },
              mb: { xs: 0, sm: "-10px" },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "18px", sm: "24px" },
                fontWeight: "900",
                letterSpacing: "0.1em",
                color: (theme) => theme.palette.primary.main,
                textTransform: "uppercase",
              }}
            >
              {data?.type}
            </Typography>
          </Box>

          {/* Title */}
          <Typography
            sx={{
              fontSize: { xs: "2rem", sm: "3rem" },
              fontWeight: "bold",
              mt: 0,
              mb: { xs: 1, sm: 0 },
              lineHeight: { xs: 1.2, sm: "normal" },
              textAlign: { xs: "center", sm: "left" },
              color: (theme) => theme.palette.text.primary,
            }}
          >
            {data?.title}
          </Typography>

          {/* Artist/Album Parent Link */}
          {["album", "track"].includes(data?.type || "") &&
            (data?.parentTitle || data?.grandparentTitle) && (
              <Typography
                variant="h6"
                sx={{
                  color: "#e5a00d",
                  fontWeight: 600,
                  cursor:
                    data?.grandparentRatingKey || data?.parentRatingKey
                      ? "pointer"
                      : "default",
                  "&:hover":
                    data?.grandparentRatingKey || data?.parentRatingKey
                      ? { textDecoration: "underline" }
                      : {},
                  mt: { xs: 0.5, sm: 0 },
                  mb: { xs: 1, sm: 0.5 },
                  textAlign: { xs: "center", sm: "left" },
                }}
                onClick={() => {
                  const targetKey =
                    data?.grandparentRatingKey || data?.parentRatingKey;
                  if (targetKey) {
                    setSearchParams({ mid: targetKey.toString() });
                  }
                }}
              >
                {data?.grandparentTitle || data?.parentTitle}
              </Typography>
            )}

          {/* Badges / Metrics Row */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: { xs: "center", sm: "flex-start" },
              mt: 1,
              mb: 1,
              gap: 1,
            }}
          >
            {data?.type === "show" &&
              data?.leafCount === data?.viewedLeafCount && (
                <CheckCircleRounded
                  sx={{
                    color: (theme) => theme.palette.primary.light,
                    fontSize: "large",
                  }}
                />
              )}
            {data?.type === "movie" && (data?.viewCount ?? 0) > 0 && (
              <CheckCircleRounded
                sx={{
                  color: (theme) => theme.palette.primary.light,
                  fontSize: "large",
                }}
              />
            )}
            {data?.contentRating && (
              <Typography
                sx={{
                  fontSize: "medium",
                  fontWeight: "light",
                  color: (theme) => theme.palette.text.secondary,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: "5px",
                  px: 1,
                  py: 0.2,
                }}
              >
                {data?.contentRating}
              </Typography>
            )}
            {data?.year && (
              <Typography
                sx={{
                  fontSize: "medium",
                  fontWeight: "light",
                  color: (theme) => theme.palette.text.secondary,
                }}
              >
                {data?.year}
              </Typography>
            )}
            {data?.rating && (
              <Typography
                sx={{
                  fontSize: "medium",
                  fontWeight: "light",
                  color: (theme) => theme.palette.text.secondary,
                }}
              >
                {data?.rating}
              </Typography>
            )}
            {data?.duration &&
              ["episode", "movie", "album", "track"].includes(
                data?.type
              ) && (
                <Typography
                  sx={{
                    fontSize: "medium",
                    fontWeight: "light",
                    color: (theme) => theme.palette.text.secondary,
                  }}
                >
                  {durationToText(data?.duration)}
                </Typography>
              )}
            {data?.type === "show" &&
              data?.leafCount &&
              data?.childCount && (
                <Typography
                  sx={{
                    fontSize: "medium",
                    fontWeight: "light",
                    color: (theme) => theme.palette.text.secondary,
                  }}
                >
                  {data?.childCount > 1
                    ? `${data?.childCount} Seasons`
                    : `${data?.leafCount} Episode${
                        data?.leafCount > 1 ? "s" : ""
                      }`}
                </Typography>
              )}
          </Box>

          {/* Action Buttons Row */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: { xs: "center", sm: "flex-start" },
              flexWrap: "wrap",
              gap: { xs: 1, sm: 2 },
              mt: 2,
            }}
          >
            <Button
              variant="contained"
              sx={{
                height: "38px",
                fontWeight: "bold",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                gap: 1,
                transition: "all 0.2s ease-in-out",
              }}
              onClick={async () => {
                if (data?.type === "movie")
                  navigate(
                    `/watch/${data?.ratingKey}${
                      data?.viewOffset ? `?t=${data?.viewOffset}` : ""
                    }`
                  );

                if (data?.type === "show") {
                  if (data?.OnDeck && data?.OnDeck.Metadata) {
                    navigate(
                      `/watch/${data?.OnDeck.Metadata.ratingKey}${
                        data?.OnDeck.Metadata.viewOffset
                          ? `?t=${data?.OnDeck.Metadata.viewOffset}`
                          : ""
                      }`
                    );
                  } else {
                    const firstSeason = await getLibraryMetaChildren(
                      data?.Children?.Metadata[0]?.ratingKey as string
                    );

                    if (firstSeason)
                      navigate(`/watch/${firstSeason[0].ratingKey}`);
                  }
                }

                if (data?.type === "track") {
                  useAudioPlayerStore.getState().playTrack(data);
                }

                if (data?.type === "album") {
                  if (musicChildren && musicChildren.length > 0) {
                    useAudioPlayerStore
                      .getState()
                      .playAlbum(data, musicChildren);
                  }
                }

                if (data?.type === "artist") {
                  if (musicChildren && musicChildren.length > 0) {
                    const firstAlbum = musicChildren[0];
                    const tracks = await getLibraryMetaChildren(
                      firstAlbum.ratingKey
                    );
                    if (tracks && tracks.length > 0) {
                      useAudioPlayerStore
                        .getState()
                        .playAlbum(firstAlbum, tracks);
                    }
                  }
                }
              }}
            >
              <PlayArrowRounded fontSize="medium" /> Play{" "}
              {data?.type === "show" &&
                data?.OnDeck &&
                data?.OnDeck.Metadata &&
                `${
                  data?.Children?.size && data?.Children?.size > 1
                    ? `S${data?.OnDeck.Metadata.parentIndex}`
                    : ""
                }E${data?.OnDeck.Metadata.index}`}
            </Button>

            {data?.type === "album" &&
              musicChildren &&
              musicChildren.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<QueueMusicRounded />}
                  sx={{
                    height: "38px",
                    fontWeight: "bold",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    borderColor: "rgba(229,160,13,0.5)",
                    color: "#e5a00d",
                    "&:hover": {
                      borderColor: "#e5a00d",
                      bgcolor: "rgba(229,160,13,0.1)",
                    },
                  }}
                  onClick={() => {
                    useAudioPlayerStore
                      .getState()
                      .addToQueue(musicChildren);
                  }}
                >
                  Queue Album
                </Button>
              )}

            {!["artist", "album", "track"].includes(data?.type || "") && (
              <Tooltip placement="top" arrow title="Watchlist">
                <HeroWatchListButton item={data as Plex.Metadata} />
              </Tooltip>
            )}

            {data && <RatingButton item={data} />}

            {!["artist", "album", "track"].includes(data?.type || "") && (
              <Tooltip
                placement="top"
                arrow
                title={
                  `Mark as ` +
                  (data?.type === "movie"
                    ? !Boolean(data?.viewCount)
                      ? "watched"
                      : "unwatched"
                    : data?.viewedLeafCount === data?.leafCount
                    ? "unwatched"
                    : "watched")
                }
              >
                <Button
                  variant="contained"
                  sx={{
                    height: "38px",
                    fontWeight: "bold",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    transition: "all 0.2s ease-in-out",
                    display: "flex",
                    gap: 1,
                  }}
                  onClick={async () => {
                    if (!data) return;
                    let state = "unwatched";

                    if (data?.type === "movie" && (data?.viewCount ?? 0) > 0)
                      state = "watched";
                    if (
                      data?.type === "show" &&
                      data?.viewedLeafCount === data?.leafCount
                    )
                      state = "watched";

                    useConfirmModal.getState().setModal({
                      title: `Mark as ${
                        state === "unwatched" ? "watched" : "unwatched"
                      }`,
                      message: `Are you sure you want to mark ${
                        data?.title
                      } as ${
                        state === "unwatched" ? "watched" : "unwatched"
                      }?`,
                      onConfirm: async () => {
                        switch (data.type) {
                          case "movie":
                            data.viewCount = !Boolean(data.viewCount) ? 1 : 0;
                            setData({ ...data });
                            await setMediaPlayedStatus(
                              Boolean(data.viewCount),
                              data.ratingKey
                            );
                            break;
                          case "show": {
                            const newViewedLeafCount =
                              data.viewedLeafCount === data.leafCount
                                ? 0
                                : data.leafCount;
                            data.viewedLeafCount = newViewedLeafCount;
                            setData({ ...data });
                            await setMediaPlayedStatus(
                              newViewedLeafCount === data.leafCount,
                              data.ratingKey
                            );
                            break;
                          }
                          default:
                            break;
                        }
                      },
                      onCancel: () => {},
                    });
                  }}
                >
                  {data?.type === "movie" ? (
                    !((data?.viewCount ?? 0) > 0) ? (
                      <CheckCircleOutlineRounded fontSize="small" />
                    ) : (
                      <CheckCircleRounded fontSize="small" />
                    )
                  ) : data?.type === "show" ? (
                    data?.viewedLeafCount === data?.leafCount ? (
                      <CheckCircleRounded fontSize="small" />
                    ) : (
                      <CheckCircleOutlineRounded fontSize="small" />
                    )
                  ) : null}
                </Button>
              </Tooltip>
            )}
          </Box>

          {/* Genres */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: { xs: "center", sm: "flex-start" },
              flexWrap: "wrap",
              gap: 0.5,
              mt: 2,
            }}
          >
            <Typography color="text.secondary">Genres: </Typography>
            {data?.Genre?.slice(0, 5).map((genre, index) => (
              <Typography
                key={genre.id}
                sx={{
                  color: (theme) => theme.palette.text.primary,
                  fontWeight: "medium",
                  cursor: "pointer",
                  "&:hover": {
                    color: (theme) => theme.palette.primary.main,
                    textDecoration: "none",
                  },
                  transition: "all 0.2s ease",
                }}
                onClick={() => {
                  setSearchParams(
                    new URLSearchParams({
                      bkey: `/library/sections/${data?.librarySectionID}/genre/${genre.id}`,
                    })
                  );
                }}
              >
                {genre.tag}
                {index + 1 === data?.Genre?.slice(0, 5).length ? "" : ","}
              </Typography>
            ))}
          </Box>

          {/* Audio and Subtitles */}
          <Collapse in={Boolean(languages || subTitles)}>
            <Box sx={{ mt: 1 }}>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: { xs: "center", sm: "flex-start" },
                  flexWrap: "wrap",
                  gap: 0.5,
                }}
              >
                {languages && languages.length > 0 && (
                  <>
                    <Typography color="text.secondary">Audio: </Typography>
                    {languages.slice(0, 10).map((lang, index) => (
                      <Typography
                        key={index}
                        sx={{
                          color: (theme) => theme.palette.text.primary,
                          fontWeight: "medium",
                        }}
                      >
                        {lang}
                        {index + 1 === languages.slice(0, 10).length
                          ? ""
                          : ","}
                      </Typography>
                    ))}
                  </>
                )}
              </Box>

              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: { xs: "center", sm: "flex-start" },
                  flexWrap: "wrap",
                  gap: 0.5,
                }}
              >
                {subTitles && subTitles.length > 0 && (
                  <>
                    <Typography color="text.secondary">
                      Subtitles:{" "}
                    </Typography>
                    {subTitles.slice(0, 10).map((lang, index) => (
                      <Typography
                        key={index}
                        sx={{
                          color: (theme) => theme.palette.text.primary,
                          fontWeight: "medium",
                        }}
                      >
                        {lang}
                        {index + 1 === subTitles.slice(0, 10).length
                          ? ""
                          : ","}
                      </Typography>
                    ))}
                  </>
                )}
              </Box>
            </Box>
          </Collapse>

          {/* Overview / Summary */}
          <Typography
            sx={{
              mt: 1.5,
              fontSize: "1rem",
              fontWeight: "normal",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 5,
              WebkitBoxOrient: "vertical",
              maxInlineSize: "100%",
              userSelect: "none",
              cursor: "zoom-in",
              color: (theme) => theme.palette.text.secondary,
            }}
            onClick={() => {
              if (!data?.summary) return;
              useBigReader.getState().setBigReader(data?.summary);
            }}
          >
            {data?.summary}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default MetaHeroDetails;
