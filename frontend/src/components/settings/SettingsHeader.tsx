import React from "react";
import { Box, Typography, Chip } from "@mui/material";

interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
  category?: string;
  chip?: {
    label: string;
    color?: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
    icon?: React.ReactElement;
  };
  action?: React.ReactNode;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  title,
  subtitle,
  category,
  chip,
  action,
}) => {
  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        mb: 3.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {category && (
            <Typography
              variant="caption"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
                color: "#818CF8",
                fontSize: "0.75rem",
              }}
            >
              {category}
            </Typography>
          )}

          <Typography
            variant="h4"
            sx={{
              fontWeight: 750,
              fontSize: { xs: "1.5rem", sm: "1.85rem", md: "2.1rem" },
              color: "#F8FAFC",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
        </Box>

        {(chip || action) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            {chip && (
              <Chip
                label={chip.label}
                icon={chip.icon}
                color={chip.color || "default"}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  borderRadius: "8px",
                  backdropFilter: "blur(8px)",
                }}
              />
            )}
            {action}
          </Box>
        )}
      </Box>

      {subtitle && (
        <Typography
          variant="body1"
          sx={{
            color: "#94A3B8",
            fontSize: "0.95rem",
            maxWidth: "760px",
            lineHeight: 1.5,
            mt: 0.5,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default SettingsHeader;
