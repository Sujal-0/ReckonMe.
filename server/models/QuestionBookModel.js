import mongoose from "mongoose";

const customQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  options: { 
    type: [String], 
    required: true, 
    validate: v => v.length >= 2 
  }
});

const questionBookSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  questions: {
    type: [customQuestionSchema],
    default: []
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

questionBookSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const QuestionBook = mongoose.model("QuestionBook", questionBookSchema);

export default QuestionBook;
