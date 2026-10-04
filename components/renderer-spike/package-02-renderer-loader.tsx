"use client";

import dynamic from "next/dynamic";

const Package02Renderer = dynamic(
  () => import("./package-02-renderer").then((module) => module.Package02Renderer),
  { ssr: false },
);

export function Package02RendererLoader() {
  return <Package02Renderer />;
}
