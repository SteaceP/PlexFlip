import axios from "axios";
import { PlexFlip } from "../types";

export async function CheckPlexUser(token: string): Promise<PlexFlip.PlexTV.User | null> {
    const data = await axios.get("https://plex.tv/api/v2/user", {
        headers: {
            "X-Plex-Token": token,
        },
    }).then(res => res.data as PlexFlip.PlexTV.User).catch(() => null);

    if (!data) return null;

    return data;
}