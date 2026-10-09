import { getBackendURL } from "../../backendURL";
import { getStreamProps } from "../../plex";
import { getXPlexProps, queryBuilder } from "../../plex/QuickFunctions";
import { putAudioStream, putSubtitleStream } from "../../plex";
import { useUserSettings } from "../../states/UserSettingsState";

export interface QualityState {
  bitrate?: number;
  auto?: boolean;
}

export interface VideoLevelOption {
  title: string;
  bitrate?: number;
  extra: string;
  original?: boolean;
}

export const getWatchUrl = (
  data: Plex.Metadata,
  quality: QualityState,
): string => {
  console.log("Metadata:", data);
  const bitrate = quality
    ? quality.bitrate
    : parseInt(localStorage.getItem("quality") ?? "10000");
  if (bitrate === -1)
    return `${getBackendURL()}/dynproxy${
      data?.Media?.[0].Part[0].key
    }?${queryBuilder({
      ...getXPlexProps(),
    })}`;

  return `${getBackendURL()}/dynproxy/video/:/transcode/universal/start.m3u8?${queryBuilder({
    ...getStreamProps(data.ratingKey as string, {
      ...(quality.bitrate && {
        maxVideoBitrate: bitrate,
      }),
    }),
  })}`;
};

export function getFormatedTime(time: number): string {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);

  // only show hours if there are any
  if (hours > 0)
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function getCurrentVideoLevels(
  resolution: string,
  extraForOriginal = "Auto",
): VideoLevelOption[] {
  const levels: VideoLevelOption[] = [];

  switch (resolution) {
    case "720":
      levels.push(
        ...[
          {
            title: "Convert to 720p",
            bitrate: 4000,
            extra: "(High) 4Mbps",
          },
          {
            title: "Convert to 720p",
            bitrate: 3000,
            extra: "(Medium) 3Mbps",
          },
          { title: "Convert to 720p", bitrate: 2000, extra: "2Mbps" },
          { title: "Convert to 480p", bitrate: 1500, extra: "1.5Mbps" },
          { title: "Convert to 360p", bitrate: 750, extra: "0.7Mbps" },
          { title: "Convert to 240p", bitrate: 300, extra: "0.3Mbps" },
        ],
      );
      break;
    case "4k":
      levels.push(
        ...[
          {
            title: "Convert to 4K",
            bitrate: 60000,
            extra: "(High) 60Mbps",
          },
          {
            title: "Convert to 4K",
            bitrate: 40000,
            extra: "(Medium) 40Mbps",
          },
          {
            title: "Convert to 4K",
            bitrate: 30000,
            extra: "30Mbps",
          },
          {
            title: "Convert to 1080p",
            bitrate: 20000,
            extra: "(High) 20Mbps",
          },
          {
            title: "Convert to 1080p",
            bitrate: 12000,
            extra: "(Medium) 12Mbps",
          },
          {
            title: "Convert to 1080p",
            bitrate: 8000,
            extra: "8Mbps",
          },
          {
            title: "Convert to 720p",
            bitrate: 4000,
            extra: "(High) 4Mbps",
          },
          {
            title: "Convert to 720p",
            bitrate: 3000,
            extra: "(Medium) 3Mbps",
          },
          { title: "Convert to 720p", bitrate: 2000, extra: "2Mbps" },
          { title: "Convert to 480p", bitrate: 1500, extra: "1.5Mbps" },
          { title: "Convert to 360p", bitrate: 750, extra: "0.7Mbps" },
          { title: "Convert to 240p", bitrate: 300, extra: "0.3Mbps" },
        ],
      );
      break;

    case "1080":
    default:
      levels.push(
        ...[
          {
            title: "Convert to 1080p",
            bitrate: 20000,
            extra: "(High) 20Mbps",
          },
          {
            title: "Convert to 1080p",
            bitrate: 12000,
            extra: "(Medium) 12Mbps",
          },
          {
            title: "Convert to 1080p",
            bitrate: 8000,
            extra: "8Mbps",
          },
          {
            title: "Convert to 720p",
            bitrate: 4000,
            extra: "(High) 4Mbps",
          },
          {
            title: "Convert to 720p",
            bitrate: 3000,
            extra: "(Medium) 3Mbps",
          },
          { title: "Convert to 720p", bitrate: 2000, extra: "2Mbps" },
          { title: "Convert to 480p", bitrate: 1500, extra: "1.5Mbps" },
          { title: "Convert to 360p", bitrate: 750, extra: "0.7Mbps" },
          { title: "Convert to 240p", bitrate: 300, extra: "0.3Mbps" },
        ],
      );
      break;
  }

  return levels;
}

