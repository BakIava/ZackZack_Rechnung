"use client";

import { useState } from "react";
import { deriveCompanyMonogram } from "@/lib/initials";
import "./company-logo-mark.css";

interface CompanyLogoMarkProps {
  companyName: string;
  logoUrl: string | null;
}

export function CompanyLogoMark({ companyName, logoUrl }: CompanyLogoMarkProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(logoUrl && failedUrl !== logoUrl);

  return (
    <div className={`a4-logo${showImage ? " a4-logo--image" : ""}`}>
      {showImage && logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="a4-logo-img"
          src={logoUrl}
          alt=""
          onError={() => setFailedUrl(logoUrl)}
        />
      ) : (
        deriveCompanyMonogram(companyName)
      )}
    </div>
  );
}
