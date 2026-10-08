import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import { motion } from "framer-motion";
import MovieItem from "../MovieItem";

export interface MetaPageRecommendationsProps {
  data: Plex.Metadata | undefined;
}

export function MetaPageRecommendations({ data }: MetaPageRecommendationsProps) {
  if (!data) return <></>;
  if (data.Related?.Hub?.length === 0) return <>Nothing here</>;

  const validHubs =
    data.Related?.Hub?.filter(
      (hub) => hub.Metadata && hub.Metadata.length > 0
    ) || [];

  if (validHubs.length === 0) return <>Nothing here</>;

  return (
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
        gap: "60px",
        userSelect: "none",
      }}
    >
      {validHubs.map((hub) => (
        <Box
          key={hub.title || hub.key || hub.hubKey}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#FFFFFF",
            }}
          >
            {hub.title}
          </Typography>

          <Grid container spacing={2} sx={{ width: "100%" }}>
            {hub.Metadata?.map((item) => (
              <Grid key={item.ratingKey} size={{ lg: 3, md: 4, sm: 6, xs: 12 }}>
                <MovieItem item={item} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

export default MetaPageRecommendations;
