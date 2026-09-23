import { useState, useRef, useEffect } from "react";
import { ShieldAlert, Trash2, Edit3, ArrowLeft, Save, Trash, ArrowDownAZ, ArrowDown10, Database, Globe } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { ReckonLoader } from "@/components/ui/ReckonLoader";
import { BulkUploadZone } from "@/components/ui/BulkUploadZone";

export const AdminDashboard = () => {
  const [secret, setSecret] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState("dashboard"); // "dashboard" | "edit" | "live"
  
  // Staging state
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem("reckon_pending_questions");
    return saved ? JSON.parse(saved) : [];
  });

  // Live DB state
  const [liveQuestions, setLiveQuestions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetchingLive, setIsFetchingLive] = useState(false);

  // Bulk and Filter state
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [filterCategory, setFilterCategory] = useState("ALL");

  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [sortMethod, setSortMethod] = useState("count"); // "count" | "alpha"
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("reckon_pending_questions", JSON.stringify(questions));
  }, [questions]);

  // Reset selections when switching views or changing filter
  useEffect(() => {
    setSelectedQuestions([]);
  }, [view, filterCategory]);

  useEffect(() => {
    if (isAuthenticated && view === "dashboard") {
      fetchStats();
    } else if (isAuthenticated && view === "live") {
      fetchLiveQuestions();
    }
  }, [isAuthenticated, view, page, filterCategory]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get("/api/admin/stats", {
        headers: { "x-admin-secret": secret }
      });
      setStats(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setIsAuthenticated(false);
        toast.error("Session expired or invalid secret");
      }
    }
  };

  const fetchLiveQuestions = async () => {
    setIsFetchingLive(true);
    try {
      const categoryQuery = filterCategory !== "ALL" ? `&category=${encodeURIComponent(filterCategory)}` : "";
      const res = await apiClient.get(`/api/admin/questions?page=${page}&limit=20${categoryQuery}`, {
        headers: { "x-admin-secret": secret }
      });
      setLiveQuestions(res.data.questions);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error("Failed to fetch live database");
    } finally {
      setIsFetchingLive(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!secret) return toast.error("Enter the admin secret");
    setIsAuthenticated(true);
  };

  const handleBulkUploadSuccess = (uploadedQs) => {
    const formatted = uploadedQs.map(q => ({
      ...q,
      category: q.category || "GENERAL",
      heatLevel: q.heatLevel || 1
    }));
    setQuestions(prev => [...prev, ...formatted]);
    toast.success(`Loaded ${formatted.length} questions into staging.`);
  };

  const handleDiscardStagingQuestion = async (index, question) => {
    if (!confirm("Discard this question from staging?")) return;
    setQuestions(questions.filter((_, i) => i !== index));
    toast.success("Question discarded from staging!");
  };

  const handleUploadToDB = async () => {
    if (questions.length === 0) return toast.error("No questions to upload");
    setIsUploading(true);
    try {
      const res = await apiClient.post("/api/admin/upload-questions", { questions }, {
        headers: { "x-admin-secret": secret }
      });
      toast.success(res.data.message);
      setQuestions([]); 
      localStorage.removeItem("reckon_pending_questions");
      setView("dashboard");
      fetchStats(); 
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to upload to DB");
    } finally {
      setIsUploading(false);
    }
  };

  const clearStaging = () => {
    if (confirm("Are you sure you want to delete all staging questions?")) {
      setQuestions([]);
      localStorage.removeItem("reckon_pending_questions");
      toast.success("Staging area cleared");
    }
  };

  const handleFetchAIQuestions = async () => {
    try {
      const res = await apiClient.get("/api/admin/ai-questions", {
        headers: { "x-admin-secret": secret }
      });
      if (res.data.questions && res.data.questions.length > 0) {
        setQuestions(prev => [...prev, ...res.data.questions]);
        toast.success(`Loaded ${res.data.questions.length} AI-processed questions into staging.`);
      } else {
        toast.info("No AI questions found in the data file.");
      }
    } catch (err) {
      toast.error("Failed to fetch AI questions");
    }
  };

  // Live Database Actions
  const handleUpdateLiveQuestion = async (id, updatedData) => {
    try {
      await apiClient.put(`/api/admin/questions/${id}`, updatedData, {
        headers: { "x-admin-secret": secret }
      });
      toast.success("Question updated globally");
    } catch (err) {
      toast.error("Failed to update question");
    }
  };

  const handleDeleteLiveQuestion = async (id) => {
    if (!confirm("Delete this question forever?")) return;
    try {
      await apiClient.delete(`/api/admin/questions/${id}`, {
        headers: { "x-admin-secret": secret }
      });
      toast.success("Question deleted");
      // Optimistic update to preserve scroll
      setLiveQuestions(prev => prev.filter(q => q._id !== id));
    } catch (err) {
      toast.error("Failed to delete question");
    }
  };

  // Bulk Actions
  const handleBulkDeleteLive = async () => {
    if (!confirm(`Delete ${selectedQuestions.length} live questions forever?`)) return;
    try {
      await apiClient.post("/api/admin/questions/bulk-delete", { ids: selectedQuestions }, {
        headers: { "x-admin-secret": secret }
      });
      toast.success("Bulk delete successful");
      setLiveQuestions(prev => prev.filter(q => !selectedQuestions.includes(q._id)));
      setSelectedQuestions([]);
    } catch (err) {
      toast.error("Failed to bulk delete");
    }
  };

  const handleBulkDiscardStaging = () => {
    if (!confirm(`Discard ${selectedQuestions.length} staging questions?`)) return;
    setQuestions(prev => prev.filter((_, i) => !selectedQuestions.includes(i)));
    setSelectedQuestions([]);
    toast.success("Bulk discard successful");
  };

  // Sorting Logic for Stats
  const getSortedCategories = () => {
    if (!stats?.categories) return [];
    return [...stats.categories].sort((a, b) => {
      if (sortMethod === "count") return b.count - a.count;
      return a.category.localeCompare(b.category);
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 sm:p-6 text-white font-['IndieSellout']">
        <form onSubmit={handleLogin} className="w-full max-w-md p-6 sm:p-8 border-4 border-white/20 cartoon-dashed-border bg-black/50 rounded-none flex flex-col gap-4 sm:gap-6 shadow-[4px_4px_0px_rgba(255,255,255,0.1)] sm:shadow-[8px_8px_0px_rgba(255,255,255,0.1)]">
          <div className="flex flex-col items-center gap-2">
            <ShieldAlert className="w-12 h-12 sm:w-16 sm:h-16 text-[#00E5FF] mb-2" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-widest text-[#00E5FF] text-center">ADMIN LOGIN</h1>
            <p className="text-white/50 text-lg sm:text-xl text-center">Enter Master Credentials</p>
          </div>
          <input 
            type="password" 
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="ENTER SECRET"
            className="w-full px-4 py-3 sm:py-4 bg-black/40 border-2 border-white/20 text-xl sm:text-2xl font-bold focus:outline-none focus:border-[#00E5FF] transition-colors uppercase placeholder:text-white/30 text-center tracking-widest"
          />
          <button type="submit" className="w-full p-3 sm:p-4 font-bold bg-[#00E5FF] text-black text-xl sm:text-2xl tracking-widest transition-all shadow-[4px_4px_0px_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
            AUTHORIZE
          </button>
        </form>
      </div>
    );
  }

  // REUSABLE TABLE COMPONENT FOR STAGING AND LIVE
  const renderTable = (data, isLive) => {
    if (data.length === 0 && !isFetchingLive) {
      return <div className="p-12 text-center text-white/50 text-2xl">No questions found for this category.</div>;
    }

    return (
      <div className="flex-1 overflow-auto relative">
        {selectedQuestions.length > 0 && (
          <div className="sticky top-0 z-20 flex items-center justify-between p-4 bg-rose-500/90 backdrop-blur border-b-4 border-rose-500/50 mb-4 shadow-[4px_4px_0px_rgba(244,63,94,0.5)]">
            <span className="font-bold text-xl sm:text-2xl text-white">{selectedQuestions.length} ITEMS SELECTED</span>
            <button 
              onClick={isLive ? handleBulkDeleteLive : handleBulkDiscardStaging}
              className="px-4 sm:px-6 py-2 bg-black text-rose-500 font-bold tracking-widest border-2 border-rose-500 hover:bg-rose-500 hover:text-white transition-colors shadow-[2px_2px_0px_black] uppercase"
            >
              BULK DELETE
            </button>
          </div>
        )}

        <div className="w-full min-w-[1000px] border-4 border-white/20 bg-black/40 rounded-none shadow-[8px_8px_0px_rgba(255,255,255,0.05)]">
          <div className="grid grid-cols-12 gap-4 p-4 border-b-4 border-dashed border-white/20 bg-white/5 font-bold text-[#00E5FF] tracking-wider text-xl items-center">
            <div className="col-span-1 text-center flex items-center justify-center gap-2">
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-rose-500 cursor-pointer"
                checked={data.length > 0 && selectedQuestions.length === data.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedQuestions(data.map((q, i) => isLive ? q._id : i));
                  } else {
                    setSelectedQuestions([]);
                  }
                }}
              />
              #
            </div>
            <div className="col-span-4">QUESTION TEXT</div>
            <div className="col-span-4">OPTIONS</div>
            <div className="col-span-2">META</div>
            <div className="col-span-1 text-center">ACTION</div>
          </div>
          
          <div className="divide-y-2 divide-white/10">
            {data.map((q, qIndex) => {
              const rowId = isLive ? q._id : qIndex;
              const isSelected = selectedQuestions.includes(rowId);
              return (
                <div key={rowId} className={`grid grid-cols-12 gap-4 p-4 items-start transition-colors ${isSelected ? 'bg-rose-500/10' : 'hover:bg-white/5'}`}>
                  <div className="col-span-1 flex items-center justify-center pt-2 gap-3">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-rose-500 cursor-pointer mt-1"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestions(prev => [...prev, rowId]);
                        } else {
                          setSelectedQuestions(prev => prev.filter(item => item !== rowId));
                        }
                      }}
                    />
                    <span className="text-2xl font-bold text-white/30">{isLive ? (page - 1) * 20 + qIndex + 1 : qIndex + 1}</span>
                  </div>
                  
                  <div className="col-span-4">
                    <textarea 
                      value={q.text}
                      onChange={(e) => {
                        if (!isLive) {
                          const updated = [...questions];
                          updated[qIndex].text = e.target.value;
                          setQuestions(updated);
                        } else {
                          const updated = [...liveQuestions];
                          updated[qIndex].text = e.target.value;
                          setLiveQuestions(updated);
                        }
                      }}
                      className="w-full bg-black/40 border-2 border-white/20 p-2 text-lg focus:border-[#87CEFA] focus:outline-none min-h-[80px] resize-y font-cabana"
                    />
                  </div>
                  
                  <div className="col-span-4 space-y-2">
                    {q.options?.map((opt, oIndex) => (
                      <input 
                        key={oIndex}
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          if (!isLive) {
                            const updated = [...questions];
                            updated[qIndex].options[oIndex] = e.target.value;
                            setQuestions(updated);
                          } else {
                            const updated = [...liveQuestions];
                            updated[qIndex].options[oIndex] = e.target.value;
                            setLiveQuestions(updated);
                          }
                        }}
                        className="w-full bg-black/40 border-2 border-white/20 p-2 focus:border-[#87CEFA] focus:outline-none font-cabana"
                      />
                    ))}
                  </div>
                  
                  <div className="col-span-2 space-y-4">
                    <input 
                      type="text"
                      value={q.category}
                      onChange={(e) => {
                        if (!isLive) {
                          const updated = [...questions];
                          updated[qIndex].category = e.target.value.toUpperCase();
                          setQuestions(updated);
                        } else {
                          const updated = [...liveQuestions];
                          updated[qIndex].category = e.target.value.toUpperCase();
                          setLiveQuestions(updated);
                        }
                      }}
                      className="w-full bg-black/40 border-2 border-white/20 p-2 focus:border-[#87CEFA] focus:outline-none text-[#E48F45] uppercase text-sm font-cabana tracking-wide"
                    />
                    <input 
                      type="number"
                      min="1" max="5"
                      value={q.heatLevel}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        if (!isLive) {
                          const updated = [...questions];
                          updated[qIndex].heatLevel = val;
                          setQuestions(updated);
                        } else {
                          const updated = [...liveQuestions];
                          updated[qIndex].heatLevel = val;
                          setLiveQuestions(updated);
                        }
                      }}
                      className="w-full bg-black/40 border-2 border-white/20 p-2 focus:border-[#87CEFA] focus:outline-none text-rose-400"
                    />
                  </div>
                  
                  <div className="col-span-1 flex flex-col items-center justify-center gap-2 pt-2">
                    {isLive && (
                      <button 
                        onClick={() => handleUpdateLiveQuestion(q._id, q)}
                        className="p-3 bg-[#00E5FF]/20 border-2 border-[#00E5FF]/50 hover:bg-[#00E5FF]/40 transition-all shadow-[2px_2px_0px_rgba(0,229,255,0.5)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                        title="Save Changes"
                      >
                        <img src="/save.png" alt="Save" className="w-5 h-5 object-contain drop-shadow-[0_0_4px_rgba(0,229,255,0.8)]" />
                      </button>
                    )}
                    <button 
                      onClick={() => isLive ? handleDeleteLiveQuestion(q._id) : handleDiscardStagingQuestion(qIndex, q)}
                      className="p-3 bg-rose-500/20 border-2 border-rose-500/50 hover:bg-rose-500/40 transition-all shadow-[2px_2px_0px_rgba(244,63,94,0.5)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                      title="Delete Question"
                    >
                      <img src="/delete.png" alt="Delete" className="w-5 h-5 object-contain drop-shadow-[0_0_4px_rgba(244,63,94,0.8)]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const getFilteredStagingData = () => {
    if (filterCategory === "ALL") return questions;
    return questions.filter(q => q.category && q.category.toUpperCase() === filterCategory.toUpperCase());
  };

  if (view === "edit" || view === "live") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 font-['IndieSellout'] flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b-4 border-dashed border-white/20 shrink-0 gap-4 sm:gap-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={() => setView("dashboard")}
              className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 border-2 border-white/20 transition-all shadow-[2px_2px_0px_white] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-[#00E5FF] tracking-widest break-words leading-tight">
                {view === "edit" ? "EDIT STAGING DATA" : "LIVE DATABASE VIEW"}
              </h1>
              <p className="text-white/50 text-xs sm:text-lg">
                {view === "edit" ? `${getFilteredStagingData().length} questions in staging` : `Page ${page} of ${totalPages}`}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 w-full sm:w-auto items-center">
            
            <select 
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="bg-black/80 border-2 border-[#E48F45] text-[#E48F45] p-2 sm:p-3 font-bold uppercase tracking-widest focus:outline-none shadow-[4px_4px_0px_rgba(228,143,69,0.2)]"
            >
              <option value="ALL">ALL CATEGORIES</option>
              <option value="Would You Rather">WOULD YOU RATHER</option>
              <option value="Most Likely To">MOST LIKELY TO</option>
              <option value="Never Have I Ever">NEVER HAVE I EVER</option>
              <option value="Hot Takes">HOT TAKES</option>
              <option value="This or That">THIS OR THAT</option>
              <option value="Truth or Dare">TRUTH OR DARE</option>
              <option value="GENERAL">GENERAL</option>
              <option value="18+">18+ (ADULTS ONLY)</option>
            </select>

            {view === "live" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border-2 border-white/20 bg-white/5 disabled:opacity-50 text-xs sm:text-base font-bold"
                >PREV</button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border-2 border-white/20 bg-white/5 disabled:opacity-50 text-xs sm:text-base font-bold"
                >NEXT</button>
              </div>
            )}
            {view === "edit" && (
              <button 
                onClick={handleUploadToDB}
                disabled={isUploading || questions.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 font-bold bg-[#00E5FF] text-black text-sm sm:text-xl transition-all shadow-[4px_4px_0px_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50"
              >
                <Save className="w-4 h-4 sm:w-6 sm:h-6" />
                {isUploading ? "COMMITTING..." : "COMMIT ALL TO DB"}
              </button>
            )}
          </div>
        </div>
        
        {isFetchingLive ? (
           <div className="flex justify-center p-12"><ReckonLoader /></div>
        ) : (
           renderTable(view === "live" ? liveQuestions : getFilteredStagingData(), view === "live")
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 font-['IndieSellout'] flex flex-col">
      <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b-4 border-white/10 border-dashed gap-4 md:gap-0">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold text-[#87CEFA] tracking-widest mb-1 sm:mb-2 leading-tight">RECKONME! CONTROL CENTER</h1>
            <p className="text-[#00E5FF] text-base sm:text-xl tracking-wider font-cabana">Manage the Global Question Database</p>
          </div>
          <button 
            onClick={() => setIsAuthenticated(false)} 
            className="w-full md:w-auto px-4 sm:px-6 py-2 sm:py-3 font-bold bg-transparent text-white border-2 border-white/20 transition-all shadow-[4px_4px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] uppercase tracking-widest hover:border-rose-500 hover:text-rose-500 text-sm sm:text-base"
          >
            LOG OUT
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Panel */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            <div className="p-8 border-4 border-white/20 bg-black/40 rounded-none shadow-[6px_6px_0px_rgba(255,255,255,0.1)]">
              <div className="flex items-center justify-between mb-6 border-b-2 border-white/10 pb-4">
                <h2 className="text-3xl font-bold text-[#00E5FF] uppercase tracking-wider">STATS</h2>
                <button 
                  onClick={() => setSortMethod(s => s === "count" ? "alpha" : "count")}
                  className="p-2 bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                  title={`Sort by ${sortMethod === 'count' ? 'Alphabetical' : 'Count'}`}
                >
                  {sortMethod === "count" ? <ArrowDown10 size={20}/> : <ArrowDownAZ size={20}/>}
                </button>
              </div>
              
              {stats ? (
                <div className="space-y-6">
                  <div className="flex items-end justify-between border-b-2 border-dashed border-white/10 pb-4">
                    <span className="text-white/70 text-xl uppercase">Total Pool</span>
                    <span className="font-bold text-4xl text-[#87CEFA]">{stats.total}</span>
                  </div>
                  <div className="pt-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-3">
                      {getSortedCategories().map(c => (
                        <div key={c.category} className="flex justify-between items-center text-lg bg-white/5 p-2 border border-white/10">
                          <span className="text-[#E48F45] tracking-wider">{c.category}</span>
                          <span className="font-bold font-cabana">{c.count}</span>
                        </div>
                      ))}
                      {(!stats.categories || stats.categories.length === 0) && (
                        <p className="text-white/30 italic text-sm">No categories found.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center p-8"><ReckonLoader /></div>
              )}
            </div>

            {/* Manage DB Button */}
            <div className="space-y-4">
              <button 
                onClick={() => setView("live")}
                className="w-full flex items-center justify-center gap-3 p-6 font-bold bg-transparent text-[#00E5FF] border-4 border-[#00E5FF] text-2xl tracking-widest transition-all shadow-[6px_6px_0px_rgba(0,229,255,0.2)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px]"
              >
                <Database size={28} />
                MANAGE LIVE DATABASE
              </button>
              
              <button 
                onClick={async () => {
                  if(!confirm("Scan and delete duplicate questions across the entire database? This cannot be undone.")) return;
                  try {
                    const res = await apiClient.post("/api/admin/questions/remove-duplicates", {}, { headers: { "x-admin-secret": secret } });
                    toast.success(res.data.message);
                    fetchStats();
                    if (view === "live") fetchLiveQuestions();
                  } catch(err) {
                    toast.error("Failed to clean duplicates");
                  }
                }}
                className="w-full flex items-center justify-center gap-3 p-6 font-bold bg-transparent text-rose-500 border-4 border-rose-500 text-xl tracking-widest transition-all shadow-[6px_6px_0px_rgba(244,63,94,0.2)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px]"
              >
                <Trash2 size={28} />
                SCAN & CLEAN DUPLICATES
              </button>
            </div>
          </div>

          {/* Upload & Staging Panel */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Upload Box */}
            <BulkUploadZone onUploadSuccess={handleBulkUploadSuccess} />
            
            {/* Pull AI Batch Button */}
            <button 
              onClick={handleFetchAIQuestions}
              className="w-full flex items-center justify-center gap-3 p-6 font-bold bg-[#E48F45]/10 text-[#E48F45] border-4 border-[#E48F45] text-2xl tracking-widest transition-all shadow-[6px_6px_0px_rgba(228,143,69,0.2)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px]"
            >
              <Database size={28} />
              PULL AI-PROCESSED BATCH
            </button>

            {/* Pending Questions Overview */}
            {questions.length > 0 && (
              <div className="p-8 border-4 border-[#00E5FF] bg-black/40 shadow-[8px_8px_0px_rgba(0,229,255,0.2)]">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b-2 border-dashed border-white/20 pb-6 gap-4 xl:gap-0">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-[#00E5FF] tracking-widest mb-1">STAGING AREA</h3>
                    <p className="text-white/60 text-sm sm:text-lg">{questions.length} questions ready to review</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-4 w-full xl:w-auto">
                    <button 
                      onClick={clearStaging}
                      className="p-2 sm:p-3 bg-rose-500/20 border-2 border-rose-500/50 hover:bg-rose-500/40 transition-all shadow-[4px_4px_0px_rgba(244,63,94,0.5)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
                      title="Clear Staging"
                    >
                      <img src="/delete.png" alt="Delete" className="w-5 h-5 sm:w-6 h-6 object-contain drop-shadow-[0_0_4px_rgba(244,63,94,0.8)]" />
                    </button>
                    <button 
                      onClick={() => setView("edit")}
                      className="flex-1 xl:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 font-bold bg-[#87CEFA] text-black text-xs sm:text-xl transition-all shadow-[4px_4px_0px_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] uppercase"
                    >
                      <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                      FULL VIEW / EDIT
                    </button>
                    <button 
                      onClick={handleUploadToDB}
                      disabled={isUploading}
                      className="flex-1 xl:flex-none px-3 sm:px-6 py-2 sm:py-3 font-bold bg-[#00E5FF] text-black text-xs sm:text-xl transition-all shadow-[4px_4px_0px_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50 uppercase text-center"
                    >
                      {isUploading ? "INJECTING..." : "COMMIT TO DB"}
                    </button>
                  </div>
                </div>
                
                {/* Visual Cards for Preview */}
                <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {questions.slice(0, 10).map((q, i) => (
                    <div key={i} className="flex flex-col md:flex-row md:items-center gap-4 bg-white/5 border-2 border-white/10 p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
                      <div className="flex gap-2 shrink-0">
                        <span className="px-3 py-1 bg-[#E48F45] text-black font-bold text-sm tracking-widest uppercase font-cabana">{q.category}</span>
                        <span className="px-3 py-1 bg-rose-500 text-white font-bold text-sm tracking-widest uppercase">HEAT: {q.heatLevel}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-xl mb-2 font-cabana tracking-wide">{q.text}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options?.map((opt, oIdx) => (
                            <span key={oIdx} className="px-2 py-1 border border-white/20 text-white/60 text-xs bg-black/50 font-cabana tracking-wide">
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {questions.length > 10 && (
                    <div className="text-center p-4 border-2 border-dashed border-white/20 text-white/50 text-xl">
                      + {questions.length - 10} more questions (Click Full View to see all)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
