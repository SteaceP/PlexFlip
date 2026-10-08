import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  InputAdornment,
  Chip,
  Fade,
} from "@mui/material";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CloudQueueRoundedIcon from "@mui/icons-material/CloudQueueRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { getBackendURL } from "../../backendURL";
import { queryBuilder } from "../../plex/QuickFunctions";

interface PlexResourceServer {
  name: string;
  clientIdentifier: string;
  owned: boolean;
  sourceTitle?: string;
  accessToken: string;
  connections: { uri: string; local: boolean; address: string; port: number }[];
}

function SettingsServer() {
  const [currentServer, setCurrentServer] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [deploymentId, setDeploymentId] = useState<string>("");
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [availableServers, setAvailableServers] = useState<PlexResourceServer[]>([]);
  const [loadingServers, setLoadingServers] = useState<boolean>(false);
  const [switchingServerId, setSwitchingServerId] = useState<string | null>(null);

  const [onlineStatus, setOnlineStatus] = useState<"checking" | "online" | "offline">("checking");
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const checkServerHealth = useCallback(async (urlToCheck: string) => {
    setOnlineStatus("checking");
    try {
      const res = await axios.post(`${getBackendURL()}/config/test-plex-server`, {
        plexServer: urlToCheck,
      });
      if (res.data?.ok) {
        setOnlineStatus("online");
      } else {
        setOnlineStatus("offline");
      }
    } catch {
      setOnlineStatus("offline");
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await axios.get(`${getBackendURL()}/config`);
      if (res.data) {
        const srv = res.data.PLEX_SERVER || "";
        setCurrentServer(srv);
        setServerUrl(srv);
        setDeploymentId(res.data.DEPLOYMENTID || "");
        if (srv) {
          checkServerHealth(srv);
        } else {
          setOnlineStatus("offline");
        }
      }
    } catch (e) {
      console.error("Failed to load server config", e);
    } finally {
      setLoadingConfig(false);
    }
  }, [checkServerHealth]);

  const fetchAvailableServers = useCallback(async () => {
    const token =
      localStorage.getItem("accAccessToken") ||
      localStorage.getItem("accessToken");
    if (!token) return;

    setLoadingServers(true);
    try {
      const res = await axios.get(
        `https://plex.tv/api/resources?${queryBuilder({
          "X-Plex-Token": token,
          includeHttps: 1,
          includeRelay: 1,
        })}`
      );
      const parser = new XMLParser({
        attributeNamePrefix: "",
        textNodeName: "value",
        ignoreAttributes: false,
        parseAttributeValue: true,
      });
      const parsed = parser.parse(res.data);
      const devices = parsed?.MediaContainer?.Device;
      const list = Array.isArray(devices) ? devices : devices ? [devices] : [];
      const servers: PlexResourceServer[] = list
        .filter(
          (d: any) =>
            typeof d.provides === "string" && d.provides.includes("server")
        )
        .map((s: any) => {
          const conns = s.Connection;
          const connList = Array.isArray(conns) ? conns : conns ? [conns] : [];
          return {
            name: s.name,
            clientIdentifier: s.clientIdentifier,
            owned: s.owned === 1 || s.owned === true || s.owned === "1",
            sourceTitle: s.sourceTitle,
            accessToken: s.accessToken || token,
            connections: connList.map((c: any) => ({
              uri: c.uri,
              local: c.local === 1 || c.local === true || c.local === "1",
              address: c.address,
              port: c.port,
            })),
          };
        });
      setAvailableServers(servers);
    } catch (e) {
      console.warn("Failed to fetch available plex servers:", e);
    } finally {
      setLoadingServers(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchAvailableServers();
  }, [fetchConfig, fetchAvailableServers]);

  const handleSwitchServer = async (server: PlexResourceServer) => {
    setSwitchingServerId(server.clientIdentifier);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const sortedConns = [...server.connections].sort((a, b) =>
        a.local === b.local ? 0 : a.local ? -1 : 1
      );
      const targetUri =
        sortedConns[0]?.uri ||
        (sortedConns[0]?.address
          ? `http://${sortedConns[0]?.address}:${sortedConns[0]?.port}`
          : "");

      if (!targetUri) {
        setSaveError("No reachable connection found for this server.");
        setSwitchingServerId(null);
        return;
      }

      const res = await axios.post(`${getBackendURL()}/config/plex-server`, {
        plexServer: targetUri,
        force: true,
      });

      if (res.data?.ok) {
        localStorage.setItem("accessToken", server.accessToken);
        setCurrentServer(targetUri);
        setServerUrl(targetUri);
        setSaveSuccess(true);
        checkServerHealth(targetUri);
      } else {
        setSaveError(res.data?.error || "Failed to switch server.");
      }
    } catch (err: any) {
      setSaveError(err.message || "Failed to switch server.");
    } finally {
      setSwitchingServerId(null);
    }
  };

  const isServerActive = (server: PlexResourceServer) => {
    if (!currentServer) return false;
    const cleanCurrent = currentServer.replace(/\/+$/, "").toLowerCase();
    return server.connections.some((c) => {
      if (c.uri && cleanCurrent === c.uri.replace(/\/+$/, "").toLowerCase()) {
        return true;
      }
      if (c.address) {
        const httpAddr = `http://${c.address}:${c.port}`.toLowerCase();
        const httpsAddr = `https://${c.address}:${c.port}`.toLowerCase();
        if (cleanCurrent === httpAddr || cleanCurrent === httpsAddr) {
          return true;
        }
      }
      return false;
    });
  };

  const handleTestConnection = async () => {
    const trimmed = serverUrl.trim();
    if (!trimmed) {
      setTestResult({ ok: false, message: "Please enter a server address." });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const res = await axios.post(`${getBackendURL()}/config/test-plex-server`, {
        plexServer: trimmed,
      });
      if (res.data?.ok) {
        setTestResult({
          ok: true,
          message: res.data.message || "Connection verified! Server is reachable.",
        });
        if (res.data.plexServer) {
          setServerUrl(res.data.plexServer);
        }
      } else {
        setTestResult({
          ok: false,
          message: res.data?.error || "Failed to reach server.",
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Connection test failed.";
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const trimmed = serverUrl.trim();
    if (!trimmed) {
      setSaveError("Server address cannot be empty.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setTestResult(null);
    try {
      const res = await axios.post(`${getBackendURL()}/config/plex-server`, {
        plexServer: trimmed,
      });

      if (res.data?.ok) {
        setSaveSuccess(true);
        const newUrl = res.data.plexServer || trimmed;
        setCurrentServer(newUrl);
        setServerUrl(newUrl);
        setOnlineStatus("online");
      } else {
        setSaveError(res.data?.error || "Failed to save configuration.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Could not save server address.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingConfig) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 6, width: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Typography variant="h4" sx={{ fontWeight: 700, color: "#F4F8FF" }}>
        General - Plex Server
      </Typography>

      <Typography variant="body2" sx={{ color: "#94A3B8", mt: 1, mb: 3 }}>
        Manage the Plex Media Server address used by PlexFlip to stream video, fetch metadata, and synchronize playback.
      </Typography>

      {/* Current Server Status Card */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          bgcolor: "rgba(18, 25, 39, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <DnsRoundedIcon sx={{ color: "#818CF8", fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontSize: "1.1rem", fontWeight: 600 }}>
              Active Server Connection
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {onlineStatus === "checking" && (
              <Chip
                label="Checking status..."
                size="small"
                icon={<CircularProgress size={12} color="inherit" />}
                sx={{ bgcolor: "rgba(255,255,255,0.08)", color: "#CBD5E1" }}
              />
            )}
            {onlineStatus === "online" && (
              <Chip
                label="Online & Connected"
                size="small"
                icon={<CheckCircleRoundedIcon sx={{ fontSize: "16px !important" }} />}
                sx={{
                  bgcolor: "rgba(16, 185, 129, 0.15)",
                  color: "#34D399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  fontWeight: 600,
                }}
              />
            )}
            {onlineStatus === "offline" && (
              <Chip
                label="Unreachable"
                size="small"
                icon={<ErrorOutlineRoundedIcon sx={{ fontSize: "16px !important" }} />}
                sx={{
                  bgcolor: "rgba(239, 68, 68, 0.15)",
                  color: "#F87171",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  fontWeight: 600,
                }}
              />
            )}
            <Button
              size="small"
              onClick={() => currentServer && checkServerHealth(currentServer)}
              startIcon={<RefreshRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{ color: "#94A3B8", minWidth: 0, px: 1 }}
            >
              Check
            </Button>
          </Box>
        </Box>

        <Box sx={{ bgcolor: "rgba(0, 0, 0, 0.25)", p: 2, borderRadius: 1.5 }}>
          <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
            Current Address:
          </Typography>
          <Typography variant="body1" sx={{ fontFamily: "monospace", color: "#F4F8FF", fontWeight: 600 }}>
            {currentServer || "(None configured)"}
          </Typography>
          {deploymentId && (
            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.5 }}>
              Deployment ID: {deploymentId}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Discovered & Shared Servers */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          bgcolor: "rgba(18, 25, 39, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <CloudQueueRoundedIcon sx={{ color: "#38BDF8", fontSize: 24 }} />
            <Box>
              <Typography variant="h6" sx={{ fontSize: "1.1rem", fontWeight: 600 }}>
                Discovered & Shared Servers
              </Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                Switch between your owned servers and servers shared by friends to access all libraries.
              </Typography>
            </Box>
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={fetchAvailableServers}
            disabled={loadingServers}
            startIcon={
              loadingServers ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <RefreshRoundedIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              borderColor: "rgba(255, 255, 255, 0.15)",
              color: "#CBD5E1",
              textTransform: "none",
            }}
          >
            {loadingServers ? "Refreshing..." : "Refresh Servers"}
          </Button>
        </Box>

        {loadingServers && availableServers.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : availableServers.length === 0 ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 1.5,
              bgcolor: "rgba(0, 0, 0, 0.2)",
              textAlign: "center",
            }}
          >
            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
              No Plex servers found under your account. Ensure you are signed into Plex.tv.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, 1fr)",
              },
              gap: 2,
              mt: 2,
            }}
          >
            {availableServers.map((srv) => {
              const active = isServerActive(srv);
              const isSwitching = switchingServerId === srv.clientIdentifier;
              const primaryConn =
                srv.connections.find((c) => c.local) || srv.connections[0];

              return (
                <Paper
                  key={srv.clientIdentifier}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: active
                      ? "rgba(99, 102, 241, 0.08)"
                      : "rgba(0, 0, 0, 0.25)",
                    borderColor: active
                      ? "rgba(99, 102, 241, 0.4)"
                      : "rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 1.5,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: active
                        ? "rgba(99, 102, 241, 0.6)"
                        : "rgba(255, 255, 255, 0.15)",
                    },
                  }}
                >
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 700, color: "#F4F8FF" }}
                      >
                        {srv.name}
                      </Typography>
                      {active ? (
                        <Chip
                          label="Connected"
                          size="small"
                          icon={
                            <CheckCircleRoundedIcon
                              sx={{ fontSize: "14px !important" }}
                            />
                          }
                          sx={{
                            bgcolor: "rgba(16, 185, 129, 0.15)",
                            color: "#34D399",
                            fontWeight: 600,
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                          }}
                        />
                      ) : null}
                    </Box>

                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1 }}>
                      {srv.owned ? (
                        <Chip
                          label="Owned Server"
                          size="small"
                          sx={{
                            bgcolor: "rgba(245, 158, 11, 0.15)",
                            color: "#FBBF24",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                          }}
                        />
                      ) : (
                        <Chip
                          label={`Shared by ${srv.sourceTitle || "Friend"}`}
                          size="small"
                          sx={{
                            bgcolor: "rgba(168, 85, 247, 0.15)",
                            color: "#C084FC",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                          }}
                        />
                      )}
                      {primaryConn && (
                        <Chip
                          label={primaryConn.local ? "Local LAN" : "Remote / Relay"}
                          size="small"
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.05)",
                            color: "#94A3B8",
                            fontSize: "0.75rem",
                          }}
                        />
                      )}
                    </Box>

                    {primaryConn && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: "monospace",
                          color: "#64748B",
                          display: "block",
                          wordBreak: "break-all",
                        }}
                      >
                        {primaryConn.uri || `${primaryConn.address}:${primaryConn.port}`}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
                    <Button
                      size="small"
                      variant={active ? "text" : "contained"}
                      disabled={active || isSwitching}
                      onClick={() => handleSwitchServer(srv)}
                      startIcon={
                        isSwitching ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <SwapHorizRoundedIcon sx={{ fontSize: 16 }} />
                        )
                      }
                      sx={
                        active
                          ? { color: "#64748B", textTransform: "none" }
                          : {
                              background:
                                "linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)",
                              color: "#fff",
                              fontWeight: 600,
                              textTransform: "none",
                              "&:hover": {
                                background:
                                  "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                              },
                            }
                      }
                    >
                      {active ? "Active" : isSwitching ? "Switching..." : "Switch to Server"}
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Edit Server Address Form */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: "rgba(18, 25, 39, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Typography variant="h6" sx={{ fontSize: "1.1rem", fontWeight: 600, mb: 1 }}>
          Update Server Address
        </Typography>
        <Typography variant="body2" sx={{ color: "#94A3B8", mb: 2 }}>
          Specify the HTTP/HTTPS address and port of your Plex Media Server.
        </Typography>

        {saveSuccess && (
          <Fade in={saveSuccess}>
            <Alert
              severity="success"
              icon={<CheckCircleRoundedIcon />}
              action={
                <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                  Reload App
                </Button>
              }
              sx={{
                mb: 2.5,
                bgcolor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#A7F3D0",
              }}
            >
              Plex server updated successfully! You can reload to apply full changes.
            </Alert>
          </Fade>
        )}

        {saveError && (
          <Alert
            severity="error"
            icon={<ErrorOutlineRoundedIcon />}
            sx={{
              mb: 2.5,
              bgcolor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            {saveError}
          </Alert>
        )}

        {testResult && (
          <Alert
            severity={testResult.ok ? "success" : "error"}
            icon={testResult.ok ? <CheckCircleRoundedIcon /> : <ErrorOutlineRoundedIcon />}
            sx={{
              mb: 2.5,
              bgcolor: testResult.ok ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              border: testResult.ok ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            {testResult.message}
          </Alert>
        )}

        <TextField
          id="settings-plex-server-input"
          fullWidth
          label="Plex Server URL"
          variant="outlined"
          placeholder="http://192.168.1.100:32400"
          value={serverUrl}
          onChange={(e) => {
            setServerUrl(e.target.value);
            setSaveSuccess(false);
            setSaveError(null);
            setTestResult(null);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SensorsRoundedIcon sx={{ color: "#818CF8", fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "rgba(9, 14, 26, 0.7)",
              borderRadius: 2,
              color: "#F4F8FF",
            },
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
          <Button
            id="settings-test-server-btn"
            variant="outlined"
            onClick={handleTestConnection}
            disabled={testing || saving || !serverUrl.trim()}
            startIcon={testing ? <CircularProgress size={16} color="inherit" /> : <SensorsRoundedIcon />}
            sx={{
              borderColor: "rgba(99, 102, 241, 0.4)",
              color: "#C7D2FE",
              fontWeight: 600,
            }}
          >
            {testing ? "Testing..." : "Test Connection"}
          </Button>

          <Button
            id="settings-save-server-btn"
            variant="contained"
            onClick={handleSave}
            disabled={saving || !serverUrl.trim() || serverUrl === currentServer}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            sx={{
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Box>
      </Paper>
    </>
  );
}

export default SettingsServer;
