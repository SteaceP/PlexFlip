import React, { JSX } from "react";
import { Avatar, Box, Grid, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useInView } from "react-intersection-observer";
import { useSearchParams } from "react-router-dom";
import { getTranscodeImageURL } from "../../plex";

export interface ActorItemProps {
  role: Plex.Role;
  data: Plex.Metadata;
}

export function ActorItem({ role, data }: ActorItemProps): JSX.Element {
  const { inView, ref } = useInView();
  const [, setSearchParams] = useSearchParams();

  return (
    <Grid size={{ xl: 3, lg: 4, md: 6, sm: 6, xs: 6 }} ref={ref}>
      {inView ? (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: { xs: "10px", sm: "20px" },
            backgroundColor: (theme) =>
              alpha(theme.palette.background.paper, 0.4),
            padding: { xs: "5px 10px", sm: "10px 20px" },
            borderRadius: "10px",
            userSelect: "none",
            cursor: "pointer",
            transition: "transform 0.2s ease",

            "&:hover": {
              backgroundColor: (theme) =>
                alpha(theme.palette.background.paper, 0.7),
              transform: "translateY(-2px)",
            },
          }}
          onClick={() => {
            setSearchParams(
              new URLSearchParams({
                bkey: `/library/sections/${data.librarySectionID}/actor/${role.id}`,
              })
            );
          }}
        >
          <Avatar
            src={`${getTranscodeImageURL(role.thumb, 200, 200)}`}
            sx={{
              width: { xs: "35%", sm: "25%" },
              height: "auto",
              aspectRatio: "1/1",
              borderRadius: "50%",
            }}
          />

          <Box
            sx={{
              width: { xs: "65%", sm: "75%" },
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              overflow: "hidden",
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "0.85rem", sm: "1rem" },
                color: (theme) => theme.palette.text.primary,
                fontWeight: "medium",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                width: "100%",
              }}
            >
              {role.tag}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.65rem", sm: "0.75rem" },
                color: (theme) => theme.palette.text.secondary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                width: "100%",
              }}
            >
              {role.role}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            width: "100%",
            height: "100px",
            backgroundColor: (theme) =>
              alpha(theme.palette.background.paper, 0.2),
            borderRadius: "10px",
          }}
        />
      )}
    </Grid>
  );
}

export default ActorItem;
