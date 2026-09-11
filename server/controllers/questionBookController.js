import QuestionBook from "../models/QuestionBookModel.js";

export const getQuestionBooks = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const books = await QuestionBook.find({ userId }).sort({ updatedAt: -1 });
    res.json(books);
  } catch (error) {
    console.error("Error fetching question books:", error);
    res.status(500).json({ error: "Failed to fetch question books" });
  }
};

export const createQuestionBook = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, questions } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Check max 5 limit
    const bookCount = await QuestionBook.countDocuments({ userId });
    if (bookCount >= 5) {
      return res.status(403).json({ error: "Maximum limit of 5 Custom Question Banks reached." });
    }

    // Check duplicate title
    const existingBook = await QuestionBook.findOne({ 
       userId, 
       title: { $regex: new RegExp("^" + title.trim() + "$", "i") } 
    });
    if (existingBook) {
      return res.status(409).json({ error: "You already have a Question Bank with this name." });
    }

    // Deduplicate questions by text (case-insensitive)
    const uniqueQuestions = [];
    const seenTexts = new Set();
    if (questions && Array.isArray(questions)) {
       for (const q of questions) {
          const textLower = q.text.trim().toLowerCase();
          if (!seenTexts.has(textLower)) {
             seenTexts.add(textLower);
             uniqueQuestions.push(q);
          }
       }
    }

    const newBook = await QuestionBook.create({
      userId,
      title: title.trim(),
      questions: uniqueQuestions
    });

    res.status(201).json(newBook);
  } catch (error) {
    console.error("Error creating question book:", error);
    res.status(500).json({ error: "Failed to create question book" });
  }
};

export const updateQuestionBook = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, questions } = req.body;
    
    const book = await QuestionBook.findOne({ _id: id, userId });
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (trimmedTitle !== book.title) {
        // Check if new title conflicts
        const existingBook = await QuestionBook.findOne({ 
           userId, 
           title: { $regex: new RegExp("^" + trimmedTitle + "$", "i") } 
        });
        if (existingBook) {
          return res.status(409).json({ error: "You already have a Question Bank with this name." });
        }
        book.title = trimmedTitle;
      }
    }

    if (questions !== undefined) {
      // Deduplicate questions by text (case-insensitive)
      const uniqueQuestions = [];
      const seenTexts = new Set();
      if (Array.isArray(questions)) {
         for (const q of questions) {
            const textLower = q.text.trim().toLowerCase();
            if (!seenTexts.has(textLower)) {
               seenTexts.add(textLower);
               uniqueQuestions.push(q);
            }
         }
      }
      book.questions = uniqueQuestions;
    }
    
    await book.save();
    res.json(book);
  } catch (error) {
    console.error("Error updating question book:", error);
    res.status(500).json({ error: "Failed to update question book" });
  }
};

export const deleteQuestionBook = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deletedBook = await QuestionBook.findOneAndDelete({ _id: id, userId });
    if (!deletedBook) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json({ success: true, message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting question book:", error);
    res.status(500).json({ error: "Failed to delete question book" });
  }
};
