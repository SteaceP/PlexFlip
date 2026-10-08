import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { signInWithEmailPassword } from "../../plex";

interface EmailLoginFormProps {
  onSuccess: (authToken: string) => Promise<boolean>;
  onCancel: () => void;
}

export default function EmailLoginForm({
  onSuccess,
  onCancel,
}: EmailLoginFormProps) {
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState<boolean>(false);
  const [emailLoginLoading, setEmailLoginLoading] = useState<boolean>(false);
  const [emailLoginError, setEmailLoginError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
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
        const ok = await onSuccess(res.authToken);
        if (!ok) {
          setEmailLoginLoading(false);
        }
      }
    } catch (err: any) {
      setEmailLoginError(err?.message || "Failed to sign in. Please try again.");
      setEmailLoginLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <IconButton
            size="small"
            onClick={onCancel}
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
          onClick={onCancel}
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
  );
}
