import axios from "axios";

export const CLOUD_API_URL = "https://plexflip-cloud.coderage.workers.dev";

function getAuthHeaders() {
    const token = localStorage.getItem("accAccessToken") || localStorage.getItem("accessToken") || "";
    return {
        "Content-Type": "application/json",
        "X-Plex-Token": token,
        "x-plex-token": token,
    };
}

export namespace CloudService {
    export interface CloudHealthResponse {
        status: string;
        service: string;
        database?: string;
    }

    /**
     * Checks health and connection of the Cloudflare Worker & D1 database.
     */
    export async function getHealth(): Promise<boolean> {
        try {
            const res = await axios.get<CloudHealthResponse>(`${CLOUD_API_URL}/health`, {
                timeout: 5000,
            });
            return res.data?.status === "ok";
        } catch (error) {
            console.warn("CloudService health check failed:", error);
            return false;
        }
    }

    /**
     * Retrieves the current user's cloud-saved watchlist items from Cloudflare D1.
     * The cloud worker enforces that the user only gets items where user_id matches their Plex UUID.
     */
    export async function getWatchlist(): Promise<Plex.Metadata[]> {
        try {
            const res = await axios.get<{ success: boolean; items: Plex.Metadata[] }>(
                `${CLOUD_API_URL}/watchlist`,
                {
                    headers: getAuthHeaders(),
                    timeout: 8000,
                }
            );
            return res.data?.items || [];
        } catch (error) {
            console.error("Failed to fetch cloud watchlist:", error);
            return [];
        }
    }

    /**
     * Saves an item to the user's cloud watchlist in Cloudflare D1.
     * The cloud worker derives user_id strictly from the verified Plex token.
     */
    export async function addToWatchlist(item: Plex.Metadata): Promise<boolean> {
        try {
            const res = await axios.post(
                `${CLOUD_API_URL}/watchlist`,
                {
                    guid: item.guid,
                    ratingKey: item.ratingKey,
                    title: item.title,
                    item,
                },
                {
                    headers: getAuthHeaders(),
                    timeout: 8000,
                }
            );
            return res.data?.success === true;
        } catch (error) {
            console.error("Failed to add item to cloud watchlist:", error);
            return false;
        }
    }

    /**
     * Removes an item from the user's cloud watchlist in Cloudflare D1.
     */
    export async function removeFromWatchlist(guid: string): Promise<boolean> {
        try {
            const res = await axios.delete(
                `${CLOUD_API_URL}/watchlist?guid=${encodeURIComponent(guid)}`,
                {
                    headers: getAuthHeaders(),
                    timeout: 8000,
                }
            );
            return res.data?.success === true;
        } catch (error) {
            console.error("Failed to remove item from cloud watchlist:", error);
            return false;
        }
    }

    /**
     * Fetches reviews for a media item from Cloudflare D1.
     */
    export async function getReviews(itemID: string, userID?: string): Promise<PlexFlip.Reviews.Review[]> {
        try {
            const params: Record<string, string> = { itemID };
            if (userID) params.userID = userID;

            const res = await axios.get<PlexFlip.Reviews.Review[]>(`${CLOUD_API_URL}/reviews`, {
                params,
                headers: getAuthHeaders(),
                timeout: 8000,
            });
            return Array.isArray(res.data) ? res.data : [];
        } catch (error) {
            console.error("Failed to fetch cloud reviews:", error);
            return [];
        }
    }

    /**
     * Upserts a review in Cloudflare D1.
     * The cloud worker ensures the review is keyed by (itemID, verifiedPlexUserUUID),
     * preventing any user from modifying someone else's review.
     */
    export async function updateReview(
        itemID: string,
        rating: number,
        message: string,
        spoilers: boolean
    ): Promise<boolean> {
        try {
            const res = await axios.post(
                `${CLOUD_API_URL}/reviews`,
                {
                    itemID,
                    rating,
                    message,
                    spoilers,
                },
                {
                    headers: getAuthHeaders(),
                    timeout: 8000,
                }
            );
            return res.data?.success === true || res.data?.error === false;
        } catch (error) {
            console.error("Failed to save cloud review:", error);
            return false;
        }
    }

    /**
     * Deletes a review from Cloudflare D1.
     * The cloud worker ensures only the verified review owner can delete it.
     */
    export async function deleteReview(itemID: string): Promise<boolean> {
        try {
            const res = await axios.delete(
                `${CLOUD_API_URL}/reviews?itemID=${encodeURIComponent(itemID)}`,
                {
                    headers: getAuthHeaders(),
                    timeout: 8000,
                }
            );
            return res.data?.success === true || res.data?.error === false;
        } catch (error) {
            console.error("Failed to delete cloud review:", error);
            return false;
        }
    }
}
