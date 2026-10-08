import React, { JSX, useState } from "react";
import {
  Box,
  Checkbox,
  Divider,
  LinearProgress,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  CheckBoxOutlineBlankRounded,
  CheckBoxRounded,
  CheckCircleOutlineRounded,
  CheckCircleRounded,
  PlayArrowRounded,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useConfirmModal } from "../ConfirmModal";
import { getTranscodeImageURL, setMediaPlayedStatus } from "../../plex";
import { getMinutes } from "./utils";

export interface EpisodeItemProps {
  item: Plex.Metadata;
  onClick?: (event: React.MouseEvent) => void;
  refetchData: () => void;
  selected?: boolean;
  setSelected?: (selected: boolean) => void;
  selectMode?: boolean;
  setSelectMode?: (selectMode: boolean) => void;
}

export function EpisodeItem({
  item,
  onClick,
  refetchData,
  selected,
  setSelected,
  selectMode,
  setSelectMode,
}: EpisodeItemProps): JSX.Element {
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const navigate = useNavigate();

  const handlePlay = async () => {
    if (!item) return;
    navigate(`/watch/${item.ratingKey}`);
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
  };

  return (
    <>
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <Typography
          sx={{
            fontSize: "1rem",
            fontWeight: "bold",
            px: 1,
            maxWidth: "200px",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          EP.{item.index}: {item.title}
        </Typography>

        <Divider
          sx={{
            my: 1,
          }}
        />

        <MenuItem
          onClick={async (e) => {
            e.stopPropagation();
            await handlePlay();
            handleClose();
          }}
        >
          <ListItemIcon>
            <PlayArrowRounded fontSize="small" />
          </ListItemIcon>
          Play
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            if (setSelectMode) setSelectMode(!selectMode);
            if (setSelected) setSelected(!selected);
            handleClose();
          }}
        >
          <ListItemIcon>
            {selectMode ? (
              <CheckBoxRounded fontSize="small" />
            ) : (
              <CheckBoxOutlineBlankRounded fontSize="small" />
            )}
          </ListItemIcon>
          {selectMode ? "Disable Selection" : "Enable Selection"}
        </MenuItem>

        <Divider
          sx={{
            my: 1,
          }}
        />

        <MenuItem
          onClick={async () => {
            if (!item) return;

            useConfirmModal.getState().setModal({
              title: `Mark as Watched`,
              message: `Are you sure you want to mark "${item.title}" as Watched?`,
              onConfirm: async () => {
                switch (item.type) {
                  case "movie":
                  case "episode":
                    item.viewCount = 1;
                    await setMediaPlayedStatus(true, item.ratingKey);
                    break;
                  case "show":
                    item.viewedLeafCount = item.leafCount;
                    await setMediaPlayedStatus(true, item.ratingKey);
                    break;
                  default:
                    break;
                }

                handleClose();
                refetchData?.();
              },
              onCancel: () => {
                handleClose();
              },
            });
          }}
        >
          <ListItemIcon>
            <CheckCircleRounded fontSize="small" />
          </ListItemIcon>
          Mark as Watched
        </MenuItem>
        <MenuItem
          onClick={async () => {
            if (!item) return;

            useConfirmModal.getState().setModal({
              title: `Mark as Unwatched`,
              message: `Are you sure you want to mark "${item.title}" as Unwatched?`,
              onConfirm: async () => {
                switch (item.type) {
                  case "movie":
                  case "episode":
                    item.viewCount = 0;
                    await setMediaPlayedStatus(false, item.ratingKey);
                    break;
                  case "show":
                    item.viewedLeafCount = 0;
                    await setMediaPlayedStatus(false, item.ratingKey);
                    break;
                  default:
                    break;
                }

                handleClose();
                refetchData?.();
              },
              onCancel: () => {
                handleClose();
              },
            });
          }}
        >
          <ListItemIcon>
            <CheckCircleOutlineRounded fontSize="small" />
          </ListItemIcon>
          Mark as Unwatched
        </MenuItem>
      </Menu>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: 2,
          userSelect: "none",
          cursor: "pointer",
          borderRadius: "10px",
          p: 1.5,
          mb: 1,
          transition: "all 0.5s ease",
          "&:hover": {
            backgroundColor: (theme) =>
              alpha(theme.palette.background.paper, 0.5),
            transition: "all 0.2s ease",
          },

          // on hover get the 2nd child and then the 1st child of that
          "&:hover > :nth-child(2)": {
            "& > :nth-child(1)": {
              opacity: 1,
              transition: "all 0.2s ease-in",
            },
          },
        }}
        onClick={(e) => {
          if (onClick) onClick(e);
        }}
        onContextMenu={handleContextMenu}
      >
        <Box
          sx={{
            minWidth: { xs: "30px", sm: "40px" },
            width: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {!selectMode && (
            <Typography
              sx={{
                fontSize: { xs: "1rem", sm: "1.25rem" },
                fontWeight: "bold",
                color: (theme) => theme.palette.text.primary,
                textAlign: "center",
              }}
            >
              {item.index}
            </Typography>
          )}

          {selectMode && (
            <Checkbox
              checked={selected}
              onChange={() => {
                if (setSelected) setSelected(!selected);
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            width: { xs: "120px", sm: "20%" },
            flexShrink: 0,
            borderRadius: "8px",
            aspectRatio: "16/9",
            backgroundImage: `url(${getTranscodeImageURL(
              item.thumb,
              380,
              214
            )})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundBlendMode: "darken",
            overflow: "hidden",
            whiteSpace: "nowrap",
            transition: "all 0.3s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            position: "relative",
            boxShadow: (theme) =>
              `0 4px 6px -1px ${alpha(theme.palette.common.black, 0.2)}`,
          }}
        >
          <PlayArrowRounded
            sx={{
              color: "#FFFFFF",
              fontSize: "400%",
              m: "auto",
              opacity: 0,
              backgroundColor: "#00000088",
              borderRadius: "50%",
              transition: "all 0.3s ease-out",
            }}
          />

          {(item.viewOffset || (item.viewCount && item.viewCount >= 1)) && (
            <LinearProgress
              value={
                item.viewOffset ? (item.viewOffset / item.duration) * 100 : 100
              }
              variant="determinate"
              sx={{
                width: "100%",
                height: "4px",
                backgroundColor: (theme) =>
                  alpha(theme.palette.common.black, 0.5),

                position: "absolute",
                bottom: 0,
                "& .MuiLinearProgress-bar": {
                  backgroundColor: (theme) => theme.palette.primary.main,
                },
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            ml: 1,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "1rem", sm: "1.5rem" },
                fontWeight: "bold",
                color: (theme) => theme.palette.text.primary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                flex: 1,
                mr: 1,
              }}
            >
              {item.title}
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1,
                color: (theme) => theme.palette.text.secondary,
                whiteSpace: "nowrap",
                flexShrink: 0,
                fontSize: { xs: "0.85rem", sm: "1rem" },
              }}
            >
              {getMinutes(item.duration)} Min.
            </Box>
          </Box>

          <Typography
            sx={{
              fontSize: { xs: "0.85rem", sm: "1rem" },
              fontWeight: "light",
              color: (theme) => theme.palette.text.secondary,
              mt: 0.5,
              // make it so the text doesnt resize the parent nor overflow max 3 rows
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: { xs: 2, sm: 3 },
              WebkitBoxOrient: "vertical",
            }}
            title={item.summary}
          >
            {item.summary}
          </Typography>
        </Box>
      </Box>
    </>
  );
}

export default EpisodeItem;
