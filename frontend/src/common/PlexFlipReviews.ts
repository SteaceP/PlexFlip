import axios, { AxiosError } from "axios";
import { getBackendURL } from "../backendURL";

export async function getPlexFlipReviews(itemID: string, userID?: string): Promise<PlexFlip.Reviews.Review[]> {
    const res = await axios.get(`${getBackendURL()}/reviews`, {
        params: {
            itemID,
            ...userID ? { userID } : {}
        }, 
        headers: {
            'Content-Type': 'application/json',
            'x-plex-token': localStorage.getItem("accAccessToken") || ""
        }
    }).catch((error: AxiosError) => {
        console.error("Failed to fetch PlexFlip reviews:", error);
        return error.response || { data: { error: "Failed to fetch reviews" } };
    });

    return res.data;
}

export async function updatePlexFlipReview(
    itemID: string,
    rating: number,
    message: string,
    visibility: "GLOBAL" | "LOCAL",
    spoilers: boolean
): Promise<PlexFlip.Reviews.ReviewResponse | null> {
    const res = await axios.post(`${getBackendURL()}/reviews`, {
        itemID,
        rating,
        message,
        visibility,
        spoilers
    }, {
        headers: {
            'Content-Type': 'application/json',
            'x-plex-token': localStorage.getItem("accAccessToken") || ""
        }
    }).catch((error: AxiosError) => {
        console.error("Failed to update PlexFlip review:", error);
        return error.response || { data: { error: "Failed to update review" } };
    });

    return res.data;
}

export async function deletePlexFlipReview(itemID: string, visibility: "GLOBAL" | "LOCAL"): Promise<void> {
    const res = await axios.delete(`${getBackendURL()}/reviews`, {
        params: {
            itemID,
            visibility
        },
        headers: {
            'Content-Type': 'application/json',
            'x-plex-token': localStorage.getItem("accAccessToken") || ""
        }
    }).catch((error: AxiosError) => {
        console.error("Failed to delete PlexFlip review:", error);
        return error.response || { data: { error: "Failed to delete review" } };
    });

    return res.data;
}
