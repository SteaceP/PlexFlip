import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function LoginConnecting() {
  return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <CircularProgress size={44} sx={{ color: "#6366F1", mb: 2 }} />
      <Typography sx={{ fontWeight: 700, color: "#F8FAFC" }}>
        Connecting to Plex server...
      </Typography>
      <Typography variant="caption" sx={{ color: "#94A3B8" }}>
        Finalizing credentials and libraries
      </Typography>
    </Box>
  );
}
