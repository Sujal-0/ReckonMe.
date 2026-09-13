import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockProcessedData = [
  {
    "text": "Who is most likely to secretly be a billionaire but still use expired coupons just to save 50 cents?",
    "options": ["The Penny Pincher", "The Crypto Bro", "The Secret Hoarder", "The Accidental Genius"],
    "category": "Sidemen",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/Sidemen"
  },
  {
    "text": "If we were all trapped on a desert island, who gets eaten first by the rest of the group?",
    "options": ["The loudest one", "The most annoying one", "The one with the most meat", "The one who suggests it"],
    "category": "Sidemen",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/Sidemen"
  },
  {
    "text": "Would you rather have to announce to the world every time you fart, or never be able to say 'I love you' to anyone ever again?",
    "options": ["Announce my farts globally", "Never say I love you", "I'd rather explode", "Just use a megaphone"],
    "category": "Would You Rather",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/WouldYouRather"
  },
  {
    "text": "Who is most likely to accidentally burn down the entire house while trying to boil pasta?",
    "options": ["The clumsiest person", "The worst cook", "The one always on their phone", "The designated adult"],
    "category": "Sidemen",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/Sidemen"
  },
  {
    "text": "What is a dark secret you've kept from your parents that would actually ruin their lives if they found out?",
    "options": ["I dropped out of college", "I am secretly married", "I blew their retirement fund", "I am Batman"],
    "category": "18+",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/AskReddit"
  },
  {
    "text": "Truth: What is the most aggressively embarrassing thing sitting in your internet search history right now?",
    "options": ["How to boil water", "Do penguins have knees?", "Symptoms of eating raw flour", "I always use Incognito"],
    "category": "Truth or Dare",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/TruthOrDare"
  },
  {
    "text": "What is the biggest red flag your current partner completely ignored about you when you first started dating?",
    "options": ["My obsession with true crime", "My crippling debt", "My toxic ex in my DMs", "My inability to text back"],
    "category": "Couple",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/relationship_advice"
  },
  {
    "text": "Who is more likely to completely ruin a romantic dinner by laughing at a totally inappropriate meme?",
    "options": ["Me, easily", "My partner, 100%", "We both would", "Neither, we are boring"],
    "category": "Couple",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/Couples"
  },
  {
    "text": "Who would realistically survive the longest if you were all dropped into a real-life GTA Online public lobby?",
    "options": ["The gamer", "The most aggressive one", "The quiet one who hides", "The one who dies immediately"],
    "category": "Sidemen",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/Sidemen"
  },
  {
    "text": "If you had a time machine but could only go back exactly 5 minutes, what would you use it for?",
    "options": ["Win a quick bet", "Take back a risky text", "Eat that last slice of pizza again", "Scream at my boss"],
    "category": "Random",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/AskReddit"
  },
  {
    "text": "What is an absolute, non-negotiable dealbreaker on a first date?",
    "options": ["Being rude to the waiter", "Talking about their ex", "Chewing with their mouth open", "Checking their phone constantly"],
    "category": "Romantic",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/AskReddit"
  },
  {
    "text": "Would you rather always have to sing instead of speaking, or have to aggressively breakdance everywhere you go?",
    "options": ["Sing like a Disney princess", "Breakdance in the grocery store", "Just be completely silent forever", "Only communicate via text"],
    "category": "Would You Rather",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/WouldYouRather"
  },
  {
    "text": "Dare: You must let the person on your left send a completely unhinged text to anyone in your contacts.",
    "options": ["I accept the dare!", "I refuse and take a penalty!", "Only if they text my boss", "I don't have friends"],
    "category": "Truth or Dare",
    "isActive": true,
    "isAIProcessed": true,
    "source": "r/TruthOrDare"
  }
];

async function generateMockAIData() {
  const outPath = path.join(__dirname, "data", "ai_processed_data.json");
  await fs.writeFile(outPath, JSON.stringify(mockProcessedData, null, 2), "utf-8");
  console.log(`✅ Generated ${mockProcessedData.length} highly realistic AI-processed posts to ${outPath}`);
}

generateMockAIData();
