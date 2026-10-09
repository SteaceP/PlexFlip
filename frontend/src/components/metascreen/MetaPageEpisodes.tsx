import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Collapse, Grid } from "@mui/material";
import { motion } from "framer-motion";
import { useConfirmModal } from "../ConfirmModal";
import { setMediaPlayedStatus } from "../../plex";
import MovieItem from "../MovieItem";
import EpisodeItem from "./EpisodeItem";
import AlbumTrackList from "./AlbumTrackList";
import ArtistAlbumsList from "./ArtistAlbumsList";

export interface MetaPageEpisodesProps {
  data: Plex.Metadata | undefined;
  loading: boolean;
  episodes: Plex.Metadata[] | null | undefined;
  refetchEpisodes: () => void;
  navigate: (path: string) => void;
  musicChildren: Plex.Metadata[] | null | undefined;
}

export function MetaPageEpisodes({
  data,
  loading: _loading,
  episodes,
  refetchEpisodes,
  navigate,
  musicChildren,
}: MetaPageEpisodesProps) {
  const [selectedEpisodes, setSelectedEpisodes] = useState<Plex.Metadata[]>([]);
  const [selectMode, setSelectMode] = useState<boolean>(false);

  useEffect(() => {
    if (!selectMode) setSelectedEpisodes([]);
  }, [selectMode]);

  return (
    <>
      <Collapse in={selectMode}>
        {/* Buttons for marking selected episodes as watched or un-watched and a button for select all */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            flexWrap: "wrap",
            gap: { xs: 1, sm: 2 },
            mb: 2,
          }}
        >
          <Button
            variant="contained"
            sx={{
              fontWeight: "bold",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              transition: "all 0.2s ease-in-out",
            }}
            onClick={() => {
              setSelectMode(false);
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            sx={{
              fontWeight: "bold",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              transition: "all 0.2s ease-in-out",
            }}
            onClick={() => {
              if (selectedEpisodes.length === episodes?.length) {
                setSelectedEpisodes([]);
              } else {
                setSelectedEpisodes(episodes ?? []);
              }
            }}
          >
            {selectedEpisodes.length === episodes?.length
              ? "Unselect All"
              : "Select All"}
          </Button>

          <Button
            variant="contained"
            sx={{
              fontWeight: "bold",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              transition: "all 0.2s ease-in-out",
            }}
            onClick={async () => {
              useConfirmModal.getState().setModal({
                title: `Mark as watched`,
                message: `Are you sure you want to mark ${selectedEpisodes.length} episodes as watched?`,
                onConfirm: async () => {
                  await Promise.all(
                    selectedEpisodes.map(async (episode) => {
                      setMediaPlayedStatus(true, episode.ratingKey);
                    })
                  );
                  refetchEpisodes();
                  setSelectMode(false);
                },
                onCancel: () => {},
              });
            }}
          >
            Mark as Watched
          </Button>
          <Button
            variant="contained"
            sx={{
              fontWeight: "bold",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              transition: "all 0.2s ease-in-out",
            }}
            onClick={async () => {
              useConfirmModal.getState().setModal({
                title: `Mark as unwatched`,
                message: `Are you sure you want to mark ${selectedEpisodes.length} episodes as unwatched?`,
                onConfirm: async () => {
                  await Promise.all(
                    selectedEpisodes.map(async (episode) => {
                      await setMediaPlayedStatus(false, episode.ratingKey);
                    })
                  );
                  refetchEpisodes();
                  setSelectMode(false);
                },
                onCancel: () => {},
              });
            }}
          >
            Mark as Unwatched
          </Button>
        </Box>
      </Collapse>
      {data?.type === "movie" && !data && (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            mt: 10,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {data?.type === "movie" && data.Related?.Hub?.[0] && (
        <Grid
          container
          spacing={2}
          sx={{
            width: "100%",
          }}
        >
          {data.Related?.Hub?.[0]?.Metadata?.slice(0, 10).map((movie) => (
            <Grid key={movie.ratingKey} size={{ lg: 3, md: 4, sm: 6, xs: 12 }}>
              <MovieItem item={movie} />
            </Grid>
          ))}
        </Grid>
      )}

      {data?.type === "show" && !episodes && (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            mt: 10,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {data?.type === "show" && episodes && (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            gap: 1,
          }}
        >
          {episodes?.map((episode) => (
            <EpisodeItem
              key={episode.ratingKey}
              item={episode}
              refetchData={refetchEpisodes}
              selected={selectedEpisodes.some(
                (selected) => selected.ratingKey === episode.ratingKey
              )}
              setSelected={() => {
                if (
                  selectedEpisodes.some(
                    (selected) => selected.ratingKey === episode.ratingKey
                  )
                ) {
                  setSelectedEpisodes(
                    selectedEpisodes.filter(
                      (selected) => selected.ratingKey !== episode.ratingKey
                    )
                  );
                } else {
                  setSelectedEpisodes([...selectedEpisodes, episode]);
                }
              }}
              selectMode={selectMode}
              setSelectMode={setSelectMode}
              onClick={() => {
                navigate(
                  `/watch/${episode.ratingKey}${
                    episode.viewOffset ? `?t=${episode.viewOffset}` : ""
                  }`
                );
              }}
            />
          ))}
        </Box>
      )}

      {data?.type === "album" && (
        <AlbumTrackList album={data} tracks={musicChildren || null} />
      )}

      {data?.type === "artist" && (
        <ArtistAlbumsList artist={data} albums={musicChildren || null} />
      )}
    </>
  );
}

export default MetaPageEpisodes;
