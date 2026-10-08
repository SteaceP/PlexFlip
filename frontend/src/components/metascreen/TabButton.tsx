import React from "react";
import { Typography } from "@mui/material";

export interface TabButtonProps {
  text: string;
  onClick: (event: React.MouseEvent) => void;
  selected: boolean;
}

export function TabButton({ text, onClick, selected }: TabButtonProps) {
  return (
    <Typography
      sx={{
        fontSize: { xs: "0.85rem", sm: "1.25rem" },
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        whiteSpace: "nowrap",
        flexShrink: 0,
        color: selected
          ? (theme) => theme.palette.primary.main
          : (theme) => theme.palette.text.disabled,
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
        pb: 0.5,

        "&:after": {
          content: '""',
          position: "absolute",
          bottom: 0,
          left: 0,
          width: selected ? "100%" : "0%",
          height: "2px",
          backgroundColor: (theme) => theme.palette.primary.main,
          transition: "all 0.3s ease",
        },

        "&:hover": {
          color: (theme) =>
            selected ? theme.palette.primary.main : theme.palette.text.primary,

          "&:after": {
            width: "100%",
          },
        },

        transition: "all 0.3s ease",
      }}
      onClick={onClick}
    >
      {text}
    </Typography>
  );
}

export default TabButton;
