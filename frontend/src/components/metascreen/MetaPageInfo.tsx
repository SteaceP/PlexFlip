import React from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { durationToText } from "../MovieItemSlider";
import ActorItem from "./ActorItem";

export interface MetaPageInfoProps {
  data: Plex.Metadata | undefined;
}

export function MetaPageInfo({ data }: MetaPageInfoProps) {
  if (["artist", "album", "track"].includes(data?.type || "")) {
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
          gap: 3,
          p: 1,
          userSelect: "none",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
          Track & Album Details
        </Typography>

        <Grid container spacing={2}>
          {data?.studio && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "rgba(255,255,255,0.04)",
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8", textTransform: "uppercase" }}
                >
                  Record Label / Studio
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: "#fff" }}
                >
                  {data.studio}
                </Typography>
              </Paper>
            </Grid>
          )}

          {data?.year && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "rgba(255,255,255,0.04)",
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8", textTransform: "uppercase" }}
                >
                  Release Year
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: "#fff" }}
                >
                  {data.year}
                </Typography>
              </Paper>
            </Grid>
          )}

          {data?.leafCount && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "rgba(255,255,255,0.04)",
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8", textTransform: "uppercase" }}
                >
                  Track Count
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: "#fff" }}
                >
                  {data.leafCount} tracks
                </Typography>
              </Paper>
            </Grid>
          )}

          {data?.duration && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "rgba(255,255,255,0.04)",
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8", textTransform: "uppercase" }}
                >
                  Total Duration
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: "#fff" }}
                >
                  {durationToText(data.duration)}
                </Typography>
              </Paper>
            </Grid>
          )}

          {data?.Media?.[0]?.audioCodec && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "rgba(255,255,255,0.04)",
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8", textTransform: "uppercase" }}
                >
                  Audio Format
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: "#e5a00d", textTransform: "uppercase" }}
                >
                  {data.Media[0].audioCodec} {data.Media[0].bitrate ? `(${data.Media[0].bitrate} kbps)` : ""}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  }

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
      <Box
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
          Cast
        </Typography>

        <Grid container spacing={2}>
          {data?.Role?.map((role) => (
            <ActorItem key={role.id || role.tag} role={role} data={data} />
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

export default MetaPageInfo;
