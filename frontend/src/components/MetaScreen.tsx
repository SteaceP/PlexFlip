import React, { useEffect, useState } from "react";
import {
  Backdrop,
  Box,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { getBackendURL } from "../backendURL";
import { queryBuilder } from "../plex/QuickFunctions";
import { getLibraryMeta, getLibraryMetaChildren } from "../plex";
import {
  MetaHeroBanner,
  MetaHeroDetails,
  MetaPageEpisodes,
  MetaPageInfo,
  MetaPageRecommendations,
  MetaPageReviews,
  TabButton,
} from "./metascreen";

export { getMinutes } from "./metascreen";

function MetaScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<Plex.Metadata | undefined>(undefined);

  const [page, setPage] = useState<number>(0);

  const [selectedSeason, setSelectedSeason] = useState<number>(0);
  const [episodes, setEpisodes] = useState<Plex.Metadata[] | null>();

  const [languages, setLanguages] = useState<string[] | null>(null);
  const [subTitles, setSubTitles] = useState<string[] | null>(null);

  const [musicChildren, setMusicChildren] = useState<Plex.Metadata[] | null>(
    null
  );

  const [previewVidURL, setPreviewVidURL] = useState<string | null>(null);
  const [previewVidPlaying, setPreviewVidPlaying] = useState<boolean>(false);

  const mid = searchParams.get("mid");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchParams(new URLSearchParams());
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setData(undefined);
    setLoading(true);
    setEpisodes(null);
    setMusicChildren(null);
    setSelectedSeason(0);
    setLanguages(null);
    setSubTitles(null);
    setPreviewVidURL(null);
    setPreviewVidPlaying(false);
    setPage(0);

    if (!mid) return;
    getLibraryMeta(mid).then((res) => {
      const seasons = [...(res.Children?.Metadata || [])];
      setSelectedSeason(
        res.OnDeck?.Metadata?.parentIndex ??
          seasons.sort((a, b) => {
            // if the index is 0 put it at the end
            if (a.index === 0) return 1;
            if (b.index === 0) return -1;
            // sort by index
            return a.index - b.index;
          })?.[0]?.index ??
          1
      );
      setData(res);
      setLoading(false);
    });
  }, [mid]);

  useEffect(() => {
    setMusicChildren(null);
    if (!data) return;

    if (data.type === "artist" || data.type === "album") {
      getLibraryMetaChildren(data.ratingKey).then((res) => {
        setMusicChildren(res || []);
      });
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;

    if (
      !data?.Extras?.Metadata?.[0] ||
      !data?.Extras?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.key
    )
      return;

    setPreviewVidURL(
      `${getBackendURL()}/dynproxy${
        data?.Extras?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.key.split("?")[0]
      }?${queryBuilder({
        "X-Plex-Token": localStorage.getItem("accessToken"),
        ...Object.fromEntries(
          new URL(
            "http://localhost:3000" +
              data?.Extras?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.key
          ).searchParams.entries()
        ),
      })}`
    );

    const timeout = setTimeout(() => {
      setPreviewVidPlaying(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [data]);

  useEffect(() => {
    if (languages || subTitles) return;
    if (!data) return;

    switch (data.type) {
      case "show":
        {
          if (!episodes) return;

          // get the first episode to get the languages and subtitles
          const firstEpisode = episodes[0];

          // you need to request the full metadata for the episode to get the media info
          getLibraryMeta(firstEpisode.ratingKey).then((res) => {
            if (!res.Media?.[0]?.Part?.[0]?.Stream) return;

            const uniqueLanguages = Array.from(
              new Set(
                res.Media?.[0]?.Part?.[0]?.Stream?.filter(
                  (stream) => stream.streamType === 2
                ).map((stream) => stream.language ?? stream.displayTitle)
              )
            );
            const uniqueSubTitles = Array.from(
              new Set(
                res.Media?.[0]?.Part?.[0]?.Stream?.filter(
                  (stream) => stream.streamType === 3
                ).map((stream) => stream.language)
              )
            );

            setLanguages(uniqueLanguages);
            setSubTitles(uniqueSubTitles);
          });
        }
        break;
      case "movie":
        {
          if (!data.Media?.[0]?.Part?.[0]?.Stream) return;

          const uniqueLanguages = Array.from(
            new Set(
              data.Media?.[0]?.Part?.[0]?.Stream?.filter(
                (stream) => stream.streamType === 2
              ).map((stream) => stream.language ?? stream.displayTitle)
            )
          );
          const uniqueSubTitles = Array.from(
            new Set(
              data.Media?.[0]?.Part?.[0]?.Stream?.filter(
                (stream) => stream.streamType === 3
              ).map((stream) => stream.language)
            )
          );

          setLanguages(uniqueLanguages);
          setSubTitles(uniqueSubTitles);
        }
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.ratingKey, episodes]);

  useEffect(() => {
    setEpisodes(null);
    if (!data) return;

    const season = data?.Children?.Metadata?.find(
      (child) => child.index === selectedSeason
    );

    console.log("Loading data for season", season);

    if (data?.type === "show" && season?.ratingKey) {
      getLibraryMetaChildren(season?.ratingKey as string).then((res) => {
        setEpisodes(res);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason, data]);

  const refetchEpisodes = () => {
    if (!data) return;

    const season = data?.Children?.Metadata?.find(
      (child) => child.index === selectedSeason
    );

    if (data?.type === "show" && season?.ratingKey) {
      getLibraryMetaChildren(season?.ratingKey as string).then((res) => {
        setEpisodes(res);
      });
    }
  };

  if (!searchParams.has("mid")) return <></>;

  if (loading)
    return (
      <Backdrop
        open={true}
        sx={{
          zIndex: 100,
        }}
      >
        <CircularProgress />
      </Backdrop>
    );

  return (
    <Backdrop
      open={searchParams.has("mid")}
      sx={{
        overflowY: "scroll",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={() => {
        setSearchParams(new URLSearchParams());
      }}
    >
      <Box
        sx={{
          width: { xs: "100vw", sm: "90vw", md: "130vh" },
          maxWidth: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          backgroundColor: "#121216",
          mt: { xs: 0, sm: 4 },
          pb: "40vh",
          position: "relative",

          borderTopLeftRadius: { xs: 0, sm: "10px" },
          borderTopRightRadius: { xs: 0, sm: "10px" },
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <MetaHeroBanner
          art={data?.art}
          previewVidURL={previewVidURL}
          previewVidPlaying={previewVidPlaying}
          setPreviewVidPlaying={setPreviewVidPlaying}
          onClose={() => setSearchParams(new URLSearchParams())}
        />

        {data && (
          <MetaHeroDetails
            data={data}
            setData={(updated) => setData(updated)}
            musicChildren={musicChildren}
            languages={languages}
            subTitles={subTitles}
          />
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            width: "100%",
            px: "3%",
            mt: "3vh",
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: { xs: 1, md: 4 },
              mb: "10px",
              overflowX: "auto",
              flexShrink: 0,
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            <TabButton
              onClick={() => {
                setPage(0);
              }}
              selected={page === 0}
              text={
                data?.type === "movie"
                  ? "Similar Movies"
                  : data?.type === "album"
                  ? "Tracks"
                  : data?.type === "artist"
                  ? "Albums"
                  : "Episodes"
              }
            />

            {!["movie", "album"].includes(data?.type || "") && (
              <TabButton
                onClick={() => {
                  setPage(1);
                }}
                selected={page === 1}
                text="Recommendations"
              />
            )}

            <TabButton
              onClick={() => {
                setPage(2);
              }}
              selected={page === 2}
              text="Info"
            />

            <TabButton
              onClick={() => {
                setPage(3);
              }}
              selected={page === 3}
              text="Reviews"
            />

            {data?.type === "show" &&
              data?.Children &&
              data?.Children.size > 1 && (
                <Select
                  sx={{
                    ml: "auto",
                    opacity: page === 0 ? 1 : 0,
                    transition: "all 0.5s ease",
                  }}
                  size="small"
                  value={selectedSeason}
                  onChange={(e) => {
                    if (e.target.value === selectedSeason) return;
                    setSelectedSeason(e.target.value as number);
                  }}
                >
                  {data?.type === "show" &&
                    data?.Children?.Metadata?.map((season, index) => (
                      <MenuItem key={index} value={season.index}>
                        {season.title}
                      </MenuItem>
                    ))}
                </Select>
              )}
          </Box>

          <Divider sx={{ mb: 2, width: "100%" }} />

          <AnimatePresence mode="wait">
            {page === 0 && (
              <MetaPageEpisodes
                data={data}
                loading={loading}
                episodes={episodes}
                refetchEpisodes={refetchEpisodes}
                navigate={navigate}
                musicChildren={musicChildren}
              />
            )}
            {page === 1 && <MetaPageRecommendations data={data} />}
            {page === 2 && <MetaPageInfo data={data} />}
            {page === 3 && <MetaPageReviews data={data} />}
          </AnimatePresence>
        </Box>
      </Box>
    </Backdrop>
  );
}

export default MetaScreen;
