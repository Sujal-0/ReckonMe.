import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { rawQuestions } from "./data/raw_deep_questions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatQuestions() {
  return rawQuestions.map(item => {
    const type = item[0];
    let category = "RANDOM";
    let text = "";
    let options = [];

    if (type === "WYR") {
      category = "Would You Rather";
      text = `Would you rather ${item[1].toLowerCase()}, or ${item[2].toLowerCase()}?`;
      options = [item[1], item[2]];
    } else if (type === "MLT") {
      category = "Most Likely To";
      text = `Who is most likely to ${item[1].toLowerCase()}?`;
      options = ["{PLAYER_1}", "{PLAYER_2}"];
    } else if (type === "NHIE") {
      category = "Never Have I Ever";
      text = `Never have I ever ${item[1].toLowerCase()}`;
      options = ["I Have", "Never"];
    } else if (type === "TOT") {
      category = "This or That";
      text = `${item[1]} OR ${item[2]}?`;
      options = [item[1], item[2]];
    } else if (type === "HT") {
      category = "Hot Takes";
      text = item[1];
      options = ["Agree", "Disagree"];
    }

    return {
      text,
      options,
      category,
      isActive: true,
      isAIProcessed: true,
      source: "Curated Deep Gen"
    };
  });
}

async function run() {
  const formatted = formatQuestions();
  const outPath = path.join(__dirname, "data", "curated_deep_data.json");
  await fs.writeFile(outPath, JSON.stringify(formatted, null, 2), "utf-8");
  console.log(`✅ Successfully compiled ${formatted.length} deep questions to ${outPath}`);
}

run();
