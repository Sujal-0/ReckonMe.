import multer from 'multer';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';
import { nanoid } from 'nanoid';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Setup multer in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadMiddleware = upload.single('file');

const parseTextContent = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const questions = [];
  let currentQ = null;

  for (const line of lines) {
    if (line.toUpperCase().startsWith('Q:')) {
      if (currentQ && currentQ.options.length >= 2) questions.push(currentQ);
      currentQ = { id: nanoid(), text: line.substring(2).trim(), options: [] };
    } else if (line.toUpperCase().startsWith('O:') && currentQ) {
      const opts = line.substring(2).split(',').map(o => o.trim()).filter(o => o.length > 0);
      currentQ.options.push(...opts);
    }
  }
  if (currentQ && currentQ.options.length >= 2) questions.push(currentQ);
  return questions;
};

export const parseQuestionsFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const buffer = req.file.buffer;
    let questions = [];

    if (ext === 'json') {
      const parsed = JSON.parse(buffer.toString('utf8'));
      if (Array.isArray(parsed)) {
        questions = parsed.map(q => ({
          id: nanoid(),
          text: q.text || q.question,
          options: q.options || []
        })).filter(q => q.text && q.options.length >= 2);
      }
    } else if (ext === 'csv') {
      const records = parse(buffer, { columns: false, skip_empty_lines: true });
      for (const row of records) {
        if (row.length >= 3) { // Question + at least 2 options
           const [text, ...options] = row;
           if (text && text.toLowerCase() !== 'question') {
             questions.push({ id: nanoid(), text: text.trim(), options: options.map(o=>o.trim()).filter(o=>o.length>0) });
           }
        }
      }
    } else if (ext === 'pdf') {
      const data = await pdfParse(buffer);
      questions = parseTextContent(data.text);
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      questions = parseTextContent(result.value);
    } else if (ext === 'txt') {
      questions = parseTextContent(buffer.toString('utf8'));
    } else {
      return res.status(400).json({ error: "Unsupported file format." });
    }

    if (questions.length === 0) {
      return res.status(400).json({ error: "No valid questions found. Please check the required format." });
    }

    res.json({ success: true, questions });
  } catch (error) {
    console.error("File parse error:", error);
    res.status(500).json({ error: "Failed to parse file. Ensure it matches the expected format." });
  }
};
