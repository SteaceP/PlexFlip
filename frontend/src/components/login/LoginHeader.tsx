import React from "react";
import { Box, Stack, Typography } from "@mui/material";

export default function LoginHeader() {
  return (
    <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ mb: 3.5 }}>
      <Box
        sx={{
          width: 58,
          height: 58,
          borderRadius: "16px",
          background: "linear-gradient(135deg, #e5a00d 0%, #e07000 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(229, 160, 13, 0.35)",
          mb: 0.5,
        }}
      >
        <Typography sx={{ fontWeight: 900, fontSize: "1.8rem", color: "#000" }}>
          P
        </Typography>
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.02em" }}>
        Sign in to Plex
      </Typography>
      <Typography variant="body2" sx={{ color: "#94A3B8", maxWidth: 360, lineHeight: 1.5 }}>
        Authenticate with your Plex account to access and stream your libraries.
      </Typography>
    </Stack>
  );
}
