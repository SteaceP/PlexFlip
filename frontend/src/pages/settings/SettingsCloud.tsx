import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Alert,
} from "@mui/material";
import {
  CloudDoneRounded,
  CloudOffRounded,
  SyncRounded,
  SecurityRounded,
} from "@mui/icons-material";
import CheckBoxOption from "../../components/settings/CheckBoxOption";
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
      setSyncStatus("Watchlist successfully synced with the cloud!");
    } catch (err) {
      setSyncStatus("Failed to sync watchlist. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Typography variant="h4">Cloud & Sync</Typography>
        <Chip
          icon={
            isCloudHealthy === null ? (
              <CircularProgress size={16} color="inherit" />
            ) : isCloudHealthy ? (
              <CloudDoneRounded fontSize="small" />
            ) : (
              <CloudOffRounded fontSize="small" />
            )
          }
          label={
            isCloudHealthy === null
              ? "Checking Cloud..."
              : isCloudHealthy
              ? "Cloudflare D1 Connected"
              : "Cloud Unavailable"
          }
          color={isCloudHealthy ? "success" : "default"}
          variant="outlined"
          sx={{ fontWeight: "bold" }}
        />
      </Box>

      {/* Cloud Status Card */}
      <Box
        sx={{
          mt: 3,
          width: "100%",
          p: 2.5,
          backgroundColor: "#1e1e1e",
          borderRadius: "10px",
          border: "1px solid #333",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SecurityRounded sx={{ color: "#e5a00d" }} />
          <Typography variant="subtitle1" fontWeight="bold">
            Zero-Knowledge Cloud Isolation
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: "#bbb" }}>
          All cloud data is hosted on serverless Cloudflare D1 storage. Requests
          are authenticated directly with your Plex account token—each user can only
          update, modify, or delete their own watchlist items and reviews.
        </Typography>
      </Box>

      <Box
        sx={{
          mt: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          width: "100%",
        }}
      >
        <Typography variant="h6" sx={{ color: "text.secondary" }}>
          Cloud Features
        </Typography>

        {/* Watchlist Setting */}
        <Box
          sx={{
            p: 2,
            backgroundColor: "#161616",
            borderRadius: "8px",
            border: "1px solid #282828",
          }}
        >
          <CheckBoxOption
            title="Save Watchlist to Cloud"
            subtitle="Sync your watchlist with Cloudflare D1 so your saved movies and TV shows are backed up and accessible across your PlexFlip clients."
            checked={settings.ENABLE_CLOUD_WATCHLIST === "true"}
            onChange={() => {
              setSetting(
                "ENABLE_CLOUD_WATCHLIST",
                settings.ENABLE_CLOUD_WATCHLIST === "true" ? "false" : "true"
              );
            }}
          />

          {settings.ENABLE_CLOUD_WATCHLIST === "true" && (
            <Box sx={{ mt: 2, ml: "10px" }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  isSyncing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SyncRounded />
                  )
                }
                disabled={isSyncing}
                onClick={handleSyncWatchlist}
                sx={{
                  borderColor: "#e5a00d",
                  color: "#e5a00d",
                  "&:hover": {
                    borderColor: "#f5b01d",
                    backgroundColor: "#e5a00d15",
                  },
                }}
              >
                {isSyncing ? "Syncing..." : "Sync Watchlist Now"}
              </Button>
            </Box>
          )}
        </Box>

        {/* Reviews Setting */}
        <Box
          sx={{
            p: 2,
            backgroundColor: "#161616",
            borderRadius: "8px",
            border: "1px solid #282828",
          }}
        >
          <CheckBoxOption
            title="Save Reviews to Cloud"
            subtitle="Store your movie and show ratings and reviews in Cloudflare D1. Only you can edit or delete your reviews, and other PlexFlip users can read them."
            checked={settings.ENABLE_CLOUD_REVIEWS === "true"}
            onChange={() => {
              setSetting(
                "ENABLE_CLOUD_REVIEWS",
                settings.ENABLE_CLOUD_REVIEWS === "true" ? "false" : "true"
              );
            }}
          />
        </Box>

        {syncStatus && (
          <Alert
            severity={syncStatus.includes("Failed") ? "error" : "success"}
            sx={{ mt: 1 }}
            onClose={() => setSyncStatus(null)}
          >
            {syncStatus}
          </Alert>
        )}
      </Box>
    </>
  );
}

export default SettingsCloud;
