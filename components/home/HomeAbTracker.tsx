"use client";

import { useEffect, useRef } from "react";
import {
  HOME_AB_SESSION_KEY,
  HOME_AB_TEST_NAME,
  eventForHref,
  type HomeAbEvent,
  type HomeVariant,
} from "@/lib/analytics/ab-test";

interface HomeAbTrackerProps {
  variant: HomeVariant;
  test?: string;
}

/** One stable session id per browser, created lazily. */
function getSessionId(): string {
  try {
    let id = localStorage.getItem(HOME_AB_SESSION_KEY);
    if (!id) {
      const rand =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      id = `s_${Date.now().toString(36)}_${rand}`;
      localStorage.setItem(HOME_AB_SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private mode / storage blocked: fall back to an ephemeral id.
    return `s_ephemeral_${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Records homepage A/B events. Renders nothing. The page selector mounts this
 * only while the test is enabled, so an empty render is the default-off case.
 *
 * View: posted once on mount. Clicks: a single delegated listener maps known
 * CTA destinations to funnel events, so the variant markup needs no changes.
 */
export default function HomeAbTracker({ variant, test = HOME_AB_TEST_NAME }: HomeAbTrackerProps) {
  const viewSent = useRef(false);

  useEffect(() => {
    const sessionId = getSessionId();

    const send = (event: HomeAbEvent, beacon: boolean) => {
      const payload = JSON.stringify({
        test,
        variant,
        event,
        sessionId,
        referrer: document.referrer || undefined,
      });
      try {
        if (beacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
          navigator.sendBeacon(
            "/api/analytics/ab-test",
            new Blob([payload], { type: "application/json" }),
          );
          return;
        }
      } catch {
        /* fall through to fetch */
      }
      // keepalive lets the request outlive a navigation when sendBeacon is absent.
      fetch("/api/analytics/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    // React 18+ mounts effects twice in dev; the ref keeps views counted once.
    if (!viewSent.current) {
      viewSent.current = true;
      send("view", false);
    }

    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const event = eventForHref(anchor.getAttribute("href"));
      if (event) send(event, true);
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [variant, test]);

  return null;
}
