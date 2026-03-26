import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Count unique users who have created events in PatternFinder
  const { data } = await supabase
    .from("patternfinder_events")
    .select("user_id")
    .limit(1000);

  const uniqueUsers = new Set((data ?? []).map((d) => d.user_id));

  return NextResponse.json(
    { users: uniqueUsers.size },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}
