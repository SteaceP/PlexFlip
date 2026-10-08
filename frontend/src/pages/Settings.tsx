import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import CloudSyncRoundedIcon from "@mui/icons-material/CloudSyncRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";

import SettingsInfo from "./settings/SettingsInfo";
import SettingsServer from "./settings/SettingsServer";
import SettingsPlayback from "./settings/SettingsPlayback";
import SettingsRecommendations from "./settings/SettingsRecommendations";
import SettingsLibraries from "./settings/SettingsLibraries";
import SettingsCloud from "./settings/SettingsCloud";
import { useUserSettings } from "../states/UserSettingsState";
import { useSessionStore } from "../states/SessionState";

interface NavItem {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
}

interface NavSection {
  category: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    category: "General",
    items: [
      {
        id: "server",
        title: "Plex Server",
        description: "Active server, LAN/Relay, switcher",
        link: "/settings/server",
        icon: <StorageRoundedIcon sx={{ fontSize: 20 }} />,
      },
      {
        id: "info",
        title: "About PlexFlip",
        description: "Version, runtime, community & docs",
        link: "/settings/info",
        icon: <InfoRoundedIcon sx={{ fontSize: 20 }} />,
      },
    ],
  },
  {
    category: "Experience",
    items: [
      {
        id: "playback",
        title: "Playback & Player",
        description: "Darkening, auto-track, next episode",
        link: "/settings/experience-playback",
        icon: <PlayCircleOutlineRoundedIcon sx={{ fontSize: 20 }} />,
      },
      {
        id: "recommendations",
        title: "Recommendations",
        description: "Hero banner, continue watching, shelves",
        link: "/settings/experience-recommendations",
        icon: <TuneRoundedIcon sx={{ fontSize: 20 }} />,
      },
      {
        id: "libraries",
        title: "Media Libraries",
        description: "Home shelf, pinned library feeds",
        link: "/settings/experience-libraries",
        icon: <VideoLibraryRoundedIcon sx={{ fontSize: 20 }} />,
      },
    ],
  },
  {
    category: "Cloud",
    items: [
      {
        id: "cloud",
        title: "Cloud & Sync",
        description: "Cloudflare D1, watchlist, reviews",
        link: "/settings/cloud",
        icon: <CloudSyncRoundedIcon sx={{ fontSize: 20 }} />,
      },
    ],
  },
];

