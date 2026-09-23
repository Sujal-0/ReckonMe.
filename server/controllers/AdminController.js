import Question from "../models/QuestionModel.js";
import { sessionStore } from "../socket/store/SessionStore.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadQuestions = async (req, res) => {
  try {
    const { questions } = req.body; // Expects array of { text, options, category, heatLevel }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Invalid questions array" });
    }

    const validQuestions = [];
    let skippedCount = 0;

    for (const q of questions) {
      if (!q.text || !q.options || q.options.length < 2) continue;

      // Smart duplication check against existing DB records
      const existing = await Question.findOne({
        text: q.text,
        // Check if options array contains exactly the same elements
        options: { $size: q.options.length, $all: q.options }
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Check for duplicates within the current upload batch itself
      const isDuplicateInBatch = validQuestions.some(vq => 
        vq.text === q.text && 
        vq.options.length === q.options.length && 
        vq.options.every(opt => q.options.includes(opt))
      );

      if (isDuplicateInBatch) {
        skippedCount++;
        continue;
      }

      validQuestions.push({
        text: q.text,
        options: q.options,
        category: q.category?.toUpperCase() || "RANDOM",
        heatLevel: q.heatLevel || 1,
        isCustom: false
      });
    }

    if (validQuestions.length === 0) {
      return res.status(400).json({ error: "No valid questions found to insert." });
    }

    // Insert into MongoDB
    const inserted = await Question.insertMany(validQuestions);

    // Push IDs to Redis Sets categorized
    const redis = sessionStore.redisClient;
    if (redis) {
      const pipeline = redis.multi();
      for (const q of inserted) {
        pipeline.sAdd(`questions:category:${q.category}`, q._id.toString());
        pipeline.sAdd(`questions:heat:${q.heatLevel}`, q._id.toString());
      }
      await pipeline.exec();
    }

    res.status(200).json({ 
      success: true, 
      message: `Successfully uploaded ${inserted.length} questions. Skipped ${skippedCount} duplicates.` 
    });
  } catch (error) {
    console.error("Error in uploadQuestions:", error);
    res.status(500).json({ error: "Internal server error during upload." });
  }
};

export const getStats = async (req, res) => {
  try {
    const totalQuestions = await Question.countDocuments({ isCustom: false });
    
    // Aggregate by category
    const categoryStats = await Question.aggregate([
      { $match: { isCustom: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      total: totalQuestions,
      categories: categoryStats.map(c => ({ category: c._id, count: c.count }))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const getQuestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;
    
    const query = { isCustom: false };
    if (category) query.category = category;

    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      questions, 
      total, 
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const oldQ = await Question.findById(id);
    if (!oldQ) return res.status(404).json({ error: "Question not found" });

    const newQ = await Question.findByIdAndUpdate(id, updateData, { new: true });
    
    const redis = sessionStore.redisClient;
    if (redis) {
      // If category or heat changed, update Redis sets
      if (oldQ.category !== newQ.category) {
        await redis.sRem(`questions:category:${oldQ.category}`, id);
        await redis.sAdd(`questions:category:${newQ.category}`, id);
      }
      if (oldQ.heatLevel !== newQ.heatLevel) {
        await redis.sRem(`questions:heat:${oldQ.heatLevel}`, id);
        await redis.sAdd(`questions:heat:${newQ.heatLevel}`, id);
      }
    }
    
    res.status(200).json({ success: true, question: newQ });
  } catch (error) {
    res.status(500).json({ error: "Failed to update question" });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const q = await Question.findByIdAndDelete(id);
    if (!q) return res.status(404).json({ error: "Question not found" });

    const redis = sessionStore?.redisClient;
    if (redis) {
      try {
        await redis.sRem(`questions:category:${q.category}`, id);
        await redis.sRem(`questions:heat:${q.heatLevel}`, id);
      } catch (err) {}
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete question" });
  }
};

export const bulkDeleteQuestions = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid array of IDs" });
    }
    
    const questionsToDelete = await Question.find({ _id: { $in: ids } });
    
    const result = await Question.deleteMany({ _id: { $in: ids } });
    
    const redis = sessionStore?.redisClient;
    if (redis) {
      for (const q of questionsToDelete) {
        try {
          await redis.sRem(`questions:category:${q.category}`, q._id.toString());
          await redis.sRem(`questions:heat:${q.heatLevel}`, q._id.toString());
        } catch (err) {}
      }
    }
    
    res.status(200).json({ success: true, count: result.deletedCount });
  } catch (error) {
    console.error("Error in bulkDeleteQuestions:", error);
    res.status(500).json({ error: "Failed to bulk delete questions" });
  }
};

export const discardQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "No questions provided to discard." });
    }

    const discardedTexts = questions.map(q => q.text);

    // Read the current file being used as the staging area
    const filePath = path.join(__dirname, "..", "scripts", "data", "vogue_generated_data.json");
    const curatedPath = path.join(__dirname, "..", "scripts", "data", "curated_questions.json");
    
    // Attempt to discard from both possible files to ensure they don't reappear
    for (const file of [filePath, curatedPath]) {
      try {
        const data = await fs.readFile(file, "utf-8");
        const existingQuestions = JSON.parse(data);
        
        const filteredQuestions = existingQuestions.filter(q => !discardedTexts.includes(q.text));
        
        await fs.writeFile(file, JSON.stringify(filteredQuestions, null, 2), "utf-8");
      } catch (fsError) {
        // Ignore if file doesn't exist
      }
    }

    res.status(200).json({ success: true, message: `Discarded ${questions.length} questions permanently.` });
  } catch (error) {
    console.error("Error discarding questions:", error);
    res.status(500).json({ error: "Failed to discard questions" });
  }
};

