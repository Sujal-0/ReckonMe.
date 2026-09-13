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

    const redis = sessionStore.redisClient;
    if (redis) {
      await redis.sRem(`questions:category:${q.category}`, id);
      await redis.sRem(`questions:heat:${q.heatLevel}`, id);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete question" });
  }
};

export const getAIQuestions = async (req, res) => {
  try {
    const filePath = path.join(__dirname, "..", "scripts", "data", "ai_processed_data.json");
    try {
      const data = await fs.readFile(filePath, "utf-8");
      const questions = JSON.parse(data);
      // Format them exactly how the frontend staging area expects
      const formatted = questions.map(q => ({
        text: q.text,
        options: q.options,
        category: q.category.toUpperCase(),
        heatLevel: 1, // Default heat level
      }));
      res.status(200).json({ success: true, questions: formatted });
    } catch (fsError) {
      // If file doesn't exist yet
      res.status(200).json({ success: true, questions: [] });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch AI questions" });
  }
};
