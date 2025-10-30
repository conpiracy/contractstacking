import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DiscoverRequest {
  url: string;
}

interface ActorRecommendation {
  id: string;
  name: string;
  title: string;
  description: string;
  username: string;
  pricing: string;
  stats: {
    totalRuns?: number;
    avgRunTime?: string;
  };
  score: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url }: DiscoverRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apifyToken = Deno.env.get("APIFY_API_TOKEN");
    if (!apifyToken) {
      return new Response(
        JSON.stringify({ error: "Apify API token not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const domain = new URL(url).hostname;
    const searchQueries = [
      `${domain} scraper`,
      "remote job scraper",
      "job board scraper",
    ];

    const recommendations: ActorRecommendation[] = [];

    for (const query of searchQueries) {
      const response = await fetch(
        `https://api.apify.com/v2/store?token=${apifyToken}&search=${encodeURIComponent(query)}&limit=10`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to search Apify store: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const actors = data.data?.items || [];

      for (const actor of actors) {
        if (actor.title.toLowerCase().includes("job") || actor.description?.toLowerCase().includes("job")) {
          let score = 0;

          if (actor.title.toLowerCase().includes(domain)) score += 50;
          if (actor.stats?.totalRuns > 1000) score += 20;
          if (actor.stats?.totalRuns > 10000) score += 30;
          if (actor.userPricingModel?.includes("FREE")) score += 40;
          if (actor.userPricingModel?.includes("TRIAL")) score += 30;

          const avgCost = actor.userPricingModel?.includes("FREE") ? "Free" : "~$0.10/1k pages";

          recommendations.push({
            id: actor.id,
            name: actor.name,
            title: actor.title,
            description: actor.description || "No description available",
            username: actor.username,
            pricing: avgCost,
            stats: {
              totalRuns: actor.stats?.totalRuns || 0,
              avgRunTime: "~1-5 min",
            },
            score,
          });
        }
      }
    }

    recommendations.sort((a, b) => b.score - a.score);
    const topRecommendations = recommendations.slice(0, 3);

    if (topRecommendations.length === 0) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          message: "No suitable actors found. You can use a generic web scraper.",
          fallback: {
            id: "apify/web-scraper",
            name: "web-scraper",
            title: "Web Scraper",
            description: "Generic web scraper that can extract data from any website",
            username: "apify",
            pricing: "~$0.10/1k pages",
            stats: {
              totalRuns: 1000000,
              avgRunTime: "~2-10 min",
            },
            score: 100,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ recommendations: topRecommendations }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in discover-scraper:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