function Settings() {
  const { loaded } = useUserSettings();
  const { PlexServer } = useSessionStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  if (!loaded) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: "#6366F1" }} />
        <Typography variant="body2" sx={{ color: "#94A3B8" }}>
          Loading user preferences...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        pt: { xs: "80px", sm: "88px" },
        pb: { xs: "48px", sm: "64px" },
        px: { xs: 2, sm: 3, md: 5, lg: 7 },
        background:
          "radial-gradient(circle at 10% 15%, rgba(99, 102, 241, 0.07) 0%, transparent 45%), radial-gradient(circle at 90% 70%, rgba(229, 160, 13, 0.05) 0%, transparent 45%), #070B13",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "1360px",
          display: "flex",
          flexDirection: "column",
          gap: 3.5,
        }}
      >
        {/* Top Breadcrumb & Page Banner */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            pb: 2,
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton
              onClick={() => navigate("/")}
              size="small"
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.05)",
                color: "#CBD5E1",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                p: 0.75,
                "&:hover": {
                  bgcolor: "rgba(99, 102, 241, 0.15)",
                  color: "#F8FAFC",
                  borderColor: "rgba(99, 102, 241, 0.35)",
                },
              }}
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>

            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 750,
                  fontSize: { xs: "1.3rem", sm: "1.5rem" },
                  color: "#F8FAFC",
                  letterSpacing: "-0.02em",
                }}
              >
                Settings
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                PlexFlip Client Configuration & Preferences
              </Typography>
            </Box>
          </Box>

          {PlexServer?.friendlyName && (
            <Chip
              icon={<StorageRoundedIcon sx={{ fontSize: "15px !important" }} />}
              label={`Connected: ${PlexServer.friendlyName}`}
              size="small"
              sx={{
                bgcolor: "rgba(16, 185, 129, 0.12)",
                color: "#6EE7B7",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                fontWeight: 650,
                fontSize: "0.78rem",
                borderRadius: "8px",
              }}
            />
          )}
        </Box>

        {/* Mobile Horizontal Pill Navigation */}
        {isMobile && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              overflowX: "auto",
              pb: 1,
              width: "100%",
              "::-webkit-scrollbar": { display: "none" },
            }}
          >
            {navSections.flatMap((sec) => sec.items).map((item) => {
              const active = pathname === item.link;
              return (
                <Link
                  key={item.id}
                  to={item.link}
                  style={{ textDecoration: "none", flexShrink: 0 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 2,
                      py: 1,
                      borderRadius: "10px",
                      bgcolor: active
                        ? "rgba(99, 102, 241, 0.2)"
                        : "rgba(18, 25, 39, 0.6)",
                      border: "1px solid",
                      borderColor: active
                        ? "rgba(99, 102, 241, 0.5)"
                        : "rgba(255, 255, 255, 0.08)",
                      color: active ? "#F8FAFC" : "#94A3B8",
                      fontWeight: active ? 650 : 500,
                      fontSize: "0.85rem",
                    }}
                  >
                    <Box sx={{ color: active ? "#818CF8" : "inherit", display: "flex" }}>
                      {item.icon}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: "inherit", color: "inherit" }}>
                      {item.title}
                    </Typography>
                  </Box>
                </Link>
              );
            })}
          </Box>
        )}

        {/* Main Content Area */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "flex-start",
            gap: { xs: 3, md: 4 },
            width: "100%",
          }}
        >
          {/* Desktop Left Sidebar */}
          {!isMobile && (
            <Box
              sx={{
                width: { md: 280, lg: 320 },
                flexShrink: 0,
                position: "sticky",
                top: "92px",
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                p: 2.5,
                borderRadius: "16px",
                bgcolor: "rgba(15, 23, 42, 0.75)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
              }}
            >
              {navSections.map((section) => (
                <Box key={section.category} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 750,
                      color: "#64748B",
                      fontSize: "0.72rem",
                      px: 1.5,
                      py: 0.5,
                    }}
                  >
                    {section.category}
                  </Typography>

                  {section.items.map((item) => {
                    const active = pathname === item.link;
                    return (
                      <Link
                        key={item.id}
                        to={item.link}
                        style={{ textDecoration: "none" }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1.5,
                            p: 1.25,
                            borderRadius: "12px",
                            bgcolor: active
                              ? "rgba(99, 102, 241, 0.16)"
                              : "transparent",
                            border: "1px solid",
                            borderColor: active
                              ? "rgba(99, 102, 241, 0.4)"
                              : "transparent",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              bgcolor: active
                                ? "rgba(99, 102, 241, 0.22)"
                                : "rgba(255, 255, 255, 0.04)",
                              borderColor: active
                                ? "rgba(99, 102, 241, 0.55)"
                                : "rgba(255, 255, 255, 0.08)",
                            },
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 34,
                                height: 34,
                                borderRadius: "8px",
                                bgcolor: active
                                  ? "rgba(99, 102, 241, 0.25)"
                                  : "rgba(255, 255, 255, 0.04)",
                                color: active ? "#A5B4FC" : "#94A3B8",
                                border: "1px solid",
                                borderColor: active
                                  ? "rgba(99, 102, 241, 0.35)"
                                  : "rgba(255, 255, 255, 0.06)",
                              }}
                            >
                              {item.icon}
                            </Box>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: active ? 650 : 500,
                                  color: active ? "#F8FAFC" : "#CBD5E1",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {item.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#64748B",
                                  fontSize: "0.72rem",
                                  display: "block",
                                  lineHeight: 1.2,
                                }}
                              >
                                {item.description}
                              </Typography>
                            </Box>
                          </Box>

                          <ArrowForwardIosRoundedIcon
                            sx={{
                              fontSize: 12,
                              color: active ? "#818CF8" : "#475569",
                              opacity: active ? 1 : 0.6,
                              transition: "transform 0.2s ease",
                            }}
                          />
                        </Box>
                      </Link>
                    );
                  })}
                </Box>
              ))}
            </Box>
          )}

          {/* Right Content Panel */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              width: "100%",
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/settings/server" replace />} />
              <Route path="/server" element={<SettingsServer />} />
              <Route path="/info" element={<SettingsInfo />} />
              <Route path="/experience-playback" element={<SettingsPlayback />} />
              <Route path="/experience-recommendations" element={<SettingsRecommendations />} />
              <Route path="/experience-libraries" element={<SettingsLibraries />} />
              <Route path="/cloud" element={<SettingsCloud />} />
              <Route path="*" element={<Navigate to="/settings/server" replace />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default Settings;
