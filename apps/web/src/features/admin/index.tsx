"use client";

import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "#" },
  { label: "Organizations", href: "#" },
  { label: "Users", href: "#" },
  { label: "Sequences", href: "#" },
  { label: "Progress", href: "#" },
];

export function AdminRoot() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-gray-50">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-semibold">Karibu Admin</span>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-sm font-medium text-gray-500">Admin</h1>
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
          <p className="text-sm text-gray-400">
            {/* TODO: render feature sections here */}
            Select a section from the sidebar.
          </p>
        </main>
      </div>
    </div>
  );
}
