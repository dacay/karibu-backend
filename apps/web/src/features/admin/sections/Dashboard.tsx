"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAT_CARDS = [
  { title: "Total Learners", value: "—" },
  { title: "Active Microlearnings", value: "—" },
  { title: "Completion Rate", value: "—" },
  { title: "Avg. Session Time", value: "—" },
];

export function DashboardSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your organization's learning activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="min-h-64">
          <CardHeader>
            <CardTitle className="text-base">Engagement Over Time</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-48">
            <p className="text-sm text-muted-foreground">Chart coming soon</p>
          </CardContent>
        </Card>
        <Card className="min-h-64">
          <CardHeader>
            <CardTitle className="text-base">Top Microlearnings</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-48">
            <p className="text-sm text-muted-foreground">Data coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
