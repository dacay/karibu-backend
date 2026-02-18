"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export function PatternsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Conversation Patterns</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Design and manage structured conversation flows for learning sessions.
        </p>
      </div>

      <Card className="min-h-96 flex flex-col items-center justify-center gap-3">
        <MessageSquare className="size-10 text-muted-foreground" />
        <CardHeader className="text-center p-0">
          <CardTitle className="text-base text-muted-foreground">
            No patterns defined yet
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
