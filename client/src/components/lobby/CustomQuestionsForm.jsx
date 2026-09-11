import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAppStore } from "@/store";
import { apiClient } from "@/lib/api-client";
import { BulkUploadZone } from "../ui/BulkUploadZone";

export const CustomQuestionsForm = ({ initialQuestions = [], onSave, isProfileMode = false }) => {
  const { userInfo } = useAppStore();
  const [questions, setQuestions] = useState(
    initialQuestions.length > 0
      ? initialQuestions
      : [{ id: Date.now().toString(), text: "", options: ["", ""] }]
  );
  
  const [books, setBooks] = useState([]);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [savingBookName, setSavingBookName] = useState("");
  const [isSavingBook, setIsSavingBook] = useState(false);

  useEffect(() => {
    if (userInfo && !isProfileMode) {
      fetchBooks();
    }
  }, [userInfo, isProfileMode]);

  const fetchBooks = async () => {
    try {
      const { data } = await apiClient.get('/api/question-books', { withCredentials: true });
      setBooks(data);
    } catch (err) {
      console.error("Failed to load custom books", err);
    }
  };

  const loadBook = (book) => {
    const mappedQuestions = book.questions.map(q => ({
       id: q.id || Date.now().toString() + Math.random(),
       text: q.text,
       options: q.options
    }));
    setQuestions(mappedQuestions);
    setShowBookSelector(false);
    toast.success(`Loaded "${book.title}"`);
  };

  const saveAsBook = async () => {
    if (!savingBookName.trim()) return toast.error("Enter a book name");
    
    const validQuestions = questions.filter(q => q.text.trim());
    if (validQuestions.length === 0) return toast.error("Add at least one valid question");
    
    const formattedQuestions = validQuestions.map(q => {
       const opts = q.options.filter(o => o.trim());
       return {
         id: q.id,
         text: q.text,
         options: opts.length >= 2 ? opts : ["Option 1", "Option 2"]
       };
    });

    try {
      await apiClient.post('/api/question-books', {
        title: savingBookName,
        questions: formattedQuestions
      }, { withCredentials: true });
      
      toast.success("Saved to Profile!");
      setIsSavingBook(false);
      setSavingBookName("");
      if (!isProfileMode) fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save book");
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: Date.now().toString(), text: "", options: ["", ""] },
    ]);
  };

  const removeQuestion = (id) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const addOption = (questionId) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          if (q.options.length >= 6) {
            toast.error("Max 6 options allowed");
            return q;
          }
          return { ...q, options: [...q.options, ""] };
        }
        return q;
      })
    );
  };

  const updateOption = (questionId, optionIndex, value) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const removeOption = (questionId, optionIndex) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          if (q.options.length <= 2) {
            toast.error("Needs at least 2 options");
            return q;
          }
          const newOptions = q.options.filter((_, i) => i !== optionIndex);
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const handleSaveToLobby = () => {
    for (const q of questions) {
      if (!q.text.trim()) {
        return toast.error("All questions must have text");
      }
      if (q.options.some((opt) => !opt.trim())) {
        return toast.error("All options must be filled out");
      }
    }
    
    const finalizedQuestions = questions.map(q => ({
       id: q.id,
       text: q.text,
       options: q.options
    }));

    onSave(finalizedQuestions);
    toast.success(isProfileMode ? "Book settings saved!" : "Questions injected into Game Settings!");
  };

  const handleBulkUploadSuccess = (uploadedQs) => {
    const validQs = uploadedQs.map(q => ({
      id: Date.now().toString() + Math.random(),
      text: q.text,
      options: q.options
    }));
    
    if (questions.length === 1 && questions[0].text === "" && questions[0].options[0] === "") {
      setQuestions(validQs);
    } else {
      setQuestions([...questions, ...validQs]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center pr-4">
          <h3 className="text-2xl font-bold font-['IndieSellout'] tracking-widest text-white">
            {isProfileMode ? "Book Editor" : "Custom Questions"}
          </h3>
          <span className="text-[#87CEFA] font-cabana tracking-widest">{questions.length} Active</span>
        </div>
        
        {userInfo && !isProfileMode && (
          <div className="flex gap-2">
            <button 
              onClick={() => { setShowBookSelector(!showBookSelector); setIsSavingBook(false); }}
              className="flex-1 py-2 bg-white/10 text-white font-cabana text-sm uppercase tracking-widest hover:bg-white/20 transition-colors flex items-center justify-center gap-2 sketchy-shape border-2 border-[#87CEFA]"
            >
              <Download size={16} /> Load Book
            </button>
            <button 
              onClick={() => { setIsSavingBook(!isSavingBook); setShowBookSelector(false); }}
              className="flex-1 py-2 bg-white/10 text-white font-cabana text-sm uppercase tracking-widest hover:bg-white/20 transition-colors flex items-center justify-center gap-2 sketchy-shape border-2 border-[#E48F45]"
            >
              <Save size={16} /> Save as Book
            </button>
          </div>
        )}

        <AnimatePresence>
          {showBookSelector && !isProfileMode && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
               <div className="p-4 bg-black/50 sketchy-shape border-2 border-[#87CEFA] flex flex-col gap-2 mt-2">
                  <p className="text-[#87CEFA] font-cabana text-sm uppercase tracking-widest mb-2">Select a book from your Profile:</p>
                  {books.length === 0 ? (
                    <p className="text-white/50 text-sm font-cabana">No books found.</p>
                  ) : (
                    books.map(book => (
                       <button 
                         key={book._id} 
                         onClick={() => loadBook(book)}
                         className="text-left w-full p-2 bg-white/5 hover:bg-[#87CEFA]/20 border border-dashed border-white/20 font-cabana text-white transition-colors flex justify-between"
                       >
                         <span>{book.title}</span>
                         <span className="text-[#87CEFA]">{book.questions.length} Qs</span>
                       </button>
                    ))
                  )}
               </div>
            </motion.div>
          )}

          {isSavingBook && !isProfileMode && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
               <div className="p-4 bg-black/50 sketchy-shape border-2 border-[#E48F45] flex flex-col gap-2 mt-2">
                  <p className="text-[#E48F45] font-cabana text-sm uppercase tracking-widest mb-2">Save current questions to Profile:</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={savingBookName}
                      onChange={(e) => setSavingBookName(e.target.value)}
                      placeholder="Book Name..."
                      className="flex-1 bg-black/50 border border-white/30 px-3 py-2 font-cabana text-white focus:outline-none focus:border-[#E48F45]"
                    />
                    <button onClick={saveAsBook} className="px-4 py-2 bg-[#E48F45] text-black font-bold font-cabana uppercase hover:brightness-110">
                       Save
                    </button>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <BulkUploadZone onUploadSuccess={handleBulkUploadSuccess} />
      </div>

      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#4D4C7D]">
        <AnimatePresence>
          {questions.map((q, index) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-5 bg-black/60 sketchy-shape border-2 border-[#FF99CC]/50 relative flex flex-col gap-4 mt-4"
            >
              <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="absolute -top-4 -right-2 bg-rose-500 text-white p-2 rounded-full border-2 border-white shadow-[2px_2px_0px_black] hover:scale-110 z-10"
                  disabled={questions.length === 1}
                >
                  <Trash2 size={16} />
              </button>

              <div className="flex gap-3 items-start pr-4">
                <span className="text-2xl font-bold font-['IndieSellout'] text-[#FF99CC] mt-1">
                  Q{index + 1}.
                </span>
                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                  placeholder="Enter your question here..."
                  rows={2}
                  className="flex-1 px-4 py-2 bg-transparent text-white font-cabana text-xl focus:outline-none border-b-2 border-dashed border-white/30 focus:border-[#FF99CC] resize-none"
                />
              </div>

              <div className="space-y-3 pl-12 pr-4">
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex gap-2 items-center">
                    <div className="w-4 h-4 rounded-full border-2 border-[#87CEFA] flex-shrink-0" />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                      placeholder={`Option ${optIndex + 1}`}
                      className="flex-1 px-3 py-2 bg-black/40 text-white font-cabana border border-white/20 focus:border-[#87CEFA] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(q.id, optIndex)}
                      className="p-2 text-white/40 hover:text-rose-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {q.options.length < 6 && (
                   <button
                     type="button"
                     onClick={() => addOption(q.id)}
                     className="text-sm font-cabana uppercase tracking-widest text-[#87CEFA] hover:text-white transition-colors py-2"
                   >
                     + Add Option
                   </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-4 pt-4 border-t-2 border-dashed border-white/20">
        <button
          onClick={addQuestion}
          className="flex-1 py-3 font-bold font-['IndieSellout'] bg-transparent sketchy-shape border-2 border-[#87CEFA] text-[#87CEFA] text-xl transition-all hover:bg-white/10 flex items-center justify-center gap-2"
        >
          <Plus /> ADD Q
        </button>
        <button
          onClick={handleSaveToLobby}
          className="flex-1 py-3 font-bold font-['IndieSellout'] tracking-widest sketchy-shape bg-[#00E5FF] text-[#0A0A0A] text-xl transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
        >
          {isProfileMode ? "SAVE SETTINGS" : "APPLY TO ROOM"}
        </button>
      </div>
    </div>
  );
};
