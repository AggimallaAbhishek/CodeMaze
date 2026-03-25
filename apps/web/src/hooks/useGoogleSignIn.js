import { useCallback, useEffect, useRef, useState } from "react";

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
let googleScriptPromise = null;

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const onLoad = () => {
        if (window.google?.accounts?.id) {
          resolve(window.google);
          return;
        }
        reject(new Error("Google sign-in loaded but API is unavailable."));
      };

      const onError = () => {
        reject(new Error("Unable to load Google sign-in script."));
      };

      const existingScript = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", onLoad, { once: true });
        existingScript.addEventListener("error", onError, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      googleScriptPromise = null;
      throw error;
    });
  }

  return googleScriptPromise;
}

export function useGoogleSignIn({ clientId, onCredential, onError }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    if (!clientId) {
      setReady(false);
      return;
    }

    let cancelled = false;

    async function initializeGoogleSignIn() {
      try {
        const google = await loadGoogleIdentityScript();
        if (cancelled) {
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response?.credential) {
              setLoading(false);
              onErrorRef.current?.("Google sign-in did not return a credential.");
              return;
            }

            try {
              await onCredentialRef.current(response.credential);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Google sign-in failed.";
              console.debug("google_signin_credential_failed", { message });
              onErrorRef.current?.(message);
            } finally {
              if (!cancelled) {
                setLoading(false);
              }
            }
          }
        });
        console.debug("google_signin_initialized");
        setReady(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Google sign-in is unavailable.";
        console.debug("google_signin_init_failed", { message });
        setReady(false);
        onErrorRef.current?.(message);
      }
    }

    initializeGoogleSignIn();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const start = useCallback(() => {
    if (!clientId) {
      onErrorRef.current?.("Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID.");
      return;
    }
    if (!window.google?.accounts?.id || !ready) {
      onErrorRef.current?.("Google sign-in is still loading. Try again.");
      return;
    }

    setLoading(true);
    console.debug("google_signin_prompt_started");
    window.google.accounts.id.prompt((notification) => {
      const promptNotDisplayed = notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.();
      if (promptNotDisplayed) {
        const reason = notification?.getNotDisplayedReason?.() || notification?.getSkippedReason?.() || "unknown";
        console.debug("google_signin_prompt_unavailable", { reason });
        setLoading(false);
        onErrorRef.current?.("Unable to open Google sign-in prompt. Check popup settings and try again.");
        return;
      }

      if (notification?.isDismissedMoment?.()) {
        const reason = notification.getDismissedReason?.() || "dismissed";
        console.debug("google_signin_prompt_dismissed", { reason });
        setLoading(false);
      }
    });
  }, [clientId, ready]);

  return { ready, loading, start };
}
