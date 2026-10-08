import React, { useEffect, useState } from "react";
import { Box, Stack, CircularProgress, Typography, Chip, Skeleton } from "@mui/material";
import { motion } from "framer-motion";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import TvRoundedIcon from "@mui/icons-material/TvRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";

import { getAllLibraries } from "../../plex";
import CheckBoxOption from "../../components/settings/CheckBoxOption";
import SettingsCard from "../../components/settings/SettingsCard";
import SettingsHeader from "../../components/settings/SettingsHeader";
import { useUserSettings } from "../../states/UserSettingsState";

function getLibraryIcon(type: string) {
  switch (type.toLowerCase()) {
    case "movie":
      return <MovieRoundedIcon fontSize="small" />;
    case "show":
      return <TvRoundedIcon fontSize="small" />;
    case "artist":
    case "music":
      return <LibraryMusicRoundedIcon fontSize="small" />;
    default:
      return <VideoLibraryRoundedIcon fontSize="small" />;
  }
}

function getLibraryTypeLabel(type: string) {
  switch (type.toLowerCase()) {
    case "movie":
      return "Movies";
    case "show":
      return "TV Shows";
    case "artist":
    case "music":
      return "Music";
    default:
      return type.toUpperCase();
  }
}

function SettingsLibraries() {
  const [libraries, setLibraries] = useState<Plex.LibarySection[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings, setSetting } = useUserSettings();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const librariesData = await getAllLibraries();
        const filteredLibraries = librariesData.filter((lib) =>
          ["movie", "show", "artist"].includes(lib.type)
        );
        setLibraries(filteredLibraries);
      } catch (error) {
        console.error("Error fetching libraries", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ width: "100%" }}
    >
      <SettingsHeader
        category="Experience"
        title="Media Libraries"
        subtitle="Manage library shortcuts and customize which libraries are displayed across your interfaces."
      />

      <Stack spacing={3} sx={{ width: "100%" }}>
        {/* Home Screen Section */}
        <SettingsCard
          title="Home Screen Library Bar"
          subtitle="Configure the library access bar on the main dashboard"
          icon={<LayersRoundedIcon fontSize="small" />}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CheckBoxOption
              icon={<VideoLibraryRoundedIcon fontSize="small" />}
              title="Disable Home Libraries Shelf"
              subtitle="Hides the library shortcut cards from the Home screen while keeping them accessible via the navigation drawer."
              checked={settings.DISABLE_HOME_SCREEN_LIBRARIES === "true"}
              onChange={() => {
                setSetting(
                  "DISABLE_HOME_SCREEN_LIBRARIES",
                  settings.DISABLE_HOME_SCREEN_LIBRARIES === "true" ? "false" : "true"
                );
              }}
            />
          </Box>
        </SettingsCard>

        {/* Individual Library Pinning */}
        <SettingsCard
          title="Library Visibility & Pinned Feeds"
          subtitle="Enable or disable individual Plex libraries across your home views and navigation menus"
          icon={<VideoLibraryRoundedIcon fontSize="small" />}
          action={
            !loading && (
              <Chip
                label={`${libraries.length} Libraries Found`}
                size="small"
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.06)",
                  color: "#94A3B8",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
            )
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {loading ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, py: 1 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rounded"
                    height={64}
                    sx={{
                      bgcolor: "rgba(255, 255, 255, 0.04)",
                      borderRadius: "12px",
                    }}
                  />
                ))}
              </Box>
            ) : libraries.length === 0 ? (
              <Box
                sx={{
                  p: 3,
                  textAlign: "center",
                  borderRadius: "12px",
                  bgcolor: "rgba(0, 0, 0, 0.2)",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                }}
              >
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                  No compatible movie, TV, or music libraries found on this Plex server.
                </Typography>
              </Box>
            ) : (
              libraries.map((library) => {
                const key = `LIBRARY_${library.uuid}`;
                const rawValue = settings[key];
                const checked = rawValue === undefined ? true : rawValue === "true";

                return (
                  <CheckBoxOption
                    key={library.key}
                    icon={getLibraryIcon(library.type)}
                    badge={getLibraryTypeLabel(library.type)}
                    title={library.title}
                    subtitle={`Section ID: ${library.key} • UUID: ${library.uuid ? library.uuid.slice(0, 8) + "..." : "Local"}`}
                    checked={checked}
                    onChange={() => {
                      setSetting(key, checked ? "false" : "true");
                    }}
                  />
                );
              })
            )}
          </Box>
        </SettingsCard>
      </Stack>
    </motion.div>
  );
}

export default SettingsLibraries;
