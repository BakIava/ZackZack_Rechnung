export const NAVIGATION_TRANSITION_START = "zackzack:navigation-start";

export function startNavigationTransition() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAVIGATION_TRANSITION_START));
}
