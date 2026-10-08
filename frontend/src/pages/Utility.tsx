import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Fade,
  InputAdornment,
  Collapse,
} from "@mui/material";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import axios from "axios";
import { useStartupState } from "./Startup";
import { getBackendURL } from "../backendURL";

function Utility() {
  const { lastStatus, frontEndStatus, setLastStatus, setFrontEndStatus } = useStartupState();

  const isUnconfigured = lastStatus && (!lastStatus.configured || !lastStatus.plexServer);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  useEffect(() => {
    if (lastStatus?.plexServer) {
      setServerUrl(lastStatus.plexServer);
    } else {
      // Default placeholder value if nothing is configured
      setServerUrl("");
    }
  }, [lastStatus?.plexServer]);

  const handleTestConnection = async () => {
    const trimmed = serverUrl.trim();
    if (!trimmed) {
      setTestResult({ ok: false, message: "Please enter a Plex server URL first." });
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
          message: res.data.message || "Successfully connected to Plex server!",
        });
        if (res.data.plexServer) {
          setServerUrl(res.data.plexServer);
        }
      } else {
        setTestResult({
          ok: false,
          message: res.data?.error || "Failed to connect to Plex server.",
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to reach Plex server.";
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    const trimmed = serverUrl.trim();
    if (!trimmed) {
      setSaveError("Please enter a valid Plex server URL.");
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
        if (res.data.plexServer) {
          setServerUrl(res.data.plexServer);
        }

        // Immediately refresh status to transition into the app
        setTimeout(async () => {
          try {
            const statusRes = await axios.get(`${getBackendURL()}/status`, { timeout: 4000 });
            if (statusRes.data) {
              setLastStatus(statusRes.data);
            }
          } catch {
            // Polling will catch it
          }
        }, 600);
      } else {
        setSaveError(res.data?.error || "Failed to save configuration.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Could not save server configuration.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRetryBackend = async () => {
    try {
      const res = await axios.get(`${getBackendURL()}/status`, { timeout: 3000 });
      if (res.data) {
        setFrontEndStatus(undefined);
        setLastStatus(res.data);
      }
    } catch {
      // Still unreachable
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #09090b 70%)",
        color: "text.primary",
        p: 3,
        userSelect: "none",
      }}
    >
      {/* Logo Branding */}
      <Box sx={{ mb: 3, textAlign: "center" }}>
        <img
          src="/logoBig.png"
          alt="PlexFlip Logo"
          style={{ width: "220px", height: "auto", filter: "drop-shadow(0 6px 16px rgba(99,102,241,0.25))" }}
        />
      </Box>

      {/* Main Glass Card */}
      <Paper
        elevation={6}
        sx={{
          width: { xs: "92%", sm: "580px", md: "640px" },
          bgcolor: "rgba(18, 25, 39, 0.82)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          borderRadius: 3,
          p: { xs: 3, sm: 4 },
          boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
        }}
      >
        {/* Backend Unreachable Alert */}
        {frontEndStatus?.error && (
          <Box sx={{ mb: 3 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={handleRetryBackend} startIcon={<RefreshRoundedIcon />}>
                  Retry
                </Button>
              }
              sx={{ bgcolor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
            >
              {frontEndStatus.message}
            </Alert>
          </Box>
        )}

        {/* Card Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "14px",
              background: "linear-gradient(135deg, #6366F1 0%, #4338CA 100%)",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
            }}
          >
            <DnsRoundedIcon sx={{ color: "#fff", fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#F4F8FF", letterSpacing: "-0.01em" }}>
              {isUnconfigured ? "Connect to Plex Media Server" : "Plex Server Configuration"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
              {isUnconfigured
                ? "Enter your Plex server address to start streaming."
                : "PlexFlip connects directly to your local or remote Plex server."}
            </Typography>
          </Box>
        </Box>

        {/* Status / Error Banner */}
        {lastStatus?.error && !isUnconfigured && (
          <Alert
            severity="warning"
            icon={<ErrorOutlineRoundedIcon />}
            sx={{
              mb: 3,
              bgcolor: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#FDE68A",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {lastStatus.message}
            </Typography>
            <Typography variant="caption" sx={{ color: "#CBD5E1", display: "block", mt: 0.5 }}>
              Check your network connection, verify Plex is running, or update the address below.
            </Typography>
          </Alert>
        )}

        {/* Success Alert */}
        {saveSuccess && (
          <Fade in={saveSuccess}>
            <Alert
              severity="success"
              icon={<CheckCircleRoundedIcon />}
              sx={{
                mb: 3,
                bgcolor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#A7F3D0",
              }}
            >
              Plex server address configured! Connecting to PlexFlip...
            </Alert>
          </Fade>
        )}

        {/* Save Error Alert */}
        {saveError && (
          <Alert
            severity="error"
            icon={<ErrorOutlineRoundedIcon />}
            sx={{
              mb: 3,
              bgcolor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            {saveError}
          </Alert>
        )}

        {/* Test Connection Result Alert */}
        {testResult && (
          <Alert
            severity={testResult.ok ? "success" : "error"}
            icon={testResult.ok ? <CheckCircleRoundedIcon /> : <ErrorOutlineRoundedIcon />}
            sx={{
              mb: 3,
              bgcolor: testResult.ok ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              border: testResult.ok ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            {testResult.message}
          </Alert>
        )}

        {/* URL Input Form */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: "#CBD5E1", fontWeight: 600 }}>
            Server Address (URL)
          </Typography>
          <TextField
            id="plex-server-input"
            fullWidth
            variant="outlined"
            placeholder="http://192.168.1.100:32400"
            value={serverUrl}
            onChange={(e) => {
              setServerUrl(e.target.value);
              setTestResult(null);
              setSaveError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving && !testing) {
                handleSaveAndConnect();
              }
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
                bgcolor: "rgba(9, 14, 26, 0.75)",
                borderRadius: 2,
                color: "#F4F8FF",
                fontSize: "1rem",
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.15)",
                },
                "&:hover fieldset": {
                  borderColor: "#818CF8",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#6366F1",
                  boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.25)",
                },
              },
            }}
          />

          {/* Quick Preset Chips */}
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 1.5 }}>
            <Typography variant="caption" sx={{ color: "#94A3B8", mr: 0.5 }}>
              Quick presets:
            </Typography>
            <Chip
              id="preset-localhost"
              label="http://localhost:32400"
              size="small"
              onClick={() => {
                setServerUrl("http://localhost:32400");
                setTestResult(null);
              }}
              sx={{
                bgcolor: "rgba(99, 102, 241, 0.12)",
                color: "#C7D2FE",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(99, 102, 241, 0.25)" },
              }}
            />
            <Chip
              id="preset-127"
              label="http://127.0.0.1:32400"
              size="small"
              onClick={() => {
                setServerUrl("http://127.0.0.1:32400");
                setTestResult(null);
              }}
              sx={{
                bgcolor: "rgba(99, 102, 241, 0.12)",
                color: "#C7D2FE",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(99, 102, 241, 0.25)" },
              }}
            />
          </Box>
        </Box>

        {/* Buttons Bar */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 4,
            pt: 2,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            gap: 2,
          }}
        >
          <Button
            id="test-connection-btn"
            variant="outlined"
            onClick={handleTestConnection}
            disabled={testing || saving || !serverUrl.trim()}
            startIcon={testing ? <CircularProgress size={18} color="inherit" /> : <SensorsRoundedIcon />}
            sx={{
              borderColor: "rgba(99, 102, 241, 0.4)",
              color: "#C7D2FE",
              px: 2.5,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              "&:hover": {
                borderColor: "#818CF8",
                bgcolor: "rgba(99, 102, 241, 0.15)",
              },
            }}
          >
            {testing ? "Testing..." : "Test Connection"}
          </Button>

          <Button
            id="save-connect-btn"
            variant="contained"
            onClick={handleSaveAndConnect}
            disabled={saving || !serverUrl.trim()}
            endIcon={saving ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardRoundedIcon />}
            sx={{
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              color: "#FFFFFF",
              px: 3.5,
              py: 1,
              borderRadius: 2,
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
              "&:hover": {
                background: "linear-gradient(135deg, #818CF8 0%, #6366F1 100%)",
                boxShadow: "0 6px 18px rgba(99, 102, 241, 0.55)",
              },
            }}
          >
            {saving ? "Saving..." : "Save & Connect"}
          </Button>
        </Box>

        {/* Help Toggle */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            size="small"
            startIcon={<HelpOutlineRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={() => setShowHelp(!showHelp)}
            sx={{ color: "#94A3B8", textTransform: "none", fontSize: "0.82rem" }}
          >
            {showHelp ? "Hide troubleshooting tips" : "Need help finding your server address?"}
          </Button>

          <Collapse in={showHelp}>
            <Box
              sx={{
                mt: 1.5,
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.06)",
                textAlign: "left",
              }}
            >
              <Typography variant="body2" sx={{ color: "#CBD5E1", mb: 1, fontWeight: 600 }}>
                Finding your Plex Server URL:
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", mb: 0.5 }}>
                • <strong>Same computer:</strong> Use <code>http://localhost:32400</code> or <code>http://127.0.0.1:32400</code>
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", mb: 0.5 }}>
                • <strong>Local Network (LAN):</strong> Use your Plex machine's local IP address with port 32400, e.g. <code>http://192.168.1.50:32400</code>
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                • <strong>Remote / Reverse Proxy:</strong> Use your domain e.g. <code>https://plex.yourdomain.com</code>
              </Typography>
            </Box>
          </Collapse>
        </Box>
      </Paper>
    </Box>
  );
}

export default Utility;
