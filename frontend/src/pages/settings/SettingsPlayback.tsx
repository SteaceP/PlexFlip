import React from "react";
import { Box, Stack } from "@mui/material";
import { motion } from "framer-motion";
import NightlightRoundedIcon from "@mui/icons-material/NightlightRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import FastForwardRoundedIcon from "@mui/icons-material/FastForwardRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";

import CheckBoxOption from "../../components/settings/CheckBoxOption";
import SettingsCard from "../../components/settings/SettingsCard";
import SettingsHeader from "../../components/settings/SettingsHeader";
import { useUserSettings } from "../../states/UserSettingsState";

function SettingsPlayback() {
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
        title="Playback & Player"
        subtitle="Fine-tune video player behaviors, immersion controls, and automated track selections."
      />

      <Stack spacing={3} sx={{ width: "100%" }}>
        {/* Screen & Ambience */}
        <SettingsCard
          title="Display & Immersion"
          subtitle="Control how player controls overlay and affect your viewing experience"
          icon={<NightlightRoundedIcon fontSize="small" />}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CheckBoxOption
              icon={<NightlightRoundedIcon fontSize="small" />}
              title="Disable Watchscreen Darkening"
              subtitle="Prevents background video dimming when interacting with player controls, timeline scrubber, and overlays."
              checked={settings.DISABLE_WATCHSCREEN_DARKENING === "true"}
              onChange={() => {
                setSetting(
                  "DISABLE_WATCHSCREEN_DARKENING",
                  settings.DISABLE_WATCHSCREEN_DARKENING === "true" ? "false" : "true"
                );
              }}
            />
          </Box>
        </SettingsCard>

        {/* Audio & Subtitle Automation */}
        <SettingsCard
          title="Smart Track Matching"
          subtitle="Automate audio languages and subtitles across TV shows"
          icon={<TranslateRoundedIcon fontSize="small" />}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CheckBoxOption
              icon={<TranslateRoundedIcon fontSize="small" />}
              title="Auto-Match Audio & Subtitle Tracks"
              subtitle="Automatically selects your preferred audio language and subtitle stream for new episodes based on what you selected in earlier episodes."
              checked={settings.AUTO_MATCH_TRACKS === "true"}
              onChange={() => {
                setSetting(
                  "AUTO_MATCH_TRACKS",
                  settings.AUTO_MATCH_TRACKS === "true" ? "false" : "true"
                );
              }}
            />
          </Box>
        </SettingsCard>

        {/* Continuous Playback */}
        <SettingsCard
          title="Binge Watching & Queue"
          subtitle="Configure continuous watching and autoplay progression"
          icon={<FastForwardRoundedIcon fontSize="small" />}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CheckBoxOption
              icon={<PlayCircleOutlineRoundedIcon fontSize="small" />}
              title="Auto-Play Next Episode"
              subtitle="Automatically transitions to and plays the subsequent episode in the season when the current episode ends."
              checked={settings.AUTO_NEXT_EP === "true"}
              onChange={() => {
                setSetting(
                  "AUTO_NEXT_EP",
                  settings.AUTO_NEXT_EP === "true" ? "false" : "true"
                );
              }}
            />
          </Box>
        </SettingsCard>
      </Stack>
    </motion.div>
  );
}

export default SettingsPlayback;