import axios from 'axios';
import * as cheerio from 'cheerio';

export const autoScrape = async (req, res) => {
  try {
    const { data } = await axios.get('https://old.reddit.com/r/WouldYouRather/top/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const $ = cheerio.load(data);
    const scraped = [];

    $('p.title a.title').each((i, el) => {
      let title = $(el).text().trim();
      
      // Clean up Reddit prefixes
      title = title.replace(/^wyr/i, '').replace(/^would you rather/i, 'Would you rather').trim();
      if (!title.toLowerCase().startsWith('would you rather')) return; // Skip non-WYR

      // Attempt to split options purely algorithmically
      const splitByOr = title.split(/\s+or\s+/i);
      if (splitByOr.length >= 2) {
        let opt1 = splitByOr[0].replace(/would you rather/i, '').trim();
        let opt2 = splitByOr.slice(1).join(' or ').replace(/\?/g, '').trim();
        
        // Ensure options aren't too long
        if (opt1.split(' ').length < 15 && opt2.split(' ').length < 15) {
          scraped.push({
            text: title.endsWith('?') ? title : title + '?',
            options: [opt1, opt2],
            category: "Would You Rather",
            isActive: true,
            isAIProcessed: true,
            source: "Reddit Scraper"
          });
        }
      }
    });

    if (scraped.length === 0) {
      return res.status(400).json({ error: "Failed to parse questions from Reddit." });
    }

    const curatedPath = path.join(__dirname, "..", "scripts", "data", "curated_deep_data.json");
    let existing = [];
    try {
      const fileData = await fs.readFile(curatedPath, "utf-8");
      existing = JSON.parse(fileData);
    } catch(e) { }

    // Append without exact duplicates
    const newAdditions = scraped.filter(sq => !existing.some(eq => eq.text === sq.text));
    existing.push(...newAdditions);

    await fs.writeFile(curatedPath, JSON.stringify(existing, null, 2), "utf-8");

    res.status(200).json({ success: true, count: newAdditions.length, questions: newAdditions });
  } catch (error) {
    console.error("Auto scrape error:", error);
    res.status(500).json({ error: "Failed to scrape social media." });
  }
};

export const getAIQuestions = async (req, res) => {
  try {
    const filePath = path.join(__dirname, "..", "scripts", "data", "curated_deep_data.json");
    try {
      const data = await fs.readFile(filePath, "utf-8");
      const questions = JSON.parse(data);
      // Fetch all existing texts in one fast query to avoid 3000 sequential DB calls
      const existingDBQuestions = await Question.find({}, { text: 1 }).lean();
      const existingSet = new Set(existingDBQuestions.map(q => q.text));
      
      const newQuestions = questions.filter(q => !existingSet.has(q.text)).map(q => ({
        text: q.text,
        options: q.options,
        category: q.category?.toUpperCase() || "RANDOM",
        heatLevel: 1, // Default heat level
      }));
      
      res.status(200).json({ success: true, questions: newQuestions });
    } catch (fsError) {
      // If file doesn't exist yet
      res.status(200).json({ success: true, questions: [] });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch AI questions" });
  }
};

export const removeDuplicateQuestions = async (req, res) => {
  try {
    const duplicates = await Question.aggregate([
      { $match: { isCustom: false } },
      { $group: {
          _id: { $toLower: "$text" },
          count: { $sum: 1 },
          docs: { $push: "$_id" }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    let deletedCount = 0;
    const redis = sessionStore?.redisClient;

    for (const group of duplicates) {
      // Keep the first document, delete the rest
      const idsToDelete = group.docs.slice(1);
      
      const questionsToDelete = await Question.find({ _id: { $in: idsToDelete } });
      const result = await Question.deleteMany({ _id: { $in: idsToDelete } });
      deletedCount += result.deletedCount;

      if (redis) {
        for (const q of questionsToDelete) {
          try {
            await redis.sRem(`questions:category:${q.category}`, q._id.toString());
            await redis.sRem(`questions:heat:${q.heatLevel}`, q._id.toString());
          } catch (err) {}
        }
      }
    }

    res.status(200).json({ success: true, message: `Removed ${deletedCount} duplicate questions.` });
  } catch (error) {
    console.error("Error in removeDuplicateQuestions:", error);
    res.status(500).json({ error: "Failed to remove duplicates" });
  }
};
