"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const DISMISS_KEY = "fitme-pwa-dismiss-count";
const MAX_DISMISSALS = 3;

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
}

function getDismissCount(): number {
  try { return parseInt(localStorage.getItem(DISMISS_KEY) ?? "0", 10); } catch { return 0; }
}

function incrementDismissCount() {
  try { localStorage.setItem(DISMISS_KEY, String(getDismissCount() + 1)); } catch { /* ignore */ }
}

export function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (getDismissCount() >= MAX_DISMISSALS) return;

    const ios = isIOS();
    setIsIOSDevice(ios);

    if (ios) {
      // Show iOS instructions immediately (no beforeinstallprompt on iOS)
      setShow(true);
      return;
    }

    // Android/Chrome: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
        return;
      }
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    incrementDismissCount();
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          animation: "var(--animate-fade-in)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 201,
          backgroundColor: "var(--color-surface)",
          borderRadius: "28px 28px 0 0",
          padding: "24px 24px 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
          animation: "var(--animate-slide-up)",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        {/* Handle */}
        <div style={{ width: "40px", height: "4px", borderRadius: "2px", backgroundColor: "var(--color-border)", margin: "0 auto 24px" }} />

        {/* App icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", overflow: "hidden", backgroundColor: "#121212", border: "2px solid var(--color-lime)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "32px", fontWeight: 800, color: "var(--color-lime)", letterSpacing: "-0.03em" }}>F</span>
          </div>
          <div>
            <p style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
              Install FitMe
            </p>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>
              Get the full app experience
            </p>
          </div>
        </div>

        {isIOSDevice ? (
          /* iOS instructions */
          <>
            <div
              style={{
                backgroundColor: "var(--color-bg)",
                borderRadius: "16px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "12px" }}>
                Add to your Home Screen in 2 steps:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "10px", backgroundColor: "rgba(204,255,0,0.1)", border: "1.5px solid rgba(204,255,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <polyline points="16 6 12 2 8 6"/>
                      <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: "14px", color: "var(--color-text)", fontWeight: 500 }}>
                    Tap the <strong>Share</strong> button in Safari&apos;s toolbar
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "10px", backgroundColor: "rgba(204,255,0,0.1)", border: "1.5px solid rgba(204,255,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: "14px", color: "var(--color-text)", fontWeight: 500 }}>
                    Scroll down and tap <strong>Add to Home Screen</strong>
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="btn-tap"
              style={{ width: "100%", padding: "16px", borderRadius: "16px", backgroundColor: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, fontSize: "15px", cursor: "pointer" }}
            >
              Not Now
            </button>
          </>
        ) : (
          /* Android/Chrome install prompt */
          <>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "20px", lineHeight: 1.5 }}>
              Install FitMe on your home screen for a faster, full-screen experience — no browser needed.
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleDismiss}
                className="btn-tap"
                style={{ flex: 1, padding: "15px", borderRadius: "16px", backgroundColor: "var(--color-bg)", border: "1.5px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, fontSize: "15px", cursor: "pointer" }}
              >
                Not Now
              </button>
              <button
                onClick={handleInstall}
                className="btn-tap"
                style={{ flex: 2, padding: "15px", borderRadius: "16px", backgroundColor: "var(--color-lime)", border: "none", color: "#000", fontWeight: 800, fontSize: "15px", cursor: "pointer" }}
              >
                Install App
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
