import React from "react";
import { Box, Typography, Switch, Chip } from "@mui/material";

export interface CheckBoxOptionProps {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export function CheckBoxOption({
  title,
  subtitle,
  checked,
  onChange,
  icon,
  badge,
  disabled = false,
}: CheckBoxOptionProps) {
  return (
    <Box
      onClick={() => {
        if (!disabled) {
          onChange(!checked);
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        p: { xs: 2, sm: 2.25 },
        borderRadius: "12px",
        bgcolor: checked ? "rgba(99, 102, 241, 0.07)" : "rgba(18, 25, 39, 0.4)",
        border: "1px solid",
        borderColor: checked ? "rgba(99, 102, 241, 0.35)" : "rgba(255, 255, 255, 0.06)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        userSelect: "none",
        "&:hover": !disabled
          ? {
              bgcolor: checked ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.04)",
              borderColor: checked ? "rgba(99, 102, 241, 0.55)" : "rgba(255, 255, 255, 0.14)",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
            }
          : {},
        "&:active": !disabled
          ? {
              transform: "translateY(0px)",
            }
          : {},
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.75, flex: 1, minWidth: 0 }}>
        {icon && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "10px",
              bgcolor: checked ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.05)",
              color: checked ? "#A5B4FC" : "#94A3B8",
              border: "1px solid",
              borderColor: checked ? "rgba(99, 102, 241, 0.3)" : "rgba(255, 255, 255, 0.08)",
              flexShrink: 0,
              mt: 0.25,
              transition: "all 0.2s ease",
            }}
          >
            {icon}
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                fontSize: "0.95rem",
                color: checked ? "#F8FAFC" : "#E2E8F0",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </Typography>

            {badge && (
              <Chip
                label={badge}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  bgcolor: "rgba(245, 158, 11, 0.15)",
                  color: "#FBBF24",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                }}
              />
            )}
          </Box>

          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: "#94A3B8",
                fontSize: "0.83rem",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      <Switch
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.checked);
        }}
        onClick={(e) => e.stopPropagation()}
        sx={{
          flexShrink: 0,
          "& .MuiSwitch-switchBase.Mui-checked": {
            color: "#818CF8",
            "&:hover": {
              backgroundColor: "rgba(99, 102, 241, 0.1)",
            },
          },
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
            backgroundColor: "#6366F1",
            opacity: 0.8,
          },
          "& .MuiSwitch-track": {
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 16,
          },
        }}
      />
    </Box>
  );
}

export default CheckBoxOption;
