"use client";

import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { label: "My Learning", href: "#" },
  { label: "Progress", href: "#" },
];

export function LearnerRoot() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top nav */}
      <header className="flex h-16 items-center justify-between border-b px-6">
        <span className="text-lg font-semibold">Karibu</span>
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Page area */}
      <main className="flex-1 p-6">
        <h2 className="mb-4 text-xl font-semibold">Welcome back</h2>
        <p className="text-sm text-gray-400">
          {/* TODO: render learner sections here */}
          Your assigned learning sequences will appear here.
        </p>
      </main>
    </div>
  );
}
