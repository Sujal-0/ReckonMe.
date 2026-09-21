import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoints from the open truthordarebot API
const ENDPOINTS = {
  truth: { url: "https://api.truthordarebot.xyz/api/truth", category: "Truth or Dare" },
  dare: { url: "https://api.truthordarebot.xyz/api/dare", category: "Truth or Dare" },
  wyr: { url: "https://api.truthordarebot.xyz/api/wyr", category: "Would You Rather" },
  nhie: { url: "https://api.truthordarebot.xyz/api/nhie", category: "Exposed" },
  paranoia: { url: "https://api.truthordarebot.xyz/api/paranoia", category: "Most Likely To" }
};

// Algorithmic formatter based on the category
function formatQuestion(type, rawQuestion) {
  let options = [];

  if (type === "paranoia") {
    // Paranoia/Most Likely To style -> Players vote for each other
    options = ["{PLAYER_1}", "{PLAYER_2}"];
  } else if (type === "wyr") {
    // Would You Rather -> "Would you rather X or Y?" -> Split into options
    let q = rawQuestion.toLowerCase().replace("would you rather ", "").replace(/\?|\./g, "");
    if (q.includes(" or ")) {
      options = q.split(" or ").map(o => o.trim());
      // Capitalize first letter of options
      options = options.map(o => o.charAt(0).toUpperCase() + o.slice(1));
    } else {
      options = ["Option A", "Option B"]; // fallback
    }
  } else if (type === "nhie") {
    // Never Have I Ever
    options = ["I have!", "Never done that"];
  } else if (type === "truth" || type === "dare") {
    // Truth or Dare (Usually open ended, so we provide default fun answers for voting)
    options = ["Spill the tea!", "Take a penalty shot", "Skip this one"];
  }

  return {
    text: rawQuestion,
    options: options,
    category: ENDPOINTS[type].category,
    isActive: true,
    isAIProcessed: false, // Flagging as an Algorithmic format
    source: "OpenTriviaDB"
  };
}

async function fetchQuestions(type, count) {
  const url = ENDPOINTS[type].url;
  const questions = [];
  console.log(`[Fetcher] Grabbing ${count} questions for type: ${type}...`);
  
  for (let i = 0; i < count; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      
      const data = await response.json();
      if (data && data.question) {
        questions.push(formatQuestion(type, data.question));
      }
    } catch (err) {
      // Ignore minor fetch errors and keep looping
    }
  }
  return questions;
}

async function runDatabaseBuilder() {
  console.log("==========================================");
  console.log("⚡ STARTING ALGORITHMIC DATABASE BUILDER ⚡");
  console.log("==========================================");

  let finalDatabase = [];

  // Fetch 20 of each type (Total 100). You can increase this to 1000 if needed!
  const fetchPromises = Object.keys(ENDPOINTS).map(type => fetchQuestions(type, 20));
  
  const results = await Promise.all(fetchPromises);
  
  for (const result of results) {
    finalDatabase = finalDatabase.concat(result);
  }

  // Deduplicate just in case the API returned duplicates
  const uniqueQuestions = [];
  const seen = new Set();
  for (const q of finalDatabase) {
    if (!seen.has(q.text)) {
      seen.add(q.text);
      uniqueQuestions.push(q);
    }
  }

  const outPath = path.join(__dirname, "data", "final_database.json");
  await fs.writeFile(outPath, JSON.stringify(uniqueQuestions, null, 2), "utf-8");

  console.log("==========================================");
  console.log(`✅ DATABASE BUILD COMPLETE!`);
  console.log(`📁 Saved ${uniqueQuestions.length} perfectly formatted questions to ${outPath}`);
  console.log("==========================================");
}

runDatabaseBuilder();
