"use client";

import { useEffect } from "react";

const INACTIVITY_MS = 800;
const SCROLLING_CLASS = "is-scrolling";

function resolveScrollElement(target: EventTarget | null): Element | null {
  if (target === document) {
    return document.scrollingElement ?? document.documentElement;
  }

  if (target instanceof Element) {
    return target;
  }

  return null;
}

/** Shows scrollbars only while the user is actively scrolling. */
export function AutoHideScrollbars() {
  useEffect(() => {
    const timeouts = new WeakMap<Element, ReturnType<typeof setTimeout>>();

    function markScrolling(element: Element) {
      element.classList.add(SCROLLING_CLASS);

      const existing = timeouts.get(element);
      if (existing) clearTimeout(existing);

      timeouts.set(
        element,
        setTimeout(() => {
          element.classList.remove(SCROLLING_CLASS);
          timeouts.delete(element);
        }, INACTIVITY_MS),
      );
    }

    function handleScroll(event: Event) {
      const element = resolveScrollElement(event.target);
      if (element) {
        markScrolling(element);
      }
    }

    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

  return null;
}
