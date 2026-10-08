import React from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { openExternalURL } from "../../common/DesktopApp";

interface PinCodeCardProps {
  code?: string;
  copied: boolean;
  onCopy: () => void;
  onQuickLink: () => void;
}

export default function PinCodeCard({
  code,
  copied,
  onCopy,
  onQuickLink,
}: PinCodeCardProps) {
  return (
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
          {code || "••••"}
        </Typography>
        <Tooltip title={copied ? "Copied!" : "Copy code"}>
          <IconButton
            size="small"
            onClick={onCopy}
            disabled={!code}
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
        onClick={onQuickLink}
        disabled={!code}
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
  );
}
