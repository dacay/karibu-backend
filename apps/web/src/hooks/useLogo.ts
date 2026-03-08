"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubdomain } from "./useSubdomain";
import { useLogoVersion } from "./useLogoVersion";
import { getLogoUrl } from "@/lib/assets";

const FALLBACK_LIGHT = "/logo-light.png";
const FALLBACK_DARK = "/logo-dark.png";

export function useLogo() {
  const { subdomain, isLoading } = useSubdomain();
  const version = useLogoVersion();
  const [lightSrc, setLightSrc] = useState(FALLBACK_LIGHT);
  const [darkSrc, setDarkSrc] = useState(FALLBACK_DARK);

  useEffect(() => {
    const suffix = version ? `?v=${version}` : "";
    const cdnLight = subdomain ? `${getLogoUrl(subdomain, "light")}${suffix}` : null;
    const cdnDark = subdomain ? `${getLogoUrl(subdomain, "dark")}${suffix}` : null;

    setLightSrc(cdnLight ?? FALLBACK_LIGHT);
    setDarkSrc(cdnDark ?? FALLBACK_DARK);
  }, [subdomain, version]);

  return {
    lightSrc,
    darkSrc,
    isLoading,
    onLightError: () => setLightSrc(FALLBACK_LIGHT),
    onDarkError: () => setDarkSrc(FALLBACK_DARK),
  };
}
