import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const locations = url.searchParams.get("locations")?.split(",").filter(Boolean) || [];
    const oteMin = url.searchParams.get("oteMin");
    const oteMax = url.searchParams.get("oteMax");
    const tags = url.searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const sourceId = url.searchParams.get("sourceId");

    let query = supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (locations.length > 0) {
      query = query.in("location", locations);
    }

    if (oteMin) {
      query = query.gte("ote_min", parseInt(oteMin));
    }

    if (oteMax) {
      query = query.lte("ote_max", parseInt(oteMax));
    }

    if (sourceId) {
      query = query.eq("source_id", sourceId);
    }

    const { data, error } = await query;

    if (error) throw error;

    let filteredData = data || [];

    if (tags.length > 0) {
      filteredData = filteredData.filter((job) => {
        const jobTags = job.tags || [];
        return tags.some((tag) =>
          jobTags.some((jt: string) => jt.toLowerCase().includes(tag.toLowerCase()))
        );
      });
    }

    return new Response(JSON.stringify(filteredData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in jobs:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
