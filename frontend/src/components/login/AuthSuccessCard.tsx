import React from "react";
import { Box, Button, Card, Stack, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { getBackendURL } from "../../backendURL";

export default function AuthSuccessCard() {
  const handleReturnToApp = async () => {
    try {
      const backendURL = getBackendURL();
      await fetch(backendURL ? `${backendURL}/api/auth-focus` : "/api/auth-focus", {
        method: "POST",
      });
    } catch (e) {}
    try {
      window.close();
    } catch (e) {}
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 100%)",
        p: 3,
      }}
    >
      <Card
        sx={{
          maxWidth: 480,
          width: "100%",
          p: 4.5,
          textAlign: "center",
          background: "rgba(18, 24, 38, 0.9)",
          backdropFilter: "blur(24px)",
          borderRadius: "24px",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.2)",
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            border: "1px solid rgba(16, 185, 129, 0.3)",
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 52, color: "#10B981" }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#F8FAFC" }}>
          Sign-in Successful!
        </Typography>
        <Typography variant="body1" sx={{ color: "#94A3B8", mb: 3.5, lineHeight: 1.6 }}>
          Your Plex account has been linked. You can safely close this browser window and return to PlexFlip.
        </Typography>

        <Stack spacing={1.5}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleReturnToApp}
            sx={{
              py: 1.6,
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "14px",
              fontSize: "1rem",
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              boxShadow: "0 8px 20px rgba(99, 102, 241, 0.35)",
              "&:hover": {
                background: "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
              },
            }}
          >
            Return to PlexFlip Desktop App
          </Button>

          <Button
            variant="text"
            fullWidth
            onClick={() => {
              window.location.href = "/";
            }}
            sx={{
              py: 1,
              color: "#94A3B8",
              fontWeight: 600,
              textTransform: "none",
              "&:hover": { color: "#F8FAFC" },
            }}
          >
            Or continue in this web browser
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
