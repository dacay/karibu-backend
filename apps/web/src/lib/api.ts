const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("karibu_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
    localStorage.removeItem("karibu_token");
    localStorage.removeItem("karibu_user");
    window.location.href = "/login";
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `Request failed: ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

// ----- Types -----

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: "admin" | "user";
    organizationId: string;
    organizationName: string;
  };
}

export interface OrgConfig {
  name: string;
  subdomain: string;
  pronunciation: string | null;
}

export interface LogoPresignResponse {
  uploadUrl: string;
  key: string;
}

// ----- Namespaced API client -----

export const api = {
  auth: {
    login: (body: { email: string; password: string }) =>
      request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  org: {
    getConfig: () => request<OrgConfig>("/org/config"),
    updateConfig: (body: { name?: string; pronunciation?: string | null }) =>
      request<OrgConfig>("/org/config", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    getLogoUploadUrl: (body: {
      variant: "light" | "dark";
      contentType: "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";
    }) =>
      request<LogoPresignResponse>("/org/logo/presign", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};
