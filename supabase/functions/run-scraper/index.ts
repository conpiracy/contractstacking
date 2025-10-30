import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_LOCATIONS = ["U.S.", "USA", "United States", "Canada", "Australia", "UK", "United Kingdom", "South Africa", "Remote"];

interface ScraperRequest {
  sourceId: string;
}

function isLocationAllowed(location: string): boolean {
  const lowerLocation = location.toLowerCase();
  return ALLOWED_LOCATIONS.some(allowed => lowerLocation.includes(allowed.toLowerCase()));
}

async function fallbackToBrowserUse(url: string, apiSecret: string): Promise<any[]> {
  try {
    const response = await fetch('https://api.browseruse.ai/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        extract: {
          jobs: {
            selector: 'article, .job-listing, .job-item, [class*="job"]',
            fields: {
              title: 'h1, h2, h3, .title, [class*="title"]',
              company: '.company, [class*="company"]',
              location: '.location, [class*="location"]',
              description: '.description, [class*="description"]',
              url: 'a[href]@href',
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`BrowserUse API failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.jobs || [];
  } catch (error) {
    console.error('BrowserUse fallback failed:', error);
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { sourceId }: ScraperRequest = await req.json();

    if (!sourceId) {
      return new Response(
        JSON.stringify({ error: "sourceId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apifyToken = Deno.env.get("APIFY_API_TOKEN");
    const browserUseSecret = Deno.env.get("BROWSERUSE_API_SECRET");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();

    if (sourceError || !source) {
      return new Response(
        JSON.stringify({ error: "Source not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: logEntry } = await supabase
      .from("scrape_logs")
      .insert({
        source_id: sourceId,
        status: "running",
        started_at: new Date().toISOString(),
        log_entries: ["Starting scrape..."],
      })
      .select()
      .single();

    await supabase
      .from("sources")
      .update({ last_status: "running", last_run_at: new Date().toISOString() })
      .eq("id", sourceId);

    const logId = logEntry?.id;
    const addLog = async (message: string) => {
      if (!logId) return;
      const { data: currentLog } = await supabase
        .from("scrape_logs")
        .select("log_entries")
        .eq("id", logId)
        .single();

      const entries = currentLog?.log_entries || [];
      entries.push(message);

      await supabase
        .from("scrape_logs")
        .update({ log_entries: entries })
        .eq("id", logId);
    };

    let jobsFound = 0;
    let jobsInserted = 0;
    let results: any[] = [];

    try {
      if (source.scraper_type === "apify_actor" && apifyToken) {
        const actorId = source.config_json?.actorId;
        const actorInput = source.config_json?.input || {};

        await addLog(`Running Apify actor: ${actorId}`);

        try {
          const runResponse = await fetch(
            `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(actorInput),
              signal: AbortSignal.timeout(300000),
            }
          );

          if (!runResponse.ok) {
            throw new Error(`Apify actor failed: ${runResponse.statusText}`);
          }

          results = await runResponse.json();
          await addLog(`Apify returned ${results.length} items`);
        } catch (apifyError) {
          await addLog(`Apify failed: ${apifyError.message}`);
          
          if (browserUseSecret) {
            await addLog("Falling back to BrowserUse API...");
            results = await fallbackToBrowserUse(source.url, browserUseSecret);
            await addLog(`BrowserUse returned ${results.length} items`);
          } else {
            throw apifyError;
          }
        }
      } else {
        throw new Error("Apify token required for scraping");
      }

      jobsFound = results.length || 0;
      await addLog(`Processing ${jobsFound} potential jobs`);

      const isUpwork = source.url.includes("upwork.com");
      const isHourlySource = isUpwork || source.url.includes("freelancer.com");

      for (const item of results) {
        const title = item.title || item.jobTitle || item.position || item.positionTitle || "";
        const company = item.company || item.companyName || item.employer || "Unknown";
        const location = item.location || item.jobLocation || "Remote";
        const applyUrl = item.url || item.link || item.applyUrl || item.jobUrl || source.url;
        const descriptionText = (item.description || item.jobDescription || item.details || "").toLowerCase();

        if (!isLocationAllowed(location)) {
          continue;
        }

        let contractType = isHourlySource ? "hourly" : "ote";
        let hourlyRate = null;
        let oteMin = null;
        let oteMax = null;
        let paymentTerms = null;
        let isPaymentVerified = false;
        let rating = null;
        let projectType = null;
        let companySize = null;

        if (isHourlySource) {
          const hourlyMatch = descriptionText.match(/(\$?)(\d+)(\.\d+)?\s*\/\s*hr/);
          if (hourlyMatch) {
            hourlyRate = parseFloat(hourlyMatch[2]);
          } else if (item.hourlyRate) {
            hourlyRate = parseFloat(item.hourlyRate);
          }

          if (hourlyRate && hourlyRate < 18) {
            continue;
          }

          if (descriptionText.includes("appointment") || descriptionText.includes("per appointment")) {
            paymentTerms = "hourly_plus_appointment";
          } else if (descriptionText.includes("commission")) {
            paymentTerms = "hourly_plus_commission";
          } else {
            paymentTerms = "fixed_hourly";
          }

          isPaymentVerified = item.paymentVerified || item.payment_verified || false;
          rating = item.rating || item.clientRating || null;

          if (isUpwork && (!isPaymentVerified || (rating && rating < 3))) {
            continue;
          }

          if (descriptionText.includes("full time") || descriptionText.includes("full-time")) {
            projectType = "full_time";
          } else if (descriptionText.includes("part time") || descriptionText.includes("part-time")) {
            projectType = "part_time";
          } else if (descriptionText.includes("contract to hire")) {
            projectType = "contract_to_hire";
          }
        } else {
          const salaryMatch = descriptionText.match(/(\$?)(\d+)k?\s*-\s*(\$?)(\d+)k?/i);
          if (salaryMatch) {
            oteMin = parseInt(salaryMatch[2]) * (salaryMatch[2].length <= 2 ? 1000 : 1);
            oteMax = parseInt(salaryMatch[4]) * (salaryMatch[4].length <= 2 ? 1000 : 1);
          } else if (item.salary || item.salaryRange) {
            const salData = item.salary || item.salaryRange;
            oteMin = salData.min || salData.minSalary || null;
            oteMax = salData.max || salData.maxSalary || null;
          }

          const sizeMatch = descriptionText.match(/(\d+)\s*-\s*(\d+)\s*employees/i);
          if (sizeMatch) {
            companySize = parseInt(sizeMatch[2]);
          } else if (item.companySize) {
            companySize = item.companySize;
          }

          if (companySize && companySize >= 100) {
            continue;
          }

          if (oteMin && oteMax) {
            if (oteMax < 50000 || oteMin > 110000) {
              continue;
            }
          }
        }

        const tags = item.tags || item.skills || item.categories || [];

        const { error: insertError } = await supabase.from("jobs").insert({
          title,
          company,
          company_size: companySize,
          ote_min: oteMin,
          ote_max: oteMax,
          location,
          tags: Array.isArray(tags) ? tags : [],
          apply_url: applyUrl,
          source_id: sourceId,
          source_name: source.name,
          scraped_at: new Date().toISOString(),
          contract_type: contractType,
          hourly_rate: hourlyRate,
          payment_terms: paymentTerms,
          is_payment_verified: isPaymentVerified,
          rating,
          project_type: projectType,
          allowed_locations: ALLOWED_LOCATIONS,
        });

        if (!insertError) {
          jobsInserted++;
        }
      }

      await addLog(`Inserted ${jobsInserted} jobs after filtering`);

      await supabase
        .from("scrape_logs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          jobs_found: jobsFound,
          jobs_inserted: jobsInserted,
        })
        .eq("id", logId);

      await supabase
        .from("sources")
        .update({
          last_status: "success",
          last_error: null,
        })
        .eq("id", sourceId);

      return new Response(
        JSON.stringify({
          success: true,
          jobsFound,
          jobsInserted,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (scrapeError) {
      const errorMessage = scrapeError.message || "Unknown error";
      await addLog(`Error: ${errorMessage}`);

      await supabase
        .from("scrape_logs")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
          jobs_found: jobsFound,
          jobs_inserted: jobsInserted,
        })
        .eq("id", logId);

      await supabase
        .from("sources")
        .update({
          last_status: "error",
          last_error: errorMessage,
        })
        .eq("id", sourceId);

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in run-scraper:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
