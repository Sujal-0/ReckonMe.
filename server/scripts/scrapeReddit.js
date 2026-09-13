import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables from server/.env
dotenv.config({ path: path.join(process.cwd(), "..", ".env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure these are in your server/.env file
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

const TARGET_SUBREDDITS = [
  "Sidemen",
  "WouldYouRather",
  "AskReddit",
  "TruthOrDare",
  "relationship_advice",
  "AskMen",
  "AskWomen",
  "Showerthoughts"
];

const POSTS_LIMIT = 50;

async function getRedditAccessToken() {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    throw new Error("Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET in .env");
  }

  const credentials = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64");
  
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "NodeJS:ReckonMe.Scraper:v1.0",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get Access Token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function scrapeSubreddit(subreddit, accessToken) {
  console.log(`[Scraper] Fetching top posts from r/${subreddit}...`);
  try {
    // Note we are hitting oauth.reddit.com now, not www.reddit.com
    const response = await fetch(`https://oauth.reddit.com/r/${subreddit}/top?t=all&limit=${POSTS_LIMIT}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": "NodeJS:ReckonMe.Scraper:v1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.data.children;

    const scrapedData = [];
    for (const post of posts) {
      const { title, selftext, upvote_ratio, over_18, score } = post.data;
      
      scrapedData.push({
        source: `r/${subreddit}`,
        title: title || "",
        body: selftext || "",
        score: score,
        isNsfw: over_18,
      });
    }

    console.log(`[Scraper] -> Successfully scraped ${scrapedData.length} posts from r/${subreddit}`);
    return scrapedData;
  } catch (error) {
    console.error(`[Scraper] Error scraping r/${subreddit}:`, error.message);
    return [];
  }
}

async function runScraper() {
  console.log("==========================================");
  console.log("🚀 STARTING OAUTH REDDIT SCRAPER 🚀");
  console.log("==========================================");

  try {
    console.log("[Auth] Fetching Reddit Access Token...");
    const accessToken = await getRedditAccessToken();
    console.log("[Auth] Token secured!");

    let allData = [];

    for (const subreddit of TARGET_SUBREDDITS) {
      const data = await scrapeSubreddit(subreddit, accessToken);
      allData = allData.concat(data);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const outPath = path.join(__dirname, "data", "raw_scraped_data.json");
    await fs.writeFile(outPath, JSON.stringify(allData, null, 2), "utf-8");

    console.log("==========================================");
    console.log(`✅ SCRAPING COMPLETE!`);
    console.log(`📁 Saved ${allData.length} total raw posts to ${outPath}`);
    console.log("==========================================");
  } catch (err) {
    console.error("FATAL ERROR:", err.message);
  }
}

runScraper();
