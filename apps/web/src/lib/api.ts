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
      (body as { message?: string; error?: string }).message ??
      (body as { message?: string; error?: string }).error ??
      `Request failed: ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("karibu_token");
    localStorage.removeItem("karibu_user");
    window.location.href = "/login";
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string; error?: string }).message ??
      (body as { message?: string; error?: string }).error ??
      `Request failed: ${res.status}`
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

export interface Document {
  id: string;
  organizationId: string;
  uploadedBy: string;
  name: string;
  s3Key: string;
  s3Bucket: string;
  mimeType: string;
  sizeBytes: number;
  status: "uploaded" | "processing" | "processed" | "failed";
  chromaDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
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
  documents: {
    list: () =>
      request<{ documents: Document[] }>("/documents"),
    upload: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return upload<{ document: Document }>("/documents/upload", formData);
    },
    delete: (id: string) =>
      request<{ success: boolean }>(`/documents/${id}`, { method: "DELETE" }),
  },
};
