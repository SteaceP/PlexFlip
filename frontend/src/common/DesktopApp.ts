import { getBrowserName } from "../plex/QuickFunctions";
import {
    OpenURL as WailsOpenURL,
    IsDesktop as WailsIsDesktop,
    GetVersion as WailsGetVersion,
} from "../bindings/nevu/backend/desktopservice";
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
    // 1. Try Wails v3 binding
    try {
        if (typeof (window as any)._wails !== "undefined") {
            await WailsOpenURL(url);
            return true;
        }
    } catch (err) {
        console.warn("Wails OpenURL call failed, trying backend endpoint:", err);
    }

    // 2. Try Go backend /api/open-browser endpoint
    try {
        const res = await fetch(`${getBackendURL()}/api/open-browser`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
        if (res.ok) return true;
    } catch (err) {
        console.warn("Backend open-browser endpoint failed:", err);
    }

    // 3. Fallback to window.open in browser
    try {
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (opened) return true;
    } catch (err) {
        console.warn("window.open failed:", err);
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