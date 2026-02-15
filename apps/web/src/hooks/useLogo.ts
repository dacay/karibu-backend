"use client";

import { useState, useEffect } from "react";
import { getSubdomain } from "@/lib/utils/url";

const CDN_BASE = process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.karibu.ai";

const FALLBACK_LIGHT = "/logo-light.png";
const FALLBACK_DARK = "/logo-dark.png";

export function useLogo() {
  const subdomain = getSubdomain();

  const cdnLight = subdomain ? `${CDN_BASE}/${subdomain}/logo-light.png` : null;
  const cdnDark = subdomain ? `${CDN_BASE}/${subdomain}/logo-dark.png` : null;

  const [lightSrc, setLightSrc] = useState(cdnLight ?? FALLBACK_LIGHT);
  const [darkSrc, setDarkSrc] = useState(cdnDark ?? FALLBACK_DARK);

  useEffect(() => {
    setLightSrc(cdnLight ?? FALLBACK_LIGHT);
    setDarkSrc(cdnDark ?? FALLBACK_DARK);
  }, [cdnLight, cdnDark]);

  return {
    lightSrc,
    darkSrc,
    onLightError: () => setLightSrc(FALLBACK_LIGHT),
    onDarkError: () => setDarkSrc(FALLBACK_DARK),
  };
}
