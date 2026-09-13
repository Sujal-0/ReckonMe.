const mongoose = require("mongoose");

const defaultQuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      validate: [
        (v) => v && v.length >= 2,
        "A question must have at least 2 options.",
      ],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: "Random",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      default: "system", // e.g., "reddit/r/sidemen", "manual"
    },
    isAIProcessed: {
      type: Boolean,
      default: true, // indicates it has passed through our AI layer
    },
  },
  { timestamps: true }
);

// We need an index on category to make fetching by category super fast
defaultQuestionSchema.index({ category: 1, isActive: 1 });

// We also create a text index on the question text to prevent duplicates easily
defaultQuestionSchema.index({ text: "text" });

const DefaultQuestion = mongoose.model("DefaultQuestion", defaultQuestionSchema);

module.exports = DefaultQuestion;
