import React from "react";
import { CircularProgress, Stack, Typography } from "@mui/material";

interface LoginWaitingStatusProps {
  browserOpened: boolean;
}

export default function LoginWaitingStatus({ browserOpened }: LoginWaitingStatusProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      spacing={1.2}
      sx={{ pt: 0.5 }}
    >
      <CircularProgress size={16} sx={{ color: "#6366F1" }} />
      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 500 }}>
        {browserOpened
          ? "Waiting for sign-in approval... PlexFlip connects automatically."
          : "Waiting for sign-in... PlexFlip connects automatically."}
      </Typography>
    </Stack>
  );
}
