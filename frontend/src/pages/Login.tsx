import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { queryBuilder } from "../plex/QuickFunctions";
import { useSearchParams } from "react-router-dom";
import { getAccessToken, getPin, signInWithEmailPassword } from "../plex";
import axios from "axios";
import { ProxiedRequest, getBackendURL } from "../backendURL";
import { XMLParser } from "fast-xml-parser";
import { isDesktopApp, openExternalURL } from "../common/DesktopApp";
import AppleIcon from "@mui/icons-material/Apple";
import EmailIcon from "@mui/icons-material/Email";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

function GoogleSvgIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ display: "block" }}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function Login() {
  const [query] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [pinData, setPinData] = useState<{ id: number; code: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [browserOpened, setBrowserOpened] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [browserCallbackComplete, setBrowserCallbackComplete] = useState<boolean>(false);

  // Direct Email & Password Sign-In Form state
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState<boolean>(false);
  const [emailLoginLoading, setEmailLoginLoading] = useState<boolean>(false);
  const [emailLoginError, setEmailLoginError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletingRef = useRef<boolean>(false);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const completeLogin = useCallback(async (authToken: string): Promise<boolean> => {
    if (isCompletingRef.current) return false;
    isCompletingRef.current = true;
    setIsCompleting(true);
    stopPolling();

    try {
      const serverIdentity = await ProxiedRequest("/identity", "GET", {
        "X-Plex-Token": authToken,
      });

      if (!serverIdentity || !serverIdentity.data?.MediaContainer) {
        setError(
          `Failed to log in: ${
            serverIdentity?.data?.errors?.[0]?.message || "Could not retrieve Plex server identity."
          }`
        );
        isCompletingRef.current = false;
        setIsCompleting(false);
        return false;
      }

      const serverID = serverIdentity.data.MediaContainer.machineIdentifier;

      const parser = new XMLParser({
        attributeNamePrefix: "",
        textNodeName: "value",
        ignoreAttributes: false,
        parseAttributeValue: true,
      });

      // try getting shared servers
      const sharedServersXML = await axios.get(
        `https://plex.tv/api/resources?${queryBuilder({
          "X-Plex-Token": authToken,
        })}`
      );

      const sharedServers = parser.parse(sharedServersXML.data);

      let targetServer: any = null;
      const devices = sharedServers?.MediaContainer?.Device;
      const deviceList: any[] = Array.isArray(devices) ? devices : devices ? [devices] : [];

      if (serverID) {
        targetServer = deviceList.find(
          (server: any) => server.clientIdentifier === serverID
        );
      }
      if (!targetServer) {
        targetServer = deviceList.find(
          (server: any) =>
            typeof server.provides === "string" &&
            server.provides.includes("server") &&
            Boolean(server.accessToken)
        );
      }
      if (!targetServer && deviceList.length > 0) {
        targetServer = deviceList.find((server: any) => Boolean(server.accessToken));
      }

      const effectiveAccessToken = targetServer?.accessToken || authToken;

      localStorage.setItem("accessToken", effectiveAccessToken);
      localStorage.setItem("accAccessToken", authToken);

      // Notify backend that auth is complete to focus desktop window
      try {
        const backendURL = getBackendURL();
        await fetch(backendURL ? `${backendURL}/api/auth-complete` : "/api/auth-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authToken,
            accessToken: effectiveAccessToken,
            serverID: serverID || "",
          }),
        });
      } catch (postErr) {
        console.warn("Failed to notify backend of auth completion:", postErr);
      }

      if (isDesktopApp()) {
        window.location.href = "/";
      } else {
        // If this page was opened as a redirect callback in an external browser
        setBrowserCallbackComplete(true);
        setIsCompleting(false);
        // Attempt to close the browser tab after short delay
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {}
        }, 2000);
      }
      return true;
    } catch (e: any) {
      console.error("completeLogin error:", e);
      setError(e?.message || "Failed to log in. Please try again.");
      isCompletingRef.current = false;
      setIsCompleting(false);
      return false;
    }
  }, [stopPolling]);

  const createPinAndStartPolling = useCallback(async () => {
    stopPolling();
    setError(null);

    let clientID = localStorage.getItem("clientID");
    if (!clientID) {
      clientID = `plexflip-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("clientID", clientID);
    }

    try {
      const pin = await getPin();
      if (!pin.id || !pin.code) {
        setError("Failed to generate login PIN from Plex. Please try again.");
        return;
      }

      setPinData({ id: pin.id, code: pin.code });

      // Register PIN and clientID with local backend
      try {
        const backendURL = getBackendURL();
        await fetch(backendURL ? `${backendURL}/api/auth-pin` : "/api/auth-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinID: String(pin.id), clientID }),
        });
      } catch (pinRegErr) {
        console.warn("Could not register PIN with backend:", pinRegErr);
      }

      // Start polling Plex API for token resolution
      pollIntervalRef.current = setInterval(async () => {
        if (isCompletingRef.current) return;
        try {
          const checkRes = await getAccessToken(String(pin.id), clientID as string);
          if (checkRes && checkRes.authToken) {
            stopPolling();
            await completeLogin(checkRes.authToken);
          }
        } catch (pollErr) {
          // ignore transient poll errors while waiting for user sign-in
        }
      }, 1500);
    } catch (err: any) {
      console.error("Failed to get PIN:", err);
      setError("Failed to connect to Plex authentication servers. Check your internet connection.");
    }
  }, [completeLogin, stopPolling]);

  useEffect(() => {
    // Case 1: Browser redirected back with pinID query parameter
    if (query.has("pinID")) {
      const pinID = query.get("pinID") as string;
      let clientID = query.get("clientID") || localStorage.getItem("clientID") || "";

      (async () => {
        try {
          setIsCompleting(true);

          if (!clientID) {
            try {
              const backendURL = getBackendURL();
              const pinRes = await axios.get(
                `${backendURL ? `${backendURL}/api/auth-pin` : "/api/auth-pin"}?pinID=${encodeURIComponent(pinID)}`
              );
              if (pinRes.data?.clientID) {
                clientID = pinRes.data.clientID;
              }
            } catch (pinErr) {
              console.warn("Failed to retrieve clientID from backend:", pinErr);
            }
          }

          if (clientID) {
            localStorage.setItem("clientID", clientID);
          }

          const res = await getAccessToken(pinID, clientID);
          if (res && res.authToken) {
            await completeLogin(res.authToken);
          } else {
            setError(
              "Plex did not finish linking PlexFlip to your account. Go back to the PlexFlip app and click Continue again. You are probably signed in to Plex in this browser now, so it should only take one click."
            );
            setIsCompleting(false);
            try {
              const backendURL = getBackendURL();
              await fetch(backendURL ? `${backendURL}/api/auth-focus` : "/api/auth-focus", {
                method: "POST",
              });
            } catch (focusErr) {}
          }
        } catch (e: any) {
          console.error("Callback getAccessToken error:", e);
          setError("Failed to complete login from callback. Please try again.");
          setIsCompleting(false);
        }
      })();
      return;
    }

    // Case 2: Already logged in
    if (localStorage.getItem("accessToken")) {
      window.location.href = "/";
      return;
    }

    // Case 3: Initial load -> request PIN and start polling
    createPinAndStartPolling();

    return () => {
      stopPolling();
    };
  }, [query, completeLogin, createPinAndStartPolling, stopPolling]);

  const handleCopyCode = () => {
    if (pinData?.code) {
      navigator.clipboard.writeText(pinData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleQuickLink = async () => {
    if (pinData?.code) {
      try {
        await navigator.clipboard.writeText(pinData.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {}
    }
    setBrowserOpened(true);
    setInfoMessage("Code copied! Enter it at plex.tv/link in your browser.");
    await openExternalURL("https://plex.tv/link");
  };

  const handleGoogleSignIn = async () => {
    if (pinData?.code) {
      try {
        await navigator.clipboard.writeText(pinData.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {}
    }
    setBrowserOpened(true);
    setInfoMessage(
      `Code ${pinData?.code || ""} copied! On plex.tv/link, sign in with your Google account and enter your 4-letter code.`
    );
    await openExternalURL("https://plex.tv/link");
  };

  const handleAppleSignIn = async () => {
    if (pinData?.code) {
      try {
        await navigator.clipboard.writeText(pinData.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {}
    }
    setBrowserOpened(true);
    setInfoMessage(
      `Code ${pinData?.code || ""} copied! On plex.tv/link, sign in with Apple and enter your 4-letter code.`
    );
    await openExternalURL("https://plex.tv/link");
  };

  const handleEmailSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) {
      setEmailLoginError("Please enter your email/username and password.");
      return;
    }
    setEmailLoginLoading(true);
    setEmailLoginError(null);
    try {
      const res = await signInWithEmailPassword(
        emailInput.trim(),
        passwordInput.trim(),
        twoFactorCode.trim() || undefined
      );
      if (res.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setEmailLoginError(res.error || "Two-factor verification code required.");
        setEmailLoginLoading(false);
        return;
      }
      if (res.error) {
        setEmailLoginError(res.error);
        setEmailLoginLoading(false);
        return;
      }
      if (res.authToken) {
        const ok = await completeLogin(res.authToken);
        if (!ok) {
          setEmailLoginLoading(false);
        }
      }
    } catch (err: any) {
      setEmailLoginError(err?.message || "Failed to sign in. Please try again.");
      setEmailLoginLoading(false);
    }
  };

  // If this tab was the browser window completing auth:
  if (browserCallbackComplete) {
    const handleReturnToApp = async () => {
      try {
        const backendURL = getBackendURL();
        await fetch(backendURL ? `${backendURL}/api/auth-focus` : "/api/auth-focus", {
          method: "POST",
        });
      } catch (e) {}
      try {
        window.close();
      } catch (e) {}
    };

    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 100%)",
          p: 3,
        }}
      >
        <Card
          sx={{
            maxWidth: 480,
            width: "100%",
            p: 4.5,
            textAlign: "center",
            background: "rgba(18, 24, 38, 0.9)",
            backdropFilter: "blur(24px)",
            borderRadius: "24px",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.2)",
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 52, color: "#10B981" }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#F8FAFC" }}>
            Sign-in Successful!
          </Typography>
          <Typography variant="body1" sx={{ color: "#94A3B8", mb: 3.5, lineHeight: 1.6 }}>
            Your Plex account has been linked. You can safely close this browser window and return to PlexFlip.
          </Typography>

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleReturnToApp}
              sx={{
                py: 1.6,
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "14px",
                fontSize: "1rem",
                background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                boxShadow: "0 8px 20px rgba(99, 102, 241, 0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
                },
              }}
            >
              Return to PlexFlip Desktop App
            </Button>

            <Button
              variant="text"
              fullWidth
              onClick={() => {
                window.location.href = "/";
              }}
              sx={{
                py: 1,
                color: "#94A3B8",
                fontWeight: 600,
                textTransform: "none",
                "&:hover": { color: "#F8FAFC" },
              }}
            >
              Or continue in this web browser
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 10%, #1e1b4b 0%, #030712 100%)",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Card
        sx={{
          maxWidth: 460,
          width: "100%",
          p: { xs: 3, sm: 4.5 },
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(24px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.15)",
        }}
      >
        {/* Header */}
        <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ mb: 3.5 }}>
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: "16px",
              background: "linear-gradient(135deg, #e5a00d 0%, #e07000 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(229, 160, 13, 0.35)",
              mb: 0.5,
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: "1.8rem", color: "#000" }}>
              P
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.02em" }}>
            Sign in to Plex
          </Typography>
          <Typography variant="body2" sx={{ color: "#94A3B8", maxWidth: 360, lineHeight: 1.5 }}>
            Authenticate with your Plex account to access and stream your libraries.
          </Typography>
        </Stack>

        <Collapse in={Boolean(infoMessage)}>
          <Alert
            severity="info"
            onClose={() => setInfoMessage(null)}
            sx={{
              mb: 2.5,
              borderRadius: "12px",
              background: "rgba(59, 130, 246, 0.15)",
              color: "#93C5FD",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              fontSize: "0.88rem",
            }}
          >
            {infoMessage}
          </Alert>
        </Collapse>

        <Collapse in={Boolean(error)}>
          <Alert
            severity="error"
            action={
              <IconButton size="small" color="inherit" onClick={createPinAndStartPolling}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            }
            sx={{ mb: 2.5, borderRadius: "12px", background: "rgba(239, 68, 68, 0.12)", color: "#FCA5A5" }}
          >
            {error}
          </Alert>
        </Collapse>

        {isCompleting ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <CircularProgress size={44} sx={{ color: "#6366F1", mb: 2 }} />
            <Typography sx={{ fontWeight: 700, color: "#F8FAFC" }}>
              Connecting to Plex server...
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8" }}>
              Finalizing credentials and libraries
            </Typography>
          </Box>
        ) : showEmailForm ? (
          /* Direct In-App Email & Password Sign-In */
          <Box component="form" onSubmit={handleEmailSignIn}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmailLoginError(null);
                  }}
                  sx={{ color: "#94A3B8", "&:hover": { color: "#F8FAFC" } }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                  Email & Password Sign-In
                </Typography>
              </Stack>

              <Collapse in={Boolean(emailLoginError)}>
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: "12px",
                    background: "rgba(239, 68, 68, 0.12)",
                    color: "#FCA5A5",
                    fontSize: "0.85rem",
                  }}
                >
                  {emailLoginError}
                </Alert>
              </Collapse>

              <TextField
                label="Email or Username"
                variant="outlined"
                fullWidth
                size="small"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                autoComplete="username"
                disabled={emailLoginLoading}
                autoFocus
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#F8FAFC",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)" },
                    "&:hover fieldset": { borderColor: "#E5A00D" },
                    "&.Mui-focused fieldset": { borderColor: "#E5A00D" },
                  },
                  "& .MuiInputLabel-root": { color: "#94A3B8" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#E5A00D" },
                }}
              />

              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                size="small"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoComplete="current-password"
                disabled={emailLoginLoading}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#F8FAFC",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)" },
                    "&:hover fieldset": { borderColor: "#E5A00D" },
                    "&.Mui-focused fieldset": { borderColor: "#E5A00D" },
                  },
                  "& .MuiInputLabel-root": { color: "#94A3B8" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#E5A00D" },
                }}
              />

              {requiresTwoFactor && (
                <TextField
                  label="Verification Code (2FA)"
                  variant="outlined"
                  fullWidth
                  size="small"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="123456"
                  disabled={emailLoginLoading}
                  autoFocus
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "#F8FAFC",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)" },
                      "&:hover fieldset": { borderColor: "#E5A00D" },
                      "&.Mui-focused fieldset": { borderColor: "#E5A00D" },
                    },
                    "& .MuiInputLabel-root": { color: "#94A3B8" },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#E5A00D" },
                  }}
                />
              )}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={emailLoginLoading || !emailInput || !passwordInput}
                sx={{
                  py: 1.3,
                  borderRadius: "14px",
                  textTransform: "none",
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #E5A00D 0%, #D97706 100%)",
                  color: "#000000",
                  "&:hover": {
                    background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                  },
                }}
              >
                {emailLoginLoading ? (
                  <CircularProgress size={22} sx={{ color: "#000000" }} />
                ) : (
                  "Sign In with Plex"
                )}
              </Button>

              <Button
                variant="text"
                fullWidth
                onClick={() => {
                  setShowEmailForm(false);
                  setEmailLoginError(null);
                }}
                sx={{
                  color: "#94A3B8",
                  textTransform: "none",
                  fontSize: "0.85rem",
                  "&:hover": { color: "#F8FAFC" },
                }}
              >
                Cancel and view other options
              </Button>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={2}>
            {/* 1. Primary Recommendation: Quick Link with 4-Letter Code */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: "16px",
                background: "rgba(229, 160, 13, 0.06)",
                border: "1px solid rgba(229, 160, 13, 0.3)",
                textAlign: "center",
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#FBBF24" }}>
                  Link with 4-Letter Code
                </Typography>
                <Chip
                  label="Recommended"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    background: "rgba(229, 160, 13, 0.2)",
                    color: "#FBBF24",
                    border: "1px solid rgba(229, 160, 13, 0.4)",
                  }}
                />
              </Stack>

              <Typography variant="caption" sx={{ color: "#CBD5E1", display: "block", mb: 1.5, lineHeight: 1.4 }}>
                Works with Google, Apple, or Email. Open{" "}
                <Box
                  component="span"
                  onClick={() => openExternalURL("https://plex.tv/link")}
                  sx={{
                    color: "#E5A00D",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  plex.tv/link
                </Box>{" "}
                in your browser and enter:
              </Typography>

              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ mb: 1.8 }}>
                <Typography
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "2.4rem",
                    fontWeight: 900,
                    letterSpacing: "0.28em",
                    color: "#FBBF24",
                    textShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  {pinData?.code || "••••"}
                </Typography>
                <Tooltip title={copied ? "Copied!" : "Copy code"}>
                  <IconButton
                    size="small"
                    onClick={handleCopyCode}
                    disabled={!pinData?.code}
                    sx={{ color: copied ? "#10B981" : "#E5A00D" }}
                  >
                    {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Stack>

              <Button
                variant="contained"
                fullWidth
                size="medium"
                onClick={handleQuickLink}
                disabled={!pinData?.code}
                startIcon={<OpenInNewIcon fontSize="small" />}
                sx={{
                  py: 1.2,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  background: "linear-gradient(135deg, #E5A00D 0%, #D97706 100%)",
                  color: "#000000",
                  boxShadow: "0 4px 15px rgba(229, 160, 13, 0.3)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                    boxShadow: "0 6px 20px rgba(229, 160, 13, 0.4)",
                  },
                }}
              >
                {copied ? "Code Copied! Open plex.tv/link" : "Copy Code & Open plex.tv/link"}
              </Button>
            </Paper>

            {/* Divider */}
            <Box sx={{ position: "relative", my: 1, textAlign: "center" }}>
              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  px: 1.5,
                  background: "#0F172A",
                  color: "#64748B",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                OR SIGN IN DIRECTLY
              </Typography>
            </Box>

            {/* Continue with Email & Password */}
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setShowEmailForm(true);
                setEmailLoginError(null);
              }}
              startIcon={<EmailIcon sx={{ color: "#E5A00D" }} />}
              sx={{
                py: 1.3,
                px: 2,
                borderRadius: "14px",
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                borderColor: "rgba(255, 255, 255, 0.15)",
                color: "#F1F5F9",
                background: "rgba(255, 255, 255, 0.03)",
                "&:hover": {
                  borderColor: "rgba(229, 160, 13, 0.6)",
                  background: "rgba(229, 160, 13, 0.08)",
                  transform: "translateY(-1px)",
                },
                transition: "all 0.15s ease",
              }}
            >
              Continue with Email & Password
            </Button>

            {/* Continue with Google */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleGoogleSignIn}
              disabled={!pinData?.code}
              startIcon={<GoogleSvgIcon />}
              sx={{
                py: 1.3,
                px: 2,
                borderRadius: "14px",
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 700,
                background: "#FFFFFF",
                color: "#1F2937",
                "&:hover": {
                  background: "#F3F4F6",
                  transform: "translateY(-1px)",
                  boxShadow: "0 8px 20px rgba(255, 255, 255, 0.15)",
                },
                transition: "all 0.15s ease",
              }}
            >
              Continue with Google (via Code Link)
            </Button>

            {/* Continue with Apple */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleAppleSignIn}
              disabled={!pinData?.code}
              startIcon={<AppleIcon sx={{ color: "#FFFFFF" }} />}
              sx={{
                py: 1.3,
                px: 2,
                borderRadius: "14px",
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 700,
                background: "#000000",
                color: "#FFFFFF",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                "&:hover": {
                  background: "#18181b",
                  transform: "translateY(-1px)",
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.4)",
                },
                transition: "all 0.15s ease",
              }}
            >
              Continue with Apple (via Code Link)
            </Button>

            {/* Waiting Status */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="center"
              spacing={1.2}
              sx={{ pt: 0.5 }}
            >
              <CircularProgress size={16} sx={{ color: "#6366F1" }} />
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 500 }}>
                {browserOpened
                  ? "Waiting for sign-in approval... PlexFlip connects automatically."
                  : "Waiting for sign-in... PlexFlip connects automatically."}
              </Typography>
            </Stack>

          </Stack>
        )}
      </Card>
    </Box>
  );
}