export async function autoMatchMediaTracks(metadata: Plex.Metadata): Promise<void> {
  const autoMatchTracks =
    useUserSettings.getState().settings["AUTO_MATCH_TRACKS"] === "true";

  const prefKey = metadata.grandparentRatingKey || metadata.ratingKey;
  const audioTrackPref =
    useUserSettings.getState().settings[`MEDIA_PREF_AUDIO-${prefKey}`];
  const subtitleTrackPref =
    useUserSettings.getState().settings[`MEDIA_PREF_SUBTITLE-${prefKey}`];

  const streams = metadata.Media?.[0]?.Part?.[0]?.Stream ?? [];

  // Match audio track and subtitle track with preferences
  if (audioTrackPref && autoMatchTracks && streams.length > 0) {
    try {
      const audioTrackPrefParsed: {
        index: number;
        title: string;
      } = JSON.parse(audioTrackPref);

      console.log(
        `Preferred Audio Track - Index: ${audioTrackPrefParsed.index}, Title: ${audioTrackPrefParsed.title}`,
      );

      const audioTrack = [...streams]
        .sort((a, b) => {
          return (
            Math.abs(a.index - audioTrackPrefParsed.index) -
            Math.abs(b.index - audioTrackPrefParsed.index)
          );
        })
        .find((stream) => {
          return (
            stream.streamType === 2 &&
            stream.extendedDisplayTitle === audioTrackPrefParsed.title
          );
        });

      if (audioTrack && metadata.Media?.[0]?.Part?.[0]?.id) {
        console.log(
          `Selected Audio Track - Index: ${audioTrack.index}, Title: ${audioTrack.extendedDisplayTitle}`,
        );
        await putAudioStream(metadata.Media[0].Part[0].id, audioTrack.id);
      }
    } catch (e) {
      console.warn("Audio track matching error:", e);
    }
  }

  if (subtitleTrackPref && autoMatchTracks && streams.length > 0) {
    try {
      const subtitleTrackPrefParsed: {
        index: number;
        title: string;
      } = JSON.parse(subtitleTrackPref);

      console.log(
        `Preferred Subtitle Track - Index: ${subtitleTrackPrefParsed.index}, Title: ${subtitleTrackPrefParsed.title}`,
      );

      if (subtitleTrackPrefParsed.index === -1 && metadata.Media?.[0]?.Part?.[0]?.id) {
        await putSubtitleStream(metadata.Media[0].Part[0].id, 0);
      } else if (metadata.Media?.[0]?.Part?.[0]?.id) {
        const subtitleTrack = [...streams]
          .sort((a, b) => {
            return (
              Math.abs(a.index - subtitleTrackPrefParsed.index) -
              Math.abs(b.index - subtitleTrackPrefParsed.index)
            );
          })
          .find((stream) => {
            return (
              stream.streamType === 3 &&
              stream.extendedDisplayTitle === subtitleTrackPrefParsed.title
            );
          });

        if (subtitleTrack) {
          console.log(
            `Selected Subtitle Track - Index: ${subtitleTrack.index}, Title: ${subtitleTrack.extendedDisplayTitle}`,
          );
          await putSubtitleStream(
            metadata.Media[0].Part[0].id,
            subtitleTrack.id,
          );
        }
      }
    } catch (e) {
      console.warn("Subtitle track matching error:", e);
    }
  }
}
