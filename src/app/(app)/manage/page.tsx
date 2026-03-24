"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, X, Share2 } from "lucide-react";

interface TrackerEvent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  user_id: string;
}

const EMOJIS = ["🐕", "💧", "🍽️", "💊", "🏃", "😴", "📖", "🧘", "☕", "🍺", "🚬", "💩", "🤒", "😊", "😰", "🎯"];
const COLORS = ["#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#F97316", "#6366F1"];

export default function ManagePage() {
  const supabase = createClient();
  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TrackerEvent | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState("#06B6D4");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharingEventId, setSharingEventId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");
    setEvents(data ?? []);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingEvent) {
      const { error } = await supabase
        .from("events")
        .update({ name: name.trim(), emoji, color })
        .eq("id", editingEvent.id);
      if (error) return alert("Failed to save event.");
    } else {
      const { error } = await supabase.from("events").insert({
        user_id: user.id,
        name: name.trim(),
        emoji,
        color,
      });
      if (error) return alert("Failed to create event.");
    }

    resetForm();
    loadEvents();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    setDeleteConfirm(null);
    loadEvents();
  };

  const handleShare = async (eventId: string) => {
    if (!shareEmail.trim()) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", shareEmail.trim().toLowerCase())
      .single();

    if (!profile) {
      setShareMessage("User not found. They need to sign up first.");
      return;
    }

    const { error } = await supabase.from("shared_events").insert({
      event_id: eventId,
      shared_with_user_id: profile.id,
    });

    if (error?.code === "23505") {
      setShareMessage("Already shared with this user.");
    } else if (error) {
      setShareMessage("Error sharing event.");
    } else {
      setShareMessage("Shared successfully!");
      setShareEmail("");
    }
    setTimeout(() => { setShareMessage(""); setSharingEventId(null); }, 2000);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setName("");
    setEmoji("🎯");
    setColor("#06B6D4");
  };

  const startEdit = (event: TrackerEvent) => {
    setEditingEvent(event);
    setName(event.name);
    setEmoji(event.emoji);
    setColor(event.color);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Events</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-teal text-black font-medium px-3 py-1.5 rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center">
          <div className="bg-surface w-full max-w-lg rounded-t-2xl p-6 pb-[calc(1.5rem+4rem+env(safe-area-inset-bottom))] border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground">
                {editingEvent ? "Edit Event" : "New Event"}
              </h2>
              <button onClick={resetForm} className="text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Event name (e.g., Dog diarrhea)"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm mb-4 outline-none focus:border-teal"
            />

            <p className="text-xs text-muted mb-2">Emoji</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                    emoji === e ? "bg-teal/20 border border-teal" : "bg-background border border-border"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted mb-2">Color</p>
            <div className="flex gap-2 mb-6">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${
                    color === c ? "ring-2 ring-offset-2 ring-offset-surface ring-teal" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="w-full bg-teal text-black font-medium py-3 rounded-xl disabled:opacity-40"
            >
              {editingEvent ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-6">
          <div className="bg-surface rounded-2xl p-6 border border-border max-w-sm w-full">
            <h3 className="font-bold text-foreground mb-2">Delete Event?</h3>
            <p className="text-sm text-muted mb-6">
              This will permanently delete this event and all its logged occurrences.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {sharingEventId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-6">
          <div className="bg-surface rounded-2xl p-6 border border-border max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Share Event</h3>
              <button onClick={() => { setSharingEventId(null); setShareMessage(""); }} className="text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted mb-3">
              Enter the email of the person you want to share this event with. They must have a PatternFinder account.
            </p>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm mb-3 outline-none focus:border-teal"
            />
            {shareMessage && (
              <p className={`text-xs mb-3 ${shareMessage.includes("successfully") ? "text-green-400" : "text-red-400"}`}>
                {shareMessage}
              </p>
            )}
            <button
              onClick={() => handleShare(sharingEventId)}
              disabled={!shareEmail.trim()}
              className="w-full bg-teal text-black font-medium py-3 rounded-xl disabled:opacity-40"
            >
              Share
            </button>
          </div>
        </div>
      )}

      {/* Event List */}
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-surface rounded-xl p-4 border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{event.emoji}</span>
              <span className="font-medium text-foreground text-sm">{event.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSharingEventId(event.id)}
                className="p-2 text-muted hover:text-teal transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => startEdit(event)}
                className="p-2 text-muted hover:text-teal transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteConfirm(event.id)}
                className="p-2 text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <p className="text-center text-muted text-sm py-8">
          No events created yet. Tap &quot;New&quot; to get started.
        </p>
      )}
    </div>
  );
}
