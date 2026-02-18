"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle } from "lucide-react";

export function AvatarsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Avatars</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure AI avatars that deliver learning experiences.
        </p>
      </div>

      <Card className="min-h-96 flex flex-col items-center justify-center gap-3">
        <UserCircle className="size-10 text-muted-foreground" />
        <CardHeader className="text-center p-0">
          <CardTitle className="text-base text-muted-foreground">
            No avatars configured yet
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-sm text-muted-foreground text-center">
            This section is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
