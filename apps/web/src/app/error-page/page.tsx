"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  invalid_token: {
    title: "Invalid or expired link",
    description:
      "This login link is invalid or has already been used. Please request a new one.",
  },
  server_error: {
    title: "Something went wrong",
    description:
      "We couldn't process your request. Please try again or contact support.",
  },
};

const DEFAULT_ERROR = {
  title: "An error occurred",
  description: "An unexpected error occurred. Please try again.",
};

function ErrorContent() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";
  const { title, description } = ERROR_MESSAGES[key] ?? DEFAULT_ERROR;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm text-center">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mb-6 text-sm text-gray-500">{description}</p>
        <Link
          href="/login"
          className="text-sm font-medium text-black underline underline-offset-4 hover:text-gray-700"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
