import type { ReactNode } from "react";
import "@/components/layout/app-shell.css";
import "./step2-frame.css";

interface Step2FrameProps {
  dir: "ltr" | "rtl";
  sidebar: ReactNode;
  children: ReactNode;
}

export function Step2Frame({ dir, sidebar, children }: Step2FrameProps) {
  return (
    <div className="zz-dash step2-frame">
      <div className="dapp" dir={dir}>
        {sidebar}
        {children}
      </div>
    </div>
  );
}
