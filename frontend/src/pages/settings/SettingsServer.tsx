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
import axios from "axios";
import { getBackendURL } from "../../backendURL";

function SettingsServer() {
  const [currentServer, setCurrentServer] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [deploymentId, setDeploymentId] = useState<string>("");
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);

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

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

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
