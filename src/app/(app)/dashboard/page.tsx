"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, X, Trash2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface TrackerEvent {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface Occurrence {
  id: string;
  event_id: string;
  logged_by: string;
  created_at: string;
}

type Period = "day" | "week" | "month";

export default function DashboardPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [period, setPeriod] = useState<Period>("week");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Own events
    const { data: own } = await supabase
      .from("events")
      .select("id, name, emoji, color")
      .eq("user_id", user.id);

    // Shared events
    const { data: shared } = await supabase
      .from("shared_events")
      .select("event_id, events(id, name, emoji, color)")
      .eq("shared_with_user_id", user.id);

    const sharedEvents = (shared?.map((s) => s.events).filter(Boolean) ?? []) as unknown as TrackerEvent[];
    const allEvents = [...(own ?? []), ...sharedEvents];
    setEvents(allEvents);

    if (allEvents.length > 0) {
      const { data: occ } = await supabase
        .from("occurrences")
        .select("*")
        .in("event_id", allEvents.map((e) => e.id))
        .order("created_at", { ascending: false });
      setOccurrences(occ ?? []);
    }
  };

  const getChartData = () => {
    const now = new Date();
    let days: number;
    let labelFn: (d: Date) => string;

    switch (period) {
      case "day":
        days = 24;
        labelFn = (d) => `${d.getHours()}:00`;
        break;
      case "week":
        days = 7;
        labelFn = (d) => d.toLocaleDateString("en", { weekday: "short" });
        break;
      case "month":
        days = 30;
        labelFn = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
        break;
    }

    if (period === "day") {
      // Hourly for last 24h
      const buckets: Record<string, Record<string, number>> = {};
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(d.getHours() - i, 0, 0, 0);
        const label = labelFn(d);
        buckets[label] = {};
        events.forEach((e) => (buckets[label][e.name] = 0));
      }

      occurrences.forEach((occ) => {
        const d = new Date(occ.created_at);
        if (now.getTime() - d.getTime() > 24 * 60 * 60 * 1000) return;
        const label = `${d.getHours()}:00`;
        const event = events.find((e) => e.id === occ.event_id);
        if (event && buckets[label]) buckets[label][event.name]++;
      });

      return Object.entries(buckets).map(([label, counts]) => ({ label, ...counts }));
    } else {
      // Daily buckets
      const buckets: Record<string, Record<string, number>> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const label = labelFn(d);
        buckets[label] = {};
        events.forEach((e) => (buckets[label][e.name] = 0));
      }

      occurrences.forEach((occ) => {
        const d = new Date(occ.created_at);
        if (now.getTime() - d.getTime() > days * 24 * 60 * 60 * 1000) return;
        const label = labelFn(d);
        const event = events.find((e) => e.id === occ.event_id);
        if (event && buckets[label]) buckets[label][event.name]++;
      });

      return Object.entries(buckets).map(([label, counts]) => ({ label, ...counts }));
    }
  };

  const getStats = (eventId: string) => {
    const now = new Date();
    const eventOcc = occurrences.filter((o) => o.event_id === eventId);
    const today = eventOcc.filter((o) => {
      const d = new Date(o.created_at);
      return d.toDateString() === now.toDateString();
    }).length;
    const thisWeek = eventOcc.filter((o) => {
      return now.getTime() - new Date(o.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const thisMonth = eventOcc.filter((o) => {
      return now.getTime() - new Date(o.created_at).getTime() < 30 * 24 * 60 * 60 * 1000;
    }).length;
    return { today, thisWeek, thisMonth, total: eventOcc.length };
  };

  const handleDeleteOccurrence = async (id: string) => {
    await supabase.from("occurrences").delete().eq("id", id);
    setOccurrences((prev) => prev.filter((o) => o.id !== id));
    setDeleteConfirm(null);
  };

  const chartData = getChartData();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-teal" />
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-center text-muted py-16">Create some events to see your patterns.</p>
      ) : (
        <>
          {/* Period selector */}
          <div className="flex gap-2 mb-4">
            {(["day", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-teal text-black"
                    : "bg-surface text-muted border border-border"
                }`}
              >
                {p === "day" ? "24h" : p === "week" ? "7 days" : "30 days"}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-surface rounded-xl border border-border p-4 mb-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#737373", fontSize: 10 }}
                  axisLine={{ stroke: "#262626" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#737373", fontSize: 10 }}
                  axisLine={{ stroke: "#262626" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#161616",
                    border: "1px solid #262626",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                {events.map((event) => (
                  <Bar
                    key={event.id}
                    dataKey={event.name}
                    fill={event.color}
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats per event */}
          <div className="space-y-3 mb-6">
            {events.map((event) => {
              const stats = getStats(event.id);
              return (
                <div
                  key={event.id}
                  className="bg-surface rounded-xl border border-border p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{event.emoji}</span>
                    <span className="font-medium text-foreground text-sm">{event.name}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-teal">{stats.today}</p>
                      <p className="text-[10px] text-muted">Today</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-teal">{stats.thisWeek}</p>
                      <p className="text-[10px] text-muted">7 days</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-teal">{stats.thisMonth}</p>
                      <p className="text-[10px] text-muted">30 days</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-teal">{stats.total}</p>
                      <p className="text-[10px] text-muted">Total</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Event Log Table */}
          <h2 className="font-bold text-foreground mb-3">Event Log</h2>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            {occurrences.length === 0 ? (
              <p className="text-center text-muted text-sm py-6">No events logged yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted text-xs">
                    <th className="text-left px-4 py-2">Event</th>
                    <th className="text-left px-4 py-2">When</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {occurrences.slice(0, 50).map((occ) => {
                    const event = events.find((e) => e.id === occ.event_id);
                    const d = new Date(occ.created_at);
                    return (
                      <tr key={occ.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="mr-1.5">{event?.emoji}</span>
                          <span className="text-foreground">{event?.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted text-xs">
                          {d.toLocaleDateString("en", { month: "short", day: "numeric" })}{" "}
                          {d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => setDeleteConfirm(occ.id)}
                            className="text-muted hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4 text-red-400/60 hover:text-red-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Delete Occurrence Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="bg-surface rounded-2xl p-6 border border-border max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h3 className="font-bold text-foreground">Delete this log entry?</h3>
            </div>
            <p className="text-sm text-muted mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteOccurrence(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
