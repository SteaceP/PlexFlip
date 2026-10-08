import axios, { AxiosError } from "axios";
import { getBackendURL } from "../backendURL";
import { CloudService } from "./CloudService";
import { useUserSettings } from "../states/UserSettingsState";

function getAuthToken(): string {
    return localStorage.getItem("accAccessToken") || localStorage.getItem("accessToken") || "";
}

export async function getPlexFlipReviews(itemID: string, userID?: string): Promise<PlexFlip.Reviews.Review[]> {
    const isCloudEnabled = useUserSettings.getState().settings["ENABLE_CLOUD_REVIEWS"] === "true";

    const res = await axios.get(`${getBackendURL()}/reviews`, {
        params: {
            itemID,
            ...userID ? { userID } : {}
        }, 
        headers: {
            'Content-Type': 'application/json',
            'x-plex-token': getAuthToken()
        }
    }).catch((error: AxiosError) => {
        console.error("Failed to fetch PlexFlip reviews:", error);
        return { data: [] };
    });

    let reviews: PlexFlip.Reviews.Review[] = Array.isArray(res.data) ? res.data : [];

    if (isCloudEnabled) {
        try {
            const cloudReviews = await CloudService.getReviews(itemID, userID);
            if (cloudReviews && cloudReviews.length > 0) {
                const existingKeys = new Set(reviews.map((r) => `${r.itemID}_${r.userID}`));
                for (const cr of cloudReviews) {
                    const key = `${cr.itemID}_${cr.userID}`;
                    if (!existingKeys.has(key)) {
                        reviews.push(cr);
                        existingKeys.add(key);
                    }
                }
            }
        } catch (err) {
            console.warn("Could not fetch cloud reviews directly:", err);
        }
    }

    return reviews;
}

export async function updatePlexFlipReview(
    itemID: string,
    rating: number,
    message: string,
    visibility: "GLOBAL" | "LOCAL",
    spoilers: boolean
): Promise<PlexFlip.Reviews.ReviewResponse | null> {
    const isCloudEnabled = useUserSettings.getState().settings["ENABLE_CLOUD_REVIEWS"] === "true";
    if (isCloudEnabled || visibility === "GLOBAL") {
        await CloudService.updateReview(itemID, rating, message, spoilers);
    }

    const res = await axios.post(`${getBackendURL()}/reviews`, {
        itemID,
        rating,
        message,
        visibility,
        spoilers
    }, {
        headers: {
            'Content-Type': 'application/json',
            'x-plex-token': getAuthToken()
        }
    }).catch((error: AxiosError) => {
        console.error("Failed to update PlexFlip review:", error);
        return error.response || { data: { error: "Failed to update review" } };
    });

    return res?.data ?? { error: "Failed to update review" };
}

export async function deletePlexFlipReview(itemID: string, visibility: "GLOBAL" | "LOCAL"): Promise<void> {
    const isCloudEnabled = useUserSettings.getState().settings["ENABLE_CLOUD_REVIEWS"] === "true";
    if (isCloudEnabled || visibility === "GLOBAL") {
        await CloudService.deleteReview(itemID);
    }

    const res = await axios.delete(`${getBackendURL()}/reviews`, {
        params: {
            itemID,
            visibility
        },
        headers: {
            'Content-Type': 'application/json',
            'x-plex-token': getAuthToken()
        }
    }).catch((error: AxiosError) => {
        console.error("Failed to delete PlexFlip review:", error);
        return error.response || { data: { error: "Failed to delete review" } };
    });

    return res?.data;
}
