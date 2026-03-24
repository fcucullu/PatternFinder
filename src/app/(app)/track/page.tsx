"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Crosshair, Plus } from "lucide-react";
import Link from "next/link";
import { ConfettiBurst } from "@/components/confetti";

interface TrackerEvent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  user_id: string;
}

interface ConfettiState {
  key: number;
  x: number;
  y: number;
}

export default function TrackPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiState | null>(null);
  const [loggedId, setLoggedId] = useState<string | null>(null);
  const expandTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const confettiKey = useRef(0);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Own events
    const { data: own } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");

    // Shared events
    const { data: shared } = await supabase
      .from("shared_events")
      .select("event_id, events(*)")
      .eq("shared_with_user_id", user.id);

    const sharedEvents = (shared?.map((s) => s.events).filter(Boolean) ?? []) as unknown as TrackerEvent[];
    setEvents([...(own ?? []), ...sharedEvents]);
  };

  const handleTap = useCallback(
    (eventId: string, e: React.MouseEvent | React.TouchEvent) => {
      if (expandedId === eventId) {
        // Second tap — log it!
        logOccurrence(eventId, e);
        setExpandedId(null);
        if (expandTimeout.current) clearTimeout(expandTimeout.current);
      } else {
        // First tap — expand
        setExpandedId(eventId);
        if (expandTimeout.current) clearTimeout(expandTimeout.current);
        expandTimeout.current = setTimeout(() => setExpandedId(null), 3000);
      }
    },
    [expandedId]
  );

  const logOccurrence = async (eventId: string, e: React.MouseEvent | React.TouchEvent) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    await supabase.from("occurrences").insert({
      event_id: eventId,
      logged_by: user.id,
    });

    confettiKey.current++;
    setConfetti({ key: confettiKey.current, x, y });
    setLoggedId(eventId);
    setTimeout(() => setLoggedId(null), 1000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Track</h1>
          <p className="text-xs text-muted">Tap once to select, tap again to log</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center">
          <Crosshair className="w-5 h-5 text-teal" />
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted mb-4">No events yet</p>
          <Link
            href="/manage"
            className="inline-flex items-center gap-2 bg-teal text-black font-medium px-4 py-2 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" /> Create your first event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {events.map((event) => {
            const isExpanded = expandedId === event.id;
            const justLogged = loggedId === event.id;
            return (
              <button
                key={event.id}
                onClick={(e) => handleTap(event.id, e)}
                className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-200 ${
                  isExpanded
                    ? "border-teal bg-teal/10 scale-105 shadow-lg shadow-teal/20"
                    : "border-border bg-surface hover:border-teal/30"
                } ${justLogged ? "animate-card-pulse" : ""}`}
              >
                <span className="text-4xl mb-2">{event.emoji}</span>
                <span className="text-sm font-medium text-foreground">{event.name}</span>
                {isExpanded && (
                  <span className="text-[10px] text-teal mt-1 font-medium animate-pulse">
                    Tap again to log
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {confetti && (
        <ConfettiBurst
          key={confetti.key}
          x={confetti.x}
          y={confetti.y}
          onDone={() => setConfetti(null)}
        />
      )}
    </div>
  );
}
