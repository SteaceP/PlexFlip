import React from "react";
import { Box, CircularProgress, Grid, Typography } from "@mui/material";
import MovieItem from "../MovieItem";

export interface ArtistAlbumsListProps {
  artist: Plex.Metadata;
  albums: Plex.Metadata[] | null;
}

export function ArtistAlbumsList({
  artist: _artist,
  albums,
}: ArtistAlbumsListProps) {
  if (!albums) {
    return (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          py: 6,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (albums.length === 0) {
    return (
      <Box sx={{ width: "100%", py: 4, textAlign: "center", color: "#64748b" }}>
        <Typography>No albums found for this artist.</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ width: "100%", mt: 1 }}>
      {albums.map((album) => (
        <Grid key={album.ratingKey} size={{ lg: 3, md: 4, sm: 6, xs: 12 }}>
          <MovieItem item={album} />
        </Grid>
      ))}
    </Grid>
  );
}

export default ArtistAlbumsList;
