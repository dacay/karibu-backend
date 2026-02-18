"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export function MicrolearningsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Microlearnings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage bite-sized learning content for your team.
        </p>
      </div>

      <Card className="min-h-96 flex flex-col items-center justify-center gap-3">
        <BookOpen className="size-10 text-muted-foreground" />
        <CardHeader className="text-center p-0">
          <CardTitle className="text-base text-muted-foreground">
            No microlearnings yet
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
