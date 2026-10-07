import { Typography, Box, Divider } from "@mui/material";
import React from "react";
import CheckBoxOption from "../../components/settings/CheckBoxOption";
import { useUserSettings } from "../../states/UserSettingsState";

function SettingsRecommendations() {
  const { settings, setSetting } = useUserSettings();

  return (
    <>
      <Typography variant="h4">Experience - Recommendations</Typography>

      <Box
        sx={{
          mt: 2,
          width: "100%",
          height: "40px",
          backgroundColor: "#181818",
          borderRadius: "10px",
        }}
      />

      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
        <Typography variant="h6" sx={{ color: "text.secondary", mt: 1 }}>
          General & Home Screen
        </Typography>

        <CheckBoxOption
          title="Disable Featured Hero Banner"
          subtitle="Disables the large featured media backdrop banner at the top of the Home and Browse screens."
          checked={settings.DISABLE_HERO_DISPLAY === "true"}
          onChange={() => {
            setSetting(
              "DISABLE_HERO_DISPLAY",
              settings.DISABLE_HERO_DISPLAY === "true" ? "false" : "true"
            );
          }}
        />

        <CheckBoxOption
          title="Disable Continue Watching"
          subtitle="Disables the 'Continue Watching' row on the Home and Browse screens."
          checked={settings.DISABLE_CONTINUE_WATCHING === "true"}
          onChange={() => {
            setSetting(
              "DISABLE_CONTINUE_WATCHING",
              settings.DISABLE_CONTINUE_WATCHING === "true" ? "false" : "true"
            );
          }}
        />

        <CheckBoxOption
          title="Disable Watchlist"
          subtitle="Disables the Plex.tv 'Watchlist' row on the Home screen."
          checked={settings.DISABLE_WATCHLIST === "true"}
          onChange={() => {
            setSetting(
              "DISABLE_WATCHLIST",
              settings.DISABLE_WATCHLIST === "true" ? "false" : "true"
            );
          }}
        />

        <CheckBoxOption
          title="Disable Genre Recommendations"
          subtitle="Disables dynamically selected genre shelves (e.g. Action, Comedy) on the Home and Browse screens."
          checked={settings.DISABLE_GENRE_RECOMMENDATIONS === "true"}
          onChange={() => {
            setSetting(
              "DISABLE_GENRE_RECOMMENDATIONS",
              settings.DISABLE_GENRE_RECOMMENDATIONS === "true" ? "false" : "true"
            );
          }}
        />

        <Divider sx={{ my: 1 }} />

        <Typography variant="h6" sx={{ color: "text.secondary", mt: 1 }}>
          Browse & Discovery
        </Typography>

        <CheckBoxOption
          title="Disable Recently Added & New Releases"
          subtitle="Disables 'Recently Added' and 'New Releases' shelves when viewing recommendations for a library."
          checked={settings.DISABLE_RECENTLY_ADDED === "true"}
          onChange={() => {
            setSetting(
              "DISABLE_RECENTLY_ADDED",
              settings.DISABLE_RECENTLY_ADDED === "true" ? "false" : "true"
            );
          }}
        />

        <CheckBoxOption
          title="Disable Similar Media Recommendations"
          subtitle="Disables 'Because you watched...' and 'More Like...' shelves generated from your viewing history."
          checked={settings.DISABLE_SIMILAR_RECOMMENDATIONS === "true"}
          onChange={() => {
            setSetting(
              "DISABLE_SIMILAR_RECOMMENDATIONS",
              settings.DISABLE_SIMILAR_RECOMMENDATIONS === "true" ? "false" : "true"
            );
          }}
        />
      </Box>
    </>
  );
}

export default SettingsRecommendations;