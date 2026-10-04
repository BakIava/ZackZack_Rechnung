"use client";

import type { ReactNode } from "react";
import { startNavigationTransition } from "@/lib/navigation-transition";

interface NavigationFormProps {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
}

/** Startet das Seitenwechsel-Overlay vor einer navigierenden Server-Action. */
export function NavigationForm({
  action,
  className,
  children,
}: NavigationFormProps) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={startNavigationTransition}
    >
      {children}
    </form>
  );
}
