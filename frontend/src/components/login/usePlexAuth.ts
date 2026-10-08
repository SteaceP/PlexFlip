import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { getAccessToken, getPin } from "../../plex";
import { ProxiedRequest, getBackendURL } from "../../backendURL";
import { queryBuilder } from "../../plex/QuickFunctions";
import { isDesktopApp, openExternalURL } from "../../common/DesktopApp";

export function usePlexAuth() {
  const [query] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [pinData, setPinData] = useState<{ id: number; code: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [browserOpened, setBrowserOpened] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [browserCallbackComplete, setBrowserCallbackComplete] = useState<boolean>(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletingRef = useRef<boolean>(false);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const completeLogin = useCallback(async (authToken: string): Promise<boolean> => {
    if (isCompletingRef.current) return false;
    isCompletingRef.current = true;
    setIsCompleting(true);
    stopPolling();

    try {
      const serverIdentity = await ProxiedRequest("/identity", "GET", {
        "X-Plex-Token": authToken,
      });

      if (!serverIdentity || !serverIdentity.data?.MediaContainer) {
        setError(
          `Failed to log in: ${
            serverIdentity?.data?.errors?.[0]?.message || "Could not retrieve Plex server identity."
          }`
        );
        isCompletingRef.current = false;
        setIsCompleting(false);
        return false;
      }

      const serverID = serverIdentity.data.MediaContainer.machineIdentifier;

      const parser = new XMLParser({
        attributeNamePrefix: "",
        textNodeName: "value",
        ignoreAttributes: false,
        parseAttributeValue: true,
      });

      // try getting shared servers
      const sharedServersXML = await axios.get(
        `https://plex.tv/api/resources?${queryBuilder({
          "X-Plex-Token": authToken,
        })}`
      );

      const sharedServers = parser.parse(sharedServersXML.data);

      let targetServer: any = null;
      const devices = sharedServers?.MediaContainer?.Device;
      const deviceList: any[] = Array.isArray(devices) ? devices : devices ? [devices] : [];

      if (serverID) {
        targetServer = deviceList.find(
          (server: any) => server.clientIdentifier === serverID
        );
      }
      if (!targetServer) {
        targetServer = deviceList.find(
          (server: any) =>
            typeof server.provides === "string" &&
            server.provides.includes("server") &&
            Boolean(server.accessToken)
        );
      }
      if (!targetServer && deviceList.length > 0) {
        targetServer = deviceList.find((server: any) => Boolean(server.accessToken));
      }

      const effectiveAccessToken = targetServer?.accessToken || authToken;

      localStorage.setItem("accessToken", effectiveAccessToken);
      localStorage.setItem("accAccessToken", authToken);

      // Notify backend that auth is complete to focus desktop window
      try {
        const backendURL = getBackendURL();
        await fetch(backendURL ? `${backendURL}/api/auth-complete` : "/api/auth-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authToken,
            accessToken: effectiveAccessToken,
            serverID: serverID || "",
          }),
        });
      } catch (postErr) {
        console.warn("Failed to notify backend of auth completion:", postErr);
      }

      if (isDesktopApp()) {
        window.location.href = "/";
      } else {
        // If this page was opened as a redirect callback in an external browser
        setBrowserCallbackComplete(true);
        setIsCompleting(false);
        // Attempt to close the browser tab after short delay
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {}
        }, 2000);
      }
      return true;
    } catch (e: any) {
      console.error("completeLogin error:", e);
      setError(e?.message || "Failed to log in. Please try again.");
      isCompletingRef.current = false;
      setIsCompleting(false);
      return false;
    }
  }, [stopPolling]);

  const createPinAndStartPolling = useCallback(async () => {
    stopPolling();
    setError(null);

    let clientID = localStorage.getItem("clientID");
    if (!clientID) {
      clientID = `plexflip-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("clientID", clientID);
    }

    try {
      const pin = await getPin();
      if (!pin.id || !pin.code) {
        setError("Failed to generate login PIN from Plex. Please try again.");
        return;
      }

      setPinData({ id: pin.id, code: pin.code });

      // Register PIN and clientID with local backend
      try {
        const backendURL = getBackendURL();
        await fetch(backendURL ? `${backendURL}/api/auth-pin` : "/api/auth-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinID: String(pin.id), clientID }),
        });
      } catch (pinRegErr) {
        console.warn("Could not register PIN with backend:", pinRegErr);
      }

      // Start polling Plex API for token resolution
      pollIntervalRef.current = setInterval(async () => {
        if (isCompletingRef.current) return;
        try {
          const checkRes = await getAccessToken(String(pin.id), clientID as string);
          if (checkRes && checkRes.authToken) {
            stopPolling();
            await completeLogin(checkRes.authToken);
          }
        } catch (pollErr) {
          // ignore transient poll errors while waiting for user sign-in
        }
      }, 1500);
    } catch (err: any) {
      console.error("Failed to get PIN:", err);
      setError("Failed to connect to Plex authentication servers. Check your internet connection.");
    }
  }, [completeLogin, stopPolling]);

  useEffect(() => {
    // Case 1: Browser redirected back with pinID query parameter
    if (query.has("pinID")) {
      const pinID = query.get("pinID") as string;
      let clientID = query.get("clientID") || localStorage.getItem("clientID") || "";

      (async () => {
        try {
          setIsCompleting(true);

          if (!clientID) {
            try {
              const backendURL = getBackendURL();
              const pinRes = await axios.get(
                `${backendURL ? `${backendURL}/api/auth-pin` : "/api/auth-pin"}?pinID=${encodeURIComponent(pinID)}`
              );
              if (pinRes.data?.clientID) {
                clientID = pinRes.data.clientID;
              }
            } catch (pinErr) {
              console.warn("Failed to retrieve clientID from backend:", pinErr);
            }
          }

          if (clientID) {
            localStorage.setItem("clientID", clientID);
          }

          const res = await getAccessToken(pinID, clientID);
          if (res && res.authToken) {
            await completeLogin(res.authToken);
          } else {
            setError(
              "Plex did not finish linking PlexFlip to your account. Go back to the PlexFlip app and click Continue again. You are probably signed in to Plex in this browser now, so it should only take one click."
            );
            setIsCompleting(false);
            try {
              const backendURL = getBackendURL();
              await fetch(backendURL ? `${backendURL}/api/auth-focus` : "/api/auth-focus", {
                method: "POST",
              });
            } catch (focusErr) {}
          }
        } catch (e: any) {
          console.error("Callback getAccessToken error:", e);
          setError("Failed to complete login from callback. Please try again.");
          setIsCompleting(false);
        }
      })();
      return;
    }

    // Case 2: Already logged in
    if (localStorage.getItem("accessToken")) {
      window.location.href = "/";
      return;
    }

    // Case 3: Initial load -> request PIN and start polling
    createPinAndStartPolling();

    return () => {
      stopPolling();
    };
  }, [query, completeLogin, createPinAndStartPolling, stopPolling]);

  const handleCopyCode = () => {
    if (pinData?.code) {
      navigator.clipboard.writeText(pinData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleQuickLink = async () => {
    if (pinData?.code) {
      try {
        await navigator.clipboard.writeText(pinData.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {}
    }
    setBrowserOpened(true);
    setInfoMessage("Code copied! Enter it at plex.tv/link in your browser.");
    await openExternalURL("https://plex.tv/link");
  };

  const handleGoogleSignIn = async () => {
    if (pinData?.code) {
      try {
        await navigator.clipboard.writeText(pinData.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {}
    }
    setBrowserOpened(true);
    setInfoMessage(
      `Code ${pinData?.code || ""} copied! On plex.tv/link, sign in with your Google account and enter your 4-letter code.`
    );
    await openExternalURL("https://plex.tv/link");
  };

  const handleAppleSignIn = async () => {
    if (pinData?.code) {
      try {
        await navigator.clipboard.writeText(pinData.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {}
    }
    setBrowserOpened(true);
    setInfoMessage(
      `Code ${pinData?.code || ""} copied! On plex.tv/link, sign in with Apple and enter your 4-letter code.`
    );
    await openExternalURL("https://plex.tv/link");
  };

  return {
    error,
    setError,
    infoMessage,
    setInfoMessage,
    pinData,
    copied,
    browserOpened,
    isCompleting,
    browserCallbackComplete,
    completeLogin,
    createPinAndStartPolling,
    handleCopyCode,
    handleQuickLink,
    handleGoogleSignIn,
    handleAppleSignIn,
  };
}
