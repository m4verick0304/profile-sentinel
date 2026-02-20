import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Detect platform from URL
function detectPlatform(url: string): string {
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter/X';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('facebook.com')) return 'Facebook';
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('reddit.com')) return 'Reddit';
  if (url.includes('youtube.com')) return 'YouTube';
  return 'Unknown';
}

// Extract username from URL
function extractUsername(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    // Remove common prefixes
    const skip = ['user', 'users', 'u', 'profile', 'in', 'channel', 'c'];
    const username = parts.find(p => !skip.includes(p) && !p.startsWith('@')) ?? parts[0] ?? 'unknown';
    return username.replace('@', '');
  } catch {
    return 'unknown';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url: profileUrl } = await req.json();
    if (!profileUrl) {
      return new Response(JSON.stringify({ error: 'Profile URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: 'Firecrawl not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const platform = detectPlatform(profileUrl);
    const usernameFromUrl = extractUsername(profileUrl);

    console.log(`Scraping ${platform} profile: ${profileUrl}`);

    // Step 1: Scrape the profile page with Firecrawl
    let scrapedMarkdown = '';
    let scrapedLinks: string[] = [];

    try {
      const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: profileUrl,
          formats: ['markdown', 'links'],
          onlyMainContent: false,
          waitFor: 3000,
        }),
      });

      const scrapeData = await scrapeRes.json();
      console.log('Firecrawl status:', scrapeRes.status);

      if (scrapeRes.ok && scrapeData.success) {
        scrapedMarkdown = scrapeData.data?.markdown ?? scrapeData.markdown ?? '';
        scrapedLinks = scrapeData.data?.links ?? scrapeData.links ?? [];
        console.log(`Scraped ${scrapedMarkdown.length} chars, ${scrapedLinks.length} links`);
      } else {
        console.warn('Firecrawl failed or returned partial data:', scrapeData.error);
        // Continue with partial data — AI will work with what we have
        scrapedMarkdown = scrapeData.data?.markdown ?? scrapeData.markdown ?? '';
      }
    } catch (e) {
      console.warn('Firecrawl request failed:', e);
      // Graceful degradation — will return URL-inferred data
    }

    // Step 2: Use AI to extract structured profile metrics from the scraped content
    const extractionPrompt = `You are a social media profile data extractor. Analyze the following scraped content from a ${platform} profile page and extract structured data.

Profile URL: ${profileUrl}
Scraped content (markdown):
${scrapedMarkdown.slice(0, 8000)}

Number of links found on page: ${scrapedLinks.length}

Extract the following metrics and return them as a valid JSON object (no markdown, just JSON):
{
  "username": "the profile username or handle (without @)",
  "followers_count": <integer, followers/subscribers count, 0 if not found>,
  "following_count": <integer, following count, 0 if not found>,
  "posts_count": <integer, posts/tweets/videos count, 0 if not found>,
  "bio_length": <integer, number of characters in the bio/description, 0 if not found>,
  "account_age": <integer, estimated account age in days. Look for "joined" date or similar. Use 0 if unknown>,
  "has_profile_pic": <boolean, true if the page mentions or shows a profile picture>,
  "username_flags": {
    "numbers_heavy": <boolean, true if username has many numbers like user1234567>,
    "random_characters": <boolean, true if username looks randomly generated>,
    "very_short": <boolean, true if username is 3 chars or less>
  },
  "platform": "${platform}",
  "confidence": <"high" | "medium" | "low" — how confident you are in the extracted data>,
  "notes": "<brief explanation of what was found or not found>"
}

Rules:
- Parse numbers carefully: "1.2M" = 1200000, "15.3K" = 15300, "1,234" = 1234
- If a field is genuinely not visible on the page, use 0 or false defaults
- Do NOT make up data — only extract what's actually visible in the content
- Return ONLY valid JSON, no extra text`;

    let extractedData = {
      username: usernameFromUrl,
      followers_count: 0,
      following_count: 0,
      posts_count: 0,
      bio_length: 0,
      account_age: 0,
      has_profile_pic: true,
      username_flags: { numbers_heavy: false, random_characters: false, very_short: false },
      platform,
      confidence: 'low' as const,
      notes: 'Could not extract data from the page',
    };

    try {
      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: extractionPrompt }],
          temperature: 0.1,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const rawContent = aiData.choices?.[0]?.message?.content ?? '';

        // Strip markdown code blocks if present
        const jsonStr = rawContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        try {
          const parsed = JSON.parse(jsonStr);
          extractedData = { ...extractedData, ...parsed };
          console.log('AI extracted:', JSON.stringify(extractedData));
        } catch (parseErr) {
          console.warn('JSON parse failed:', parseErr, 'Raw:', rawContent.slice(0, 200));
        }
      } else {
        console.warn('AI request failed:', aiRes.status);
      }
    } catch (aiErr) {
      console.warn('AI extraction error:', aiErr);
    }

    // Step 3: Build username flags
    const username = extractedData.username || usernameFromUrl;
    const numberCount = (username.match(/\d/g) || []).length;
    const username_flags = {
      numbers_heavy: numberCount >= 4 || extractedData.username_flags?.numbers_heavy || false,
      no_profile_pic: !extractedData.has_profile_pic,
      random_characters: extractedData.username_flags?.random_characters || false,
      very_short: username.length <= 3 || extractedData.username_flags?.very_short || false,
    };

    return new Response(JSON.stringify({
      success: true,
      platform: extractedData.platform,
      confidence: extractedData.confidence,
      notes: extractedData.notes,
      profile: {
        username,
        followers_count: Math.max(0, Math.round(extractedData.followers_count)),
        following_count: Math.max(0, Math.round(extractedData.following_count)),
        posts_count: Math.max(0, Math.round(extractedData.posts_count)),
        bio_length: Math.max(0, Math.round(extractedData.bio_length)),
        account_age: Math.max(0, Math.round(extractedData.account_age)),
        username_flags,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Scrape profile error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
