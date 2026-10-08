import React from "react";
import { Box, Paper, Typography, SxProps, Theme } from "@mui/material";

interface SettingsCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  sx,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        p: { xs: 2.5, sm: 3 },
        borderRadius: "16px",
        bgcolor: "rgba(18, 25, 39, 0.65)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          borderColor: "rgba(255, 255, 255, 0.12)",
        },
        ...sx,
      }}
    >
      {(title || icon || action) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
            mb: subtitle || children ? 2.5 : 0,
            pb: subtitle || children ? 2 : 0,
            borderBottom:
              subtitle || children ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {icon && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: "10px",
                  bgcolor: "rgba(99, 102, 241, 0.12)",
                  color: "#818CF8",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                }}
              >
                {icon}
              </Box>
            )}
            <Box>
              {title && (
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 650,
                    fontSize: "1.05rem",
                    color: "#F4F8FF",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "#94A3B8",
                    fontSize: "0.85rem",
                    mt: 0.25,
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {action && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                alignSelf: { xs: "flex-end", sm: "center" },
              }}
            >
              {action}
            </Box>
          )}
        </Box>
      )}

      {children}
    </Paper>
  );
};

export default SettingsCard;
