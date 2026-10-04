"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { flushSync } from "react-dom";
import { LoadingOverlay } from "@/components/ui";
import {
  NAVIGATION_TRANSITION_START,
  startNavigationTransition,
} from "@/lib/navigation-transition";

interface NavigationLoadingOverlayProps {
  className?: string;
}

function isInternalPageLink(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.defaultPrevented ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  ) {
    return false;
  }

  const destination = new URL(anchor.href, window.location.href);
  const current = new URL(window.location.href);

  return (
    destination.origin === current.origin &&
    `${destination.pathname}${destination.search}` !==
      `${current.pathname}${current.search}`
  );
}

export function NavigationLoadingOverlay({
  className,
}: NavigationLoadingOverlayProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const safetyTimeout = useRef<number | null>(null);

  useEffect(() => {
    setOpen(false);
    if (safetyTimeout.current !== null) {
      window.clearTimeout(safetyTimeout.current);
      safetyTimeout.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const show = () => {
      flushSync(() => setOpen(true));
      if (safetyTimeout.current !== null) {
        window.clearTimeout(safetyTimeout.current);
      }
      safetyTimeout.current = window.setTimeout(() => setOpen(false), 15_000);
    };
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (anchor instanceof HTMLAnchorElement && isInternalPageLink(event, anchor)) {
        startNavigationTransition();
      }
    };

    window.addEventListener(NAVIGATION_TRANSITION_START, show);
    window.addEventListener("popstate", show);
    document.addEventListener("click", handleClick);

    return () => {
      if (safetyTimeout.current !== null) {
        window.clearTimeout(safetyTimeout.current);
      }
      window.removeEventListener(NAVIGATION_TRANSITION_START, show);
      window.removeEventListener("popstate", show);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <LoadingOverlay
      open={open}
      className={`zz-ov--fullscreen${className ? ` ${className}` : ""}`}
    />
  );
}
