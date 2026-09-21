import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: [v => v.length >= 2 && v.length <= 6, "Must have between 2 and 6 options"],
    },
    category: {
      type: String,
      required: true,
      uppercase: true, // e.g., LOVE, FUNNY, SPICY, DEEP, RANDOM
      trim: true,
    },
    heatLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    isCustom: {
      type: Boolean,
      default: false, // true for user-created custom banks, false for global pool
    },
    authorId: {
      type: String, // only if isCustom is true
      default: null,
    }
  },
  { timestamps: true }
);

// Indexes to speed up queries
questionSchema.index({ category: 1, heatLevel: 1, isCustom: 1 });

const Question = mongoose.model("Question", questionSchema);
export default Question;
