import { Box, Typography } from "@mui/material";
import React from "react";
import { getLibraryDir } from "../plex";
import { ArrowForwardIosRounded } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import MovieItem from "./MovieItem";

function MovieItemSlider({
  title,
  dir,
  props,
  filter,
  link,
  shuffle,
  data,
  plexTvSource,
}: {
  title: string;
  dir?: string;
  props?: { [key: string]: any };
  filter?: (item: Plex.Metadata) => boolean;
  link?: string;
  shuffle?: boolean;
  data?: Plex.Metadata[];
  plexTvSource?: boolean;
}) {
  const [, setSearchParams] = useSearchParams();
  const [items, setItems] = React.useState<Plex.Metadata[] | null>(
    data ?? null
  );

  const [currPage, setCurrPage] = React.useState(0);
  const touchStartX = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return; // ignore small movements
    if (delta > 0) {
      // swiped left → next page
      setCurrPage((p) => (p + 1 > Math.ceil(itemCount / itemsPerPage) - 1 ? 0 : p + 1));
    } else {
      // swiped right → prev page
      setCurrPage((p) => (p - 1 < 0 ? Math.ceil(itemCount / itemsPerPage) - 1 : p - 1));
    }
  };

  const calculateItemsPerPage = (width: number) => {
    if (width < 400) return 1;
    if (width < 600) return 1;
    if (width < 1200) return 2;
    if (width < 1500) return 4;
    if (width < 2000) return 5;
    if (width < 3000) return 6;
    if (width < 4000) return 7;
    if (width < 5000) return 8;
    return 6;
  };

  const [itemsPerPage, setItemsPerPage] = React.useState(
    calculateItemsPerPage(window.innerWidth)
  );

  React.useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(calculateItemsPerPage(window.innerWidth));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchData = async () => {
    if (!dir) {
      setItems([]);
      return;
    }

    try {
      const res = await getLibraryDir(dir, props);
      let media: Plex.Metadata[] = res?.Metadata || [];
      if (filter) media = media.filter(filter);

      setItems(shuffle ? shuffleArray(media) : media);
    } catch (err) {
      setItems([]);
    }
  };

  React.useEffect(() => {
    if (data) return setItems(data);

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dir, filter, props, shuffle]);

  if (!items || items.length === 0) return null;

  const itemCount = items.slice(0, itemsPerPage * 5).length;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        height: "auto",
        gap: "10px",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "auto",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          px: "2.5vw",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            mb: "-10px",
            cursor: link ? "pointer" : "default",
            "&:hover": {
              gap: "20px",
            },
            "&:hover > :nth-child(2)": {
              opacity: 1,
              gap: "5px",
            },
            transition: "all 0.5s ease",
            userSelect: "none",
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (link)
              setSearchParams(
                new URLSearchParams({
                  bkey: link,
                })
              );
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: "1.3rem", sm: "1.6rem", md: "2rem" },
              fontWeight: "bold",
              mb: "0px",
            }}
          >
            {title}
          </Typography>

          {link && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                mt: "0px",
                opacity: 0,
                gap: "0px",
                transition: "all 0.5s ease",
                color: "primary.main",
              }}
            >
              <Typography sx={{ fontSize: "1rem" }}>Browse</Typography>
              <ArrowForwardIosRounded fontSize="small" />
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            visibility: itemCount > itemsPerPage ? "visible" : "hidden",
          }}
        >
          {Array(Math.ceil(itemCount / itemsPerPage))
            .fill(0)
            .map((_, i) => {
              return (
                <Box
                  key={i}
                  sx={{
                    width: "10px",
                    height: "4px",
                    backgroundColor: i === currPage ? "#FFFFFF" : "#FFFFFF55",
                    transition: "all 0.5s ease",
                    mx: "2px",
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrPage(i);
                  }}
                />
              );
            })}
        </Box>
      </Box>
      <Box
        sx={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          height: "auto",
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",

          py: "10px",
          whiteSpace: "nowrap",
          overflowX: "clip",
          overflowY: "visible",
          position: "relative",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Box
          sx={{
            width: { xs: "36px", sm: "calc(2.5vw)" },
            minWidth: { xs: "36px", sm: "40px" },
            height: "100%",
            maxHeight: "220px",
            position: "absolute",
            left: "0px",
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(6px)",
            zIndex: 25,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: "0 6px 6px 0",
            visibility: itemCount > itemsPerPage ? "visible" : "hidden",

            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
            },

            transition: "all 0.3s ease",
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setCurrPage((curr) =>
              curr - 1 < 0
                ? Math.ceil(itemCount / itemsPerPage) - 1
                : curr - 1
            );
          }}
        >
          <ArrowForwardIosRounded
            sx={{
              transform: "rotate(180deg)",
            }}
            fontSize="large"
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            transform: `translateX(calc((-${currPage} * (100vw - 5vw) + 2.5vw)))`,
            alignItems: "flex-start",
            justifyContent: "center",
            width: `auto`,
            gap: "10px",
            transition: { xs: "transform 0.35s ease", md: "transform 1s ease" },
          }}
        >
          {items?.slice(0, itemsPerPage * 5).map((item, i) => (
            <MovieItem
              key={item.ratingKey}
              item={item}
              itemsPerPage={itemsPerPage}
              index={i}
              PlexTvSource={plexTvSource}
              refetchData={
                dir && dir.endsWith("onDeck") ? fetchData : undefined
              }
            />
          ))}
        </Box>
        <Box
          sx={{
            width: { xs: "36px", sm: "calc(2.5vw)" },
            minWidth: { xs: "36px", sm: "40px" },
            height: "100%",
            maxHeight: "220px",
            position: "absolute",
            right: "0px",
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(6px)",
            zIndex: 25,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: "6px 0 0 6px",
            visibility: itemCount > itemsPerPage ? "visible" : "hidden",

            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
            },

            transition: "all 0.3s ease",
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setCurrPage((curr) =>
              curr + 1 > Math.ceil(itemCount / itemsPerPage) - 1
                ? 0
                : curr + 1
            );
          }}
        >
          <ArrowForwardIosRounded fontSize="large" />
        </Box>
      </Box>
    </Box>
  );
}

export default MovieItemSlider;

export function durationToText(duration: number): string {
  const hours = Math.floor(duration / 1000 / 60 / 60);
  const minutes = (duration / 1000 / 60 / 60 - hours) * 60;

  return (
    (hours > 0 ? `${hours}h` : "") +
    (Math.floor(minutes) > 0 ? ` ${Math.floor(minutes)}m` : "")
  ).trim();
}

export const shuffleArray = (array: any[]) => {
  const oldArray = [...array];
  const newArray = [];

  while (oldArray.length) {
    const index = Math.floor(Math.random() * oldArray.length);
    newArray.push(oldArray.splice(index, 1)[0]);
  }

  return newArray;
};
