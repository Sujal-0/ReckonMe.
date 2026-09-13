import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), "..", ".env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// The strict list of allowed categories defined in our MongoDB Schema
const ALLOWED_CATEGORIES = [
  "Random",
  "18+",
  "Romantic",
  "Couple",
  "Edgy",
  "This or That",
  "Would You Rather",
  "Truth or Dare",
  "Most Likely To",
  "Reverse Bucket List",
  "Never Have I Ever",
  "Sidemen"
];

const SYSTEM_PROMPT = `
You are an expert game content curator for a multiplayer party game called "ReckonMe!".
I will give you a raw scraped post from Reddit. Your job is to format it into a fun, engaging multiple-choice question.

Rules:
1. Rephrase the raw text so it reads clearly as a single question.
2. Generate exactly 4 distinct, funny, or interesting options for players to vote on.
3. Assign it to one of these EXACT categories: ${ALLOWED_CATEGORIES.join(", ")}.
4. Respond ONLY with raw JSON in this exact format, no markdown wrapping:
{
  "text": "The formatted question string",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "category": "The Chosen Category"
}
`;

async function callGemini(rawText, source) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: SYSTEM_PROMPT },
        { text: `Raw Post from ${source}: ${rawText}` }
      ]
    }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const rawOutput = data.candidates[0].content.parts[0].text;
  
  return JSON.parse(rawOutput);
}

async function runAIProcessor() {
  if (!GEMINI_API_KEY) {
    console.error("❌ FATAL: GEMINI_API_KEY is missing from server/.env");
    process.exit(1);
  }

  console.log("==========================================");
  console.log("🧠 STARTING AI CONTENT FORMATTER 🧠");
  console.log("==========================================");

  const rawPath = path.join(__dirname, "data", "raw_scraped_data.json");
  const rawData = JSON.parse(await fs.readFile(rawPath, "utf-8"));

  const processedData = [];

  for (let i = 0; i < rawData.length; i++) {
    const post = rawData[i];
    console.log(`[AI] Processing post ${i + 1}/${rawData.length}...`);
    
    try {
      // Pass the title and body to the AI
      const rawText = `Title: ${post.title} \n Body: ${post.body}`;
      const formatted = await callGemini(rawText, post.source);
      
      processedData.push({
        text: formatted.text,
        options: formatted.options,
        category: formatted.category,
        isActive: true, // Defaults to true, Admin will review this later
        isAIProcessed: true,
        source: post.source
      });

      // Small delay to respect rate limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`[AI] Failed to process post ${i + 1}:`, error.message);
    }
  }

  const outPath = path.join(__dirname, "data", "ai_processed_data.json");
  await fs.writeFile(outPath, JSON.stringify(processedData, null, 2), "utf-8");

  console.log("==========================================");
  console.log(`✅ AI PROCESSING COMPLETE!`);
  console.log(`📁 Saved ${processedData.length} formatted questions to ${outPath}`);
  console.log("==========================================");
}

runAIProcessor();
