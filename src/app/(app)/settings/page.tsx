"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from("global_profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>

      {/* Profile */}
      <div className="bg-surface rounded-xl p-4 border border-border mb-4">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center">
              <User className="w-5 h-5 text-teal" />
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{profile?.display_name || "User"}</p>
            <p className="text-xs text-muted">{profile?.email}</p>
          </div>
        </div>
      </div>

      {/* WhatsApp feedback */}
      <a
        href="https://wa.me/34644941706?text=Hey%20Fran!%20%F0%9F%91%8B%20I'm%20using%20PatternFinder%20and%20wanted%20to%20tell%20you..."
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 bg-surface border border-border rounded-xl p-4 text-sm font-medium text-foreground hover:border-teal/30 transition-colors mb-4"
      >
        Feedback? Chat with Fran 💬
      </a>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full bg-surface rounded-xl p-4 border border-border flex items-center gap-3 text-red-400 hover:border-red-400/30 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium text-sm">Sign Out</span>
      </button>
    </div>
  );
}
