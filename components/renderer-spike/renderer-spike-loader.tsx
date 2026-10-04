"use client";

import dynamic from "next/dynamic";

const RendererSpike = dynamic(
  () => import("./renderer-spike").then((module) => module.RendererSpike),
  { ssr: false },
);

export function RendererSpikeLoader() {
  return <RendererSpike />;
}
