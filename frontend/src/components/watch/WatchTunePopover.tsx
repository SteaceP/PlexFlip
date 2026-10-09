import React, { useState } from "react";
import {
  alpha,
  Box,
  Paper,
  Popover,
  Theme,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ArrowBackIosRounded,
  CheckRounded,
} from "@mui/icons-material";
import {
  getUniversalDecision,
  putAudioStream,
  putSubtitleStream,
} from "../../plex";
import { useUserSettings } from "../../states/UserSettingsState";
import { getCurrentVideoLevels, QualityState } from "./WatchUtils";
import ReactPlayer from "../../common/ReactPlayer";

interface WatchTunePopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  metadata: Plex.Metadata | null;
  itemID?: string;
  quality: QualityState;
  onQualityChange: (quality: QualityState) => void;
  loadMetadata: (itemID: string) => Promise<void>;
  playerRef: React.RefObject<ReactPlayer | null>;
  seekToAfterLoadRef: React.MutableRefObject<number | null>;
  onStreamReload: (meta: Plex.Metadata, quality: QualityState) => void;
}

export const WatchTunePopover: React.FC<WatchTunePopoverProps> = ({
  open,
  anchorEl,
  onClose,
  metadata,
  itemID,
  quality,
  onQualityChange,
  loadMetadata,
  playerRef,
  seekToAfterLoadRef,
  onStreamReload,
}) => {
  const theme = useTheme();
  const [tunePage, setTunePage] = useState<number>(0); // 0: menu, 1: video, 2: audio, 3: subtitles

  const handleClose = () => {
    onClose();
    setTunePage(0);
  };

  const triggerStreamReload = (meta: Plex.Metadata, targetQuality: QualityState) => {
    const currentProgress = playerRef.current?.getCurrentTime() ?? 0;
    if (!seekToAfterLoadRef.current) {
      seekToAfterLoadRef.current = currentProgress;
    }
    onStreamReload(meta, targetQuality);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      sx={{
        "& .MuiPaper-root": {
          overflow: "hidden",
          borderRadius: 1,
          background: "transparent",
        },
      }}
    >
      <Paper
        sx={{
          width: 350,
          height: "auto",
          overflow: "hidden",
          userSelect: "none",
          backdropFilter: "blur(20px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        {tunePage === 0 && (
          <>
            <TuneSettingTab
              theme={theme}
              onClick={() => setTunePage(1)}
              text="Video"
            />
            <TuneSettingTab
              theme={theme}
              onClick={() => setTunePage(2)}
              text="Audio"
            />
            <TuneSettingTab
              theme={theme}
              onClick={() => setTunePage(3)}
              text="Subtitles"
            />
          </>
        )}

        {tunePage === 1 && metadata?.Media && (
          <>
            <TuneSettingTab
              theme={theme}
              onClick={() => setTunePage(0)}
              text="Back"
            />

            {getCurrentVideoLevels(
              metadata.Media[0].videoResolution,
              `${Math.floor(metadata.Media[0].bitrate / 1000)}Mbps`,
            ).map((qualityOption) => (
              <Box
                key={qualityOption.title + (qualityOption.bitrate ?? "orig")}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  width: "100%",
                  height: 50,
                  px: 2,
                  userSelect: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease-in-out",
                  backgroundColor: "#00000088",
                  "&:hover": {
                    transition: "all 0s ease-in-out",
                    backgroundColor: "#000000ee",
                  },
                }}
                onClick={async () => {
                  if (!metadata.Media || !itemID) return;
                  setTunePage(0);
                  await loadMetadata(itemID);
                  await getUniversalDecision(itemID, {
                    maxVideoBitrate: qualityOption.bitrate,
                    autoAdjustQuality: quality.auto,
                  });
                  const nextQuality: QualityState = {
                    bitrate: qualityOption.original
                      ? undefined
                      : qualityOption.bitrate,
                    auto: undefined,
                  };
                  onQualityChange(nextQuality);

                  if (qualityOption.original) {
                    localStorage.removeItem("quality");
                  } else if (qualityOption.bitrate) {
                    localStorage.setItem(
                      "quality",
                      qualityOption.bitrate.toString(),
                    );
                  }

                  triggerStreamReload(metadata, nextQuality);
                }}
              >
                {qualityOption.bitrate === quality.bitrate && (
                  <CheckRounded
                    sx={{
                      mr: "auto",
                      color: "primary.main",
                    }}
                    fontSize="small"
                  />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      opacity: 0.6,
                      mr: 0.5,
                    }}
                  >
                    {qualityOption.extra}
                  </Box>
                  {qualityOption.title}
                </Typography>
              </Box>
            ))}
          </>
        )}

        {tunePage === 2 && metadata?.Media && (
          <>
            <TuneSettingTab
              theme={theme}
              onClick={() => setTunePage(0)}
              text="Back"
            />

            {metadata.Media[0].Part[0].Stream.filter(
              (stream) => stream.streamType === 2, // Audio
            ).map((stream) => (
              <Box
                key={stream.id}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  width: "100%",
                  height: 50,
                  px: 2,
                  userSelect: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease-in-out",
                  backgroundColor: "#00000088",
                  "&:hover": {
                    transition: "all 0s ease-in-out",
                    backgroundColor: "#000000ee",
                  },
                }}
                onClick={async () => {
                  if (!metadata.Media || !itemID) return;
                  setTunePage(0);
                  await putAudioStream(
                    metadata.Media?.[0].Part[0].id ?? 0,
                    stream.id,
                  );

                  await loadMetadata(itemID);
                  await getUniversalDecision(itemID, {
                    maxVideoBitrate: quality.bitrate,
                    autoAdjustQuality: quality.auto,
                  });

                  const prefKey =
                    metadata.grandparentRatingKey || metadata.ratingKey;
                  useUserSettings.getState().setSetting(
                    `MEDIA_PREF_AUDIO-${prefKey}`,
                    JSON.stringify({
                      index: stream.index,
                      title: stream.extendedDisplayTitle,
                    }),
                  );

                  triggerStreamReload(metadata, quality);
                }}
              >
                <CheckRounded
                  sx={{
                    mr: "auto",
                    opacity: stream.selected ? 1 : 0,
                    color: "primary.main",
                  }}
                  fontSize="small"
                />
                <Typography
                  variant="body2"
                  sx={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    maxWidth: "calc(100% - 40px)",
                  }}
                >
                  {stream.extendedDisplayTitle}
                </Typography>
              </Box>
            ))}
          </>
        )}

        {tunePage === 3 && metadata?.Media && (
          <>
            <TuneSettingTab
              theme={theme}
              onClick={() => setTunePage(0)}
              text="Back"
            />

            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                width: "100%",
                height: 50,
                px: 2,
                userSelect: "none",
                cursor: "pointer",
                transition: "all 0.3s ease-in-out",
                backgroundColor: "#00000088",
                "&:hover": {
                  transition: "all 0s ease-in-out",
                  backgroundColor: "#000000ee",
                },
              }}
              onClick={async () => {
                if (!metadata.Media || !itemID) return;
                setTunePage(0);
                await putSubtitleStream(
                  metadata.Media?.[0].Part[0].id ?? 0,
                  0,
                );
                await loadMetadata(itemID);
                await getUniversalDecision(itemID, {
                  maxVideoBitrate: quality.bitrate,
                  autoAdjustQuality: quality.auto,
                });

                const prefKey =
                  metadata.grandparentRatingKey || metadata.ratingKey;
                useUserSettings.getState().setSetting(
                  `MEDIA_PREF_SUBTITLE-${prefKey}`,
                  JSON.stringify({
                    index: -1,
                    title: "None",
                  }),
                );

                triggerStreamReload(metadata, quality);
              }}
            >
              {metadata.Media[0].Part[0].Stream.filter(
                (stream) => stream.selected && stream.streamType === 3, // Subtitle
              ).length === 0 && (
                <CheckRounded
                  sx={{
                    mr: "auto",
                    color: "primary.main",
                  }}
                  fontSize="small"
                />
              )}
              <Typography variant="body2">None</Typography>
            </Box>

            {metadata.Media[0].Part[0].Stream.filter(
              (stream) => stream.streamType === 3,
            ).map((stream) => (
              <Box
                key={stream.id}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  height: 50,
                  px: 2,
                  userSelect: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease-in-out",
                  backgroundColor: "#00000088",
                  "&:hover": {
                    transition: "all 0s ease-in-out",
                    backgroundColor: "#000000ee",
                  },
                }}
                onClick={async () => {
                  if (!metadata.Media || !itemID) return;
                  setTunePage(0);
                  await putSubtitleStream(
                    metadata.Media?.[0].Part[0].id ?? 0,
                    stream.id,
                  );

                  await loadMetadata(itemID);
                  await getUniversalDecision(itemID, {
                    maxVideoBitrate: quality.bitrate,
                    autoAdjustQuality: quality.auto,
                  });

                  const prefKey =
                    metadata.grandparentRatingKey || metadata.ratingKey;
                  useUserSettings.getState().setSetting(
                    `MEDIA_PREF_SUBTITLE-${prefKey}`,
                    JSON.stringify({
                      index: stream.index,
                      title: stream.extendedDisplayTitle,
                    }),
                  );

                  triggerStreamReload(metadata, quality);
                }}
              >
                <CheckRounded
                  sx={{
                    opacity: stream.selected ? 1 : 0,
                    color: "primary.main",
                  }}
                  fontSize="small"
                />

                <Typography
                  variant="body2"
                  sx={{
                    ml: 1,
                    flex: 1,
                    textAlign: "right",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {stream.extendedDisplayTitle}
                </Typography>
              </Box>
            ))}
          </>
        )}
      </Paper>
    </Popover>
  );
};

export default WatchTunePopover;

interface TuneSettingTabProps {
  theme: Theme;
  onClick: () => void;
  text: string;
}

export const TuneSettingTab: React.FC<TuneSettingTabProps> = ({
  onClick,
  text,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 50,
        px: 2,
        py: 1.5,
        userSelect: "none",
        cursor: "pointer",
        transition: "all 0.3s ease-in-out",
        backgroundColor: "#00000088",
        "&:hover": {
          transition: "all 0s ease-in-out",
          backgroundColor: "#000000ee",
        },
      }}
      onClick={onClick}
    >
      <ArrowBackIosRounded
        sx={{
          fontSize: 18,
          color: "text.secondary",
        }}
      />
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: "medium",
          flex: 1,
          textAlign: "right",
          color: "text.primary",
        }}
      >
        {text}
      </Typography>
    </Box>
  );
};
