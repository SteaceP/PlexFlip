import React from "react";
import { Box, Button, Divider, Typography } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import AppleIcon from "@mui/icons-material/Apple";
import GoogleSvgIcon from "./GoogleSvgIcon";

interface SocialLoginButtonsProps {
  hasCode: boolean;
  onEmailClick: () => void;
  onGoogleClick: () => void;
  onAppleClick: () => void;
}

export default function SocialLoginButtons({
  hasCode,
  onEmailClick,
  onGoogleClick,
  onAppleClick,
}: SocialLoginButtonsProps) {
  return (
    <>
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
        onClick={onEmailClick}
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
        onClick={onGoogleClick}
        disabled={!hasCode}
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
        onClick={onAppleClick}
        disabled={!hasCode}
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
    </>
  );
}
