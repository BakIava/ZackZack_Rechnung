import { useMemo } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";
import { startNavigationTransition } from "@/lib/navigation-transition";

const navigation = createNavigation(routing);

export const { Link, redirect, usePathname, getPathname } = navigation;

/** Für Navigationen, die bereits einen eigenen lokalen Ladezustand anzeigen. */
export const useRouterWithoutTransition = navigation.useRouter;

export function useRouter(): ReturnType<typeof navigation.useRouter> {
  const router = navigation.useRouter();

  return useMemo(() => {
    const push: typeof router.push = (...args) => {
      startNavigationTransition();
      return router.push(...args);
    };
    const replace: typeof router.replace = (...args) => {
      startNavigationTransition();
      return router.replace(...args);
    };

    return { ...router, push, replace };
  }, [router]);
}
