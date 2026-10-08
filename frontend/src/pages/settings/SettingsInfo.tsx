import React from "react";
import {
  Box,
  Button,
  Typography,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import GitHubIcon from "@mui/icons-material/GitHub";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

import SettingsCard from "../../components/settings/SettingsCard";
import SettingsHeader from "../../components/settings/SettingsHeader";
import { openExternalURL } from "../../common/DesktopApp";

function SettingsInfo() {
  const handleOpenLink = (url: string) => {
    openExternalURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ width: "100%" }}
    >
      <SettingsHeader
        category="General"
        title="About PlexFlip"
        subtitle="A sleek, modern client for your personal Plex Media Server."
      />

      <Stack spacing={3} sx={{ width: "100%" }}>
        {/* App Showcase Card */}
        <SettingsCard
          sx={{
            background:
              "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              gap: 3,
            }}
          >
            <Box
              sx={{
                width: { xs: 80, sm: 100 },
                height: { xs: 80, sm: 100 },
                borderRadius: "20px",
                bgcolor: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1.5,
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.4)",
                flexShrink: 0,
              }}
            >
              <img
                src="/appicon.png"
                alt="PlexFlip Logo"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/icon.png";
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 4px 12px rgba(229, 160, 13, 0.3))",
                }}
              />
            </Box>

            <Box sx={{ flex: 1, textAlign: { xs: "center", sm: "left" } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", sm: "flex-start" },
                  gap: 1.5,
                  flexWrap: "wrap",
                  mb: 1,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 750,
                    color: "#F8FAFC",
                    letterSpacing: "-0.02em",
                  }}
                >
                  PlexFlip
                </Typography>
                <Chip
                  label="v0.1.0"
                  size="small"
                  sx={{
                    bgcolor: "rgba(99, 102, 241, 0.2)",
                    color: "#A5B4FC",
                    border: "1px solid rgba(99, 102, 241, 0.35)",
                    fontWeight: 700,
                  }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: "#94A3B8", lineHeight: 1.6 }}>
                Welcome to PlexFlip! Designed to elevate your media library experience
                with an intuitive interface, thoughtful playback controls, and seamless browsing.
              </Typography>
            </Box>
          </Box>
        </SettingsCard>

        {/* Community & Links */}
        <SettingsCard
          title="Community & Open Source"
          subtitle="PlexFlip is free, open-source software built with passion by Code Rage and contributors worldwide"
          icon={<GitHubIcon fontSize="small" />}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mb: 3,
            }}
          >
            <Button
              variant="contained"
              startIcon={<GitHubIcon />}
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: "16px !important" }} />}
              onClick={() => handleOpenLink("https://github.com/SteaceP/PlexFlip")}
              sx={{
                bgcolor: "rgba(99, 102, 241, 0.85)",
                color: "#fff",
                fontWeight: 650,
                borderRadius: "10px",
                px: 2.5,
                py: 1,
                "&:hover": {
                  bgcolor: "rgba(99, 102, 241, 1)",
                },
              }}
            >
              Visit GitHub Repository
            </Button>

            <Button
              variant="outlined"
              startIcon={<BugReportRoundedIcon />}
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: "16px !important" }} />}
              onClick={() => handleOpenLink("https://github.com/SteaceP/PlexFlip/issues")}
              sx={{
                borderColor: "rgba(255, 255, 255, 0.15)",
                color: "#E2E8F0",
                fontWeight: 600,
                borderRadius: "10px",
                px: 2.5,
                py: 1,
                "&:hover": {
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                },
              }}
            >
              Report an Issue
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              startIcon={<FavoriteRoundedIcon sx={{ color: "#FB7185" }} />}
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: "16px !important" }} />}
              onClick={() => handleOpenLink("https://github.com/SteaceP/PlexFlip")}
              sx={{
                borderColor: "rgba(244, 63, 94, 0.35)",
                color: "#FDA4AF",
                fontWeight: 600,
                borderRadius: "10px",
                px: 2.5,
                py: 1,
                "&:hover": {
                  borderColor: "rgba(244, 63, 94, 0.6)",
                  bgcolor: "rgba(244, 63, 94, 0.1)",
                },
              }}
            >
              Become a Supporter
            </Button>
          </Box>

          <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.06)" }} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "#94A3B8" }}>
            <FavoriteRoundedIcon sx={{ color: "#F43F5E", fontSize: 18 }} />
            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
              Crafted by <strong>Code Rage</strong> and open-source contributors.
            </Typography>
          </Box>
        </SettingsCard>
      </Stack>
    </motion.div>
  );
}

export default SettingsInfo;