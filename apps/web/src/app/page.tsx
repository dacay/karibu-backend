"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AdminRoot } from "@/features/admin";
import { LearnerRoot } from "@/features/learner";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user) return null;

  return user.role === "admin" ? <AdminRoot /> : <LearnerRoot />;
}
