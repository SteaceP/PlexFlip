import React from "react";
import { Box, Stack } from "@mui/material";
import { motion } from "framer-motion";
import ViewCarouselRoundedIcon from "@mui/icons-material/ViewCarouselRounded";
import HistoryToggleOffRoundedIcon from "@mui/icons-material/HistoryToggleOffRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import NewReleasesRoundedIcon from "@mui/icons-material/NewReleasesRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import CheckBoxOption from "../../components/settings/CheckBoxOption";
import SettingsCard from "../../components/settings/SettingsCard";
import SettingsHeader from "../../components/settings/SettingsHeader";
import { useUserSettings } from "../../states/UserSettingsState";

function SettingsRecommendations() {
  const { settings, setSetting } = useUserSettings();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ width: "100%" }}
    >
      <SettingsHeader
        category="Experience"
        title="Recommendations & Discovery"
        subtitle="Customize Home screen content shelves, algorithmic media suggestions, and hero showcases."
      />

      <Stack spacing={3} sx={{ width: "100%" }}>
        {/* Home Screen Layout */}
        <SettingsCard
          title="Home Screen Feed"
          subtitle="Configure the prominent visual carousels and tracking sections on your home dashboard"
          icon={<ViewCarouselRoundedIcon fontSize="small" />}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CheckBoxOption
              icon={<ViewCarouselRoundedIcon fontSize="small" />}
              title="Disable Featured Hero Banner"
              subtitle="Hides the prominent featured media backdrop banner at the top of the Home and Browse screens."
              checked={settings.DISABLE_HERO_DISPLAY === "true"}
              onChange={() => {
                setSetting(
                  "DISABLE_HERO_DISPLAY",
                  settings.DISABLE_HERO_DISPLAY === "true" ? "false" : "true"
                );
              }}
            />

            <CheckBoxOption
              icon={<HistoryToggleOffRoundedIcon fontSize="small" />}
              title="Disable Continue Watching Row"
              subtitle="Hides your active in-progress movies and TV episodes row from the Home and Browse views."
              checked={settings.DISABLE_CONTINUE_WATCHING === "true"}
              onChange={() => {
                setSetting(
                  "DISABLE_CONTINUE_WATCHING",
                  settings.DISABLE_CONTINUE_WATCHING === "true" ? "false" : "true"
                );
              }}
            />

            <CheckBoxOption
              icon={<BookmarkBorderRoundedIcon fontSize="small" />}
              title="Disable Personal Watchlist"
              subtitle="Hides your Plex.tv Watchlist carousel from the Home screen."
              checked={settings.DISABLE_WATCHLIST === "true"}
              onChange={() => {
                setSetting(
                  "DISABLE_WATCHLIST",
                  settings.DISABLE_WATCHLIST === "true" ? "false" : "true"
                );
              }}
            />

            <CheckBoxOption
              icon={<CloudUploadRoundedIcon fontSize="small" />}
              badge="Cloud D1"
              title="Save Watchlist to Cloud"
              subtitle="Synchronize your saved watchlist items with Cloudflare D1 storage to access them across all your devices."
              checked={settings.ENABLE_CLOUD_WATCHLIST === "true"}
              onChange={() => {
                setSetting(
                  "ENABLE_CLOUD_WATCHLIST",
                  settings.ENABLE_CLOUD_WATCHLIST === "true" ? "false" : "true"
                );
              }}
            />
          </Box>
        </SettingsCard>

        {/* Discovery & Shelves */}
        <SettingsCard
          title="Discovery & Dynamic Shelves"
          subtitle="Fine-tune personalized suggestions and rotating curated shelves"
          icon={<AutoAwesomeRoundedIcon fontSize="small" />}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CheckBoxOption
              icon={<CategoryRoundedIcon fontSize="small" />}
              title="Disable Dynamic Genre Shelves"
              subtitle="Hides dynamically rotated genre rows (e.g. Action, Comedy, Sci-Fi) that refresh daily on the Home screen."
              checked={settings.DISABLE_GENRE_RECOMMENDATIONS === "true"}
              onChange={() => {
                setSetting(
                  "DISABLE_GENRE_RECOMMENDATIONS",
                  settings.DISABLE_GENRE_RECOMMENDATIONS === "true" ? "false" : "true"
                );
              }}
            />

            <CheckBoxOption
              icon={<NewReleasesRoundedIcon fontSize="small" />}
              title="Disable Recently Added & New Releases"
              subtitle="Hides 'Recently Added' and 'New Releases' recommendation shelves when viewing a library."
              checked={settings.DISABLE_RECENTLY_ADDED === "true"}
              onChange={() => {
                setSetting(
                  "DISABLE_RECENTLY_ADDED",
                  settings.DISABLE_RECENTLY_ADDED === "true" ? "false" : "true"
                );
              }}
            />

            <CheckBoxOption
              icon={<PsychologyRoundedIcon fontSize="small" />}
              title="Disable Similar Media Recommendations"
              subtitle="Hides 'Because you watched...' and 'More Like This' carousels calculated from your watch history."
              checked={settings.DISABLE_SIMILAR_RECOMMENDATIONS === "true"}
              onChange={() => {
                setSetting(
                  "DISABLE_SIMILAR_RECOMMENDATIONS",
                  settings.DISABLE_SIMILAR_RECOMMENDATIONS === "true" ? "false" : "true"
                );
              }}
            />
          </Box>
        </SettingsCard>
      </Stack>
    </motion.div>
  );
}

export default SettingsRecommendations;