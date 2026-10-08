import { getBrowserName } from "../plex/QuickFunctions";
import {
    IsDesktop as WailsIsDesktop,
    GetVersion as WailsGetVersion,
} from "../bindings/plexflip/backend/desktopservice";
import { getBackendURL } from "../backendURL";

export interface DesktopPlatformVersion {
    appVersion: string; // 1.0.0
    arch: string; // x64
    platform: string; // linux
    version: string; // 6.15.7-1-MANJARO
}

export function isDesktopApp(): boolean {
    return (
        typeof (window as any)._wails !== "undefined" ||
        platformCache.isDesktop
    );
}

export async function openExternalURL(url: string): Promise<boolean> {
    console.log("[DesktopApp] openExternalURL requesting browser for:", url);

    // 1. Primary: Use our Go backend /api/open-browser endpoint
    try {
        const backendURL = getBackendURL();
        const endpoint = backendURL ? `${backendURL}/api/open-browser` : "/api/open-browser";
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
        if (res.ok) {
            console.log("[DesktopApp] URL opened successfully via backend /api/open-browser");
            return true;
        }
        console.warn("[DesktopApp] Backend returned status", res.status);
    } catch (err) {
        console.warn("[DesktopApp] Backend /api/open-browser fetch failed:", err);
    }

    // 2. Fallback: window.open in browser
    try {
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (opened) return true;
    } catch (err) {
        console.warn("[DesktopApp] window.open failed:", err);
    }

    return false;
}

export async function getPlatform(): Promise<DesktopPlatformVersion | null> {
    if ((window as any).electronAPI) {
        return await (window as any).electronAPI.getPlatform();
    }
    if (typeof (window as any)._wails !== "undefined") {
        try {
            const isDesk = await WailsIsDesktop();
            if (isDesk) {
                const version = await WailsGetVersion();
                return {
                    appVersion: version || "0.1.0",
                    arch: "unknown",
                    platform: navigator.userAgent.includes("Linux") ? "Linux" : "Desktop",
                    version: version || "0.1.0",
                };
            }
        } catch {
            // ignore
        }
    }
    return null;
}

export async function getDeviceName(): Promise<string> {
    if ((window as any).electronAPI) {
        return await (window as any).electronAPI.getDeviceName();
    }
    return getBrowserName();
}

export const platformCache: {
    platform: DesktopPlatformVersion | null;
    deviceName: string;
    isDesktop: boolean;
} = {
    platform: null,
    deviceName: getBrowserName(),
    isDesktop: typeof (window as any)._wails !== "undefined",
};