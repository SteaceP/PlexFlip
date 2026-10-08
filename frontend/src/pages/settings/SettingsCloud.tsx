import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Stack,
  Alert,
  Fade,
} from "@mui/material";
import { motion } from "framer-motion";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import CloudQueueRoundedIcon from "@mui/icons-material/CloudQueueRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import BookmarkAddedRoundedIcon from "@mui/icons-material/BookmarkAddedRounded";

import CheckBoxOption from "../../components/settings/CheckBoxOption";
import SettingsCard from "../../components/settings/SettingsCard";
import SettingsHeader from "../../components/settings/SettingsHeader";
import { useUserSettings } from "../../states/UserSettingsState";
import { CloudService } from "../../common/CloudService";
import { useWatchListCache } from "../../states/WatchListCache";

function SettingsCloud() {
  const { settings, setSetting } = useUserSettings();
  const [isCloudHealthy, setIsCloudHealthy] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    CloudService.getHealth().then((healthy) => {
      setIsCloudHealthy(healthy);
    });
  }, []);

  const handleSyncWatchlist = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await useWatchListCache.getState().syncWithCloud();
      setSyncStatus("Watchlist successfully synchronized with Cloudflare D1.");
    } catch {
      setSyncStatus("Failed to synchronize watchlist. Please verify your connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ width: "100%" }}
    >
      <SettingsHeader
        category="Cloud & Network"
        title="Cloud & Synchronization"
        subtitle="Leverage serverless Cloudflare D1 storage for cross-client watchlist syncing and shared community reviews."
        chip={{
          label:
            isCloudHealthy === null
              ? "Checking D1..."
              : isCloudHealthy
              ? "Cloudflare D1 Online"
              : "D1 Offline",
          color: isCloudHealthy ? "success" : "default",
          icon:
            isCloudHealthy === null ? (
              <CircularProgress size={14} color="inherit" />
            ) : isCloudHealthy ? (
              <CloudDoneRoundedIcon fontSize="small" />
            ) : (
              <CloudOffRoundedIcon fontSize="small" />
            ),
        }}
      />

      <Stack spacing={3} sx={{ width: "100%" }}>
        {/* Security & Infrastructure Banner */}
        <SettingsCard
          title="Zero-Knowledge Cloud Infrastructure"
          subtitle="Enterprise-grade serverless isolation powered by Cloudflare D1"
          icon={<SecurityRoundedIcon fontSize="small" />}
        >
          <Box
            sx={{
              p: 2.5,
              borderRadius: "12px",
              bgcolor: "rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: "#CBD5E1", lineHeight: 1.6 }}>
              All cloud data is hosted on edge-replicated Cloudflare D1 databases.
              Requests are authenticated via your Plex user token with zero personal tracking.
              Each user maintains exclusive write and delete permissions over their own watchlist items and review threads.
            </Typography>
          </Box>
        </SettingsCard>

        {/* Watchlist Cloud Sync */}
        <SettingsCard
          title="Cross-Device Watchlist"
          subtitle="Keep your saved titles synchronized between desktop, mobile, and web clients"
          icon={<BookmarkAddedRoundedIcon fontSize="small" />}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <CheckBoxOption
              icon={<CloudQueueRoundedIcon fontSize="small" />}
              badge="D1 Sync"
              title="Enable Cloud Watchlist Sync"
              subtitle="Automatically pushes watchlist updates to the cloud so all your PlexFlip installations remain in sync."
              checked={settings.ENABLE_CLOUD_WATCHLIST === "true"}
              onChange={() => {
                setSetting(
                  "ENABLE_CLOUD_WATCHLIST",
                  settings.ENABLE_CLOUD_WATCHLIST === "true" ? "false" : "true"
                );
              }}
            />

            {settings.ENABLE_CLOUD_WATCHLIST === "true" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1.5,
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 650, color: "#E0E7FF" }}>
                    Manual Sync Trigger
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                    Force an immediate sync between your local cache and Cloudflare D1
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  disabled={isSyncing}
                  onClick={handleSyncWatchlist}
                  startIcon={
                    isSyncing ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SyncRoundedIcon fontSize="small" />
                    )
                  }
                  sx={{
                    bgcolor: "rgba(99, 102, 241, 0.8)",
                    color: "#fff",
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: "8px",
                    px: 2,
                    "&:hover": {
                      bgcolor: "rgba(99, 102, 241, 1)",
                    },
                  }}
                >
                  {isSyncing ? "Syncing..." : "Sync Watchlist Now"}
                </Button>
              </Box>
            )}

            {syncStatus && (
              <Fade in={Boolean(syncStatus)}>
                <Alert
                  severity={syncStatus.includes("Failed") ? "error" : "success"}
                  sx={{
                    borderRadius: "10px",
                    bgcolor: syncStatus.includes("Failed")
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(16, 185, 129, 0.15)",
                    border: "1px solid",
                    borderColor: syncStatus.includes("Failed")
                      ? "rgba(239, 68, 68, 0.3)"
                      : "rgba(16, 185, 129, 0.3)",
                    color: syncStatus.includes("Failed") ? "#FCA5A5" : "#A7F3D0",
                  }}
                  onClose={() => setSyncStatus(null)}
                >
                  {syncStatus}
                </Alert>
              </Fade>
            )}
          </Box>
        </SettingsCard>

        {/* Reviews Cloud Sync */}
        <SettingsCard
          title="Community Reviews & Ratings"
          subtitle="Publish reviews and read thoughts from fellow PlexFlip community members"
          icon={<RateReviewRoundedIcon fontSize="small" />}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CheckBoxOption
              icon={<RateReviewRoundedIcon fontSize="small" />}
              badge="Community"
              title="Store Reviews in Cloudflare D1"
              subtitle="Allows you to submit ratings and reviews to the decentralized database. Only you can modify or delete your reviews, while other PlexFlip users can view them."
              checked={settings.ENABLE_CLOUD_REVIEWS === "true"}
              onChange={() => {
                setSetting(
                  "ENABLE_CLOUD_REVIEWS",
                  settings.ENABLE_CLOUD_REVIEWS === "true" ? "false" : "true"
                );
              }}
            />
          </Box>
        </SettingsCard>
      </Stack>
    </motion.div>
  );
}

export default SettingsCloud;
