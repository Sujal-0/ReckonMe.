import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { CustomQuestionsForm } from '../lobby/CustomQuestionsForm';

export const QuestionBookManager = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const { data } = await apiClient.get('/api/question-books', { withCredentials: true });
      setBooks(data);
    } catch (err) {
      toast.error('Failed to load custom books');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    if (books.length >= 5) {
      return toast.error("Maximum limit of 5 Custom Question Banks reached.");
    }
    setEditingBook({
      title: 'My Custom Deck',
      questions: [{ id: Date.now().toString(), text: '', options: ['', ''] }]
    });
  };

  const handleEdit = (book) => {
    setEditingBook({ ...book });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this custom question book?')) return;
    try {
      await apiClient.delete(`/api/question-books/${id}`, { withCredentials: true });
      setBooks(books.filter(b => b._id !== id));
      toast.success('Book deleted');
    } catch (err) {
      toast.error('Failed to delete book');
    }
  };

  const handleSaveBook = async (questions) => {
    try {
      if (editingBook._id) {
        const { data } = await apiClient.put(`/api/question-books/${editingBook._id}`, {
          title: editingBook.title,
          questions
        }, { withCredentials: true });
        setBooks(books.map(b => b._id === editingBook._id ? data : b));
        toast.success('Book updated!');
      } else {
        const { data } = await apiClient.post('/api/question-books', {
          title: editingBook.title,
          questions
        }, { withCredentials: true });
        setBooks([data, ...books]);
        toast.success('Book created!');
      }
      setEditingBook(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save book');
    }
  };

  if (loading) {
    return <div className="text-center font-cabana mt-10 text-xl text-white/50">Loading books...</div>;
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {!editingBook ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start w-full gap-4 sm:gap-0">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-['IndieSellout'] tracking-widest text-[#87CEFA]">Your Books</h2>
              <p className="font-cabana text-white/50 text-xs sm:text-sm mt-1">{books.length} / 5 Decks Created</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="px-3 sm:px-4 py-2 bg-[#E48F45] text-black font-['IndieSellout'] text-base sm:text-xl tracking-widest sketchy-shape shadow-[3px_3px_0px_white] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_white] transition-all flex items-center gap-1 sm:gap-2"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Create New
            </button>
          </div>

          {books.length === 0 ? (
            <div className="w-full text-center p-6 sm:p-12 border-2 border-dashed border-white/20 bg-white/5 font-cabana text-white/50 text-sm sm:text-xl sketchy-shape">
              You haven't created any custom question books yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {books.map(book => (
                <div key={book._id} className="border-4 border-white/20 bg-black/60 sketchy-shape shadow-[4px_4px_0px_rgba(255,255,255,0.1)] sm:shadow-[6px_6px_0px_rgba(255,255,255,0.1)] p-3 sm:p-4 flex flex-col transition-all">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer gap-2 sm:gap-0" onClick={() => setExpandedId(expandedId === book._id ? null : book._id)}>
                    <div className="w-full sm:w-auto">
                      <h3 className="text-lg sm:text-2xl font-bold font-['IndieSellout'] tracking-wider text-white break-words pr-2">{book.title}</h3>
                      <p className="font-cabana text-[#87CEFA] text-xs sm:text-base">{book.questions.length} Questions</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 border-t border-white/10 sm:border-0 pt-2 sm:pt-0">
                      <div className="flex gap-4">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(book); }} className="text-[#00E5FF] hover:scale-110 transition-transform">
                          <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(book._id); }} className="text-rose-500 hover:scale-110 transition-transform">
                          <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                      </div>
                      <div className="text-white/50">
                        {expandedId === book._id ? <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6" /> : <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />}
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedId === book._id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-4 pt-4 border-t-2 border-dashed border-white/20 flex flex-col gap-3"
                      >
                        {book.questions.map((q, idx) => (
                          <div key={idx} className="bg-black/50 p-4 font-cabana border border-white/10 sketchy-shape">
                            <p className="font-bold text-[#E48F45] mb-2">{idx + 1}. {q.text}</p>
                            <div className="flex flex-wrap gap-2 pl-4">
                              {q.options.map((opt, i) => (
                                <span key={i} className="px-3 py-1 bg-white/5 border border-dashed border-white/20 text-sm text-white/80">{opt}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-4 border-white/30 bg-black/80 p-4 sm:p-6 flex flex-col gap-6 shadow-[4px_4px_0px_rgba(255,255,255,0.2)] sm:shadow-[8px_8px_0px_rgba(255,255,255,0.2)] sketchy-shape"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-dashed border-white/20 pb-4 gap-4 sm:gap-0">
            <input
              type="text"
              value={editingBook.title}
              onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
              className="bg-transparent border-b-2 border-white/50 text-xl sm:text-3xl font-['IndieSellout'] tracking-widest px-2 py-1 focus:outline-none focus:border-[#E48F45] w-full max-w-sm text-white"
              placeholder="Book Title..."
            />
            <button onClick={() => setEditingBook(null)} className="w-full sm:w-auto px-4 py-2 border-2 border-white bg-rose-500 text-white font-['IndieSellout'] tracking-widest shadow-[3px_3px_0px_white] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none flex items-center justify-center gap-2 sketchy-shape text-sm sm:text-base">
              Close Editor
            </button>
          </div>

          <CustomQuestionsForm 
            initialQuestions={editingBook.questions} 
            onSave={handleSaveBook} 
            isProfileMode={true} 
          />
        </motion.div>
      )}
    </div>
  );
};
