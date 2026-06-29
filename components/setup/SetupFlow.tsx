"use client";

import { useState, useEffect } from "react";
import "./Setup.css";
import { T, type Lang, type Phase, type SetupFlowProps } from "./translations";
import { SetupWelcome } from "./SetupWelcome";
import { SetupEntry } from "./SetupEntry";
import { SetupUpload } from "./SetupUpload";
import { SetupReview } from "./SetupReview";
import { SetupDone } from "./SetupDone";
import { SetupWizard } from "./SetupWizard";

export function SetupFlow({ lang = "de", dir = "ltr", onComplete, onDashboard }: SetupFlowProps) {
  const t = T[lang];
  const TOTAL = 5;
  const [phase, setPhase] = useState<Phase>("welcome");
  const [step, setStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setTimeout(() => setPhase("review"), 2400);
    return () => clearTimeout(id);
  }, [phase]);

  const shared = { t, lang: lang as Lang, dir: dir as "ltr" | "rtl", isMobile };
  const goComplete = onComplete ?? (() => {});
  const goDash = onDashboard ?? (() => {});

  if (phase === "welcome") {
    return <SetupWelcome {...shared} onNext={() => setPhase("entry")} />;
  }
  if (phase === "entry") {
    return (
      <SetupEntry
        {...shared}
        onUpload={() => setPhase("upload")}
        onManual={() => { setStep(1); setPhase("wizard"); }}
      />
    );
  }
  if (phase === "upload" || phase === "scanning") {
    return (
      <SetupUpload
        {...shared}
        phase={phase}
        onScan={() => setPhase("scanning")}
        onBack={() => setPhase("entry")}
        onManual={() => { setStep(1); setPhase("wizard"); }}
      />
    );
  }
  if (phase === "review") {
    return (
      <SetupReview
        {...shared}
        onApply={() => setPhase("done")}
        onBack={() => setPhase("upload")}
      />
    );
  }
  if (phase === "done") {
    return <SetupDone {...shared} onComplete={goComplete} onDashboard={goDash} />;
  }
  return (
    <SetupWizard
      {...shared}
      step={step}
      setStep={setStep}
      TOTAL={TOTAL}
      onPhase={setPhase}
      onComplete={goComplete}
    />
  );
}
