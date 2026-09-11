import { Highlighter } from "@/components/magicui/highlighter";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/store";
import { LOGOUT_ROUTE, HISTORY_ROUTE } from "@/utils/constants";
import { ChevronLeft, ChevronDown, ChevronUp, Dices } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { animationDefaultOptions } from "@/lib/utils";
import Lottie from "react-lottie";
import { ReckonLoader } from "@/components/ui/ReckonLoader";
import { motion, AnimatePresence } from "framer-motion";
import { QuestionBookManager } from "@/components/profile/QuestionBookManager";

const Profile = () => {
  const navigate = useNavigate();
  const { userInfo, setUserInfo } = useAppStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("HISTORY"); // 'HISTORY' or 'BOOKS'
  const [expandedMatch, setExpandedMatch] = useState(null);

  // Avatar Management
  const [avatarSeed, setAvatarSeed] = useState(userInfo?.avatarSeed || userInfo?.username || "default");
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  useEffect(() => {
    fetchHistory();
    if (userInfo && userInfo.avatarSeed) {
       setAvatarSeed(userInfo.avatarSeed);
    }
  }, [userInfo]);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get(HISTORY_ROUTE, { withCredentials: true });
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate("/");
  };

  const logOut = async () => {
    try {
      const response = await apiClient.post(LOGOUT_ROUTE, {}, { withCredentials: true });
      if (response.status === 200) {
        setUserInfo(null);
        navigate("/");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const shuffleAvatar = async () => {
     if (isUpdatingAvatar) return;
     setIsUpdatingAvatar(true);
     const newSeed = Math.random().toString(36).substring(7);
     setAvatarSeed(newSeed);
     try {
       const res = await apiClient.post("/api/auth/update-avatar", { avatarSeed: newSeed }, { withCredentials: true });
       if (res.data) {
          setUserInfo(res.data);
       }
     } catch (err) {
       console.error("Failed to save avatar", err);
     } finally {
       setIsUpdatingAvatar(false);
     }
  };

  return (
    <div className="w-full h-full min-h-screen text-white bg-transparent">
      <div className="flex flex-col h-full">
        {/* Transparent Navbar */}
        <nav className="w-full px-4 md:px-8 pt-6 pb-2">
          <div className="grid items-center w-full grid-cols-2 md:grid-cols-3">
            {/* Left Side - Logo */}
            <div className="h-14 w-14 sm:w-18 sm:h-18">
              <img src="/RMeLogo.png" alt="ReckonMe!" className="w-full h-auto object-contain cursor-pointer" onClick={() => navigate("/")} />
            </div>

            {/* Middle Side - Username (Hidden on small screens, shown on md) */}
            <div className="hidden md:flex flex-col justify-center items-center text-center">
              <h2 className="text-2xl font-cabana text-white/70">Welcome back,</h2>
              <div className="text-4xl font-semibold mt-1">
                <Highlighter action="highlight" color="#87CEFA">
                  @{userInfo?.username}
                </Highlighter>
              </div>
            </div>

            {/* Right Side - Buttons */}
            <div className="flex justify-end gap-2 md:gap-4">
              <button
                className="px-4 py-2 text-sm md:text-xl font-bold tracking-wider bg-[#0A0A0A] text-[#ffffff] border-2 border-white/20 transition-all shadow-[2px_2px_0px_white] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] flex items-center gap-1 md:gap-2 group"
                onClick={handleGoBack}
              >
                <ChevronLeft className="transition-transform duration-300 group-hover:-translate-x-1" size={18} />
                <span className="hidden sm:inline font-cabana">Back</span>
              </button>
              <button
                className="px-4 py-2 font-bold bg-rose-900 text-white border-2 border-rose-500 text-sm md:text-xl transition-all shadow-[2px_2px_0px_white] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-cabana"
                onClick={logOut}
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Welcome (visible only on small screens) */}
        <div className="flex md:hidden flex-col justify-center items-center text-center mt-6 px-4">
           <h2 className="text-xl font-cabana text-white/70">Welcome back,</h2>
           <div className="text-3xl font-semibold mt-1">
             <Highlighter action="highlight" color="#87CEFA">
               @{userInfo?.username}
             </Highlighter>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row w-full max-w-7xl mx-auto mt-8 px-4 gap-8 pb-12">
           
           {/* Left Sidebar: Avatar & Tabs */}
           <div className="w-full lg:w-1/3 flex flex-col gap-6">
              
              {/* Avatar Box */}
              <div className="w-full bg-transparent p-6 flex flex-col items-center justify-center">
                <div className="relative group flex items-center justify-center">
                  <div className="w-40 h-40 flex items-center justify-center">
                     <img 
                        src={`https://api.dicebear.com/7.x/croodles/svg?seed=${avatarSeed}&backgroundColor=transparent`} 
                        alt="avatar" 
                        className="w-full h-full object-contain"
                     />
                  </div>
                  <button 
                    onClick={shuffleAvatar}
                    disabled={isUpdatingAvatar}
                    title="Randomize Avatar"
                    className="absolute bottom-2 right-2 p-3 bg-[#4D4C7D] text-white rounded-full shadow-[2px_2px_0px_black] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    <Dices size={24} />
                  </button>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex flex-row lg:flex-col gap-2 sm:gap-4">
                 <button 
                   onClick={() => setActiveTab('HISTORY')}
                   className={`flex-1 lg:w-full p-2 sm:py-4 sm:px-6 font-['IndieSellout'] text-sm sm:text-xl lg:text-2xl tracking-widest text-center lg:text-left border-4 transition-all ${activeTab === 'HISTORY' ? 'bg-[#E48F45] text-black border-[#E48F45] shadow-[4px_4px_0px_white]' : 'bg-black text-white/50 border-white/20 hover:border-white hover:text-white'}`}
                 >
                   MATCH HISTORY
                 </button>
                 <button 
                   onClick={() => setActiveTab('BOOKS')}
                   className={`flex-1 lg:w-full p-2 sm:py-4 sm:px-6 font-['IndieSellout'] text-sm sm:text-xl lg:text-2xl tracking-widest text-center lg:text-left border-4 transition-all ${activeTab === 'BOOKS' ? 'bg-[#00E5FF] text-black border-[#00E5FF] shadow-[4px_4px_0px_white]' : 'bg-black text-white/50 border-white/20 hover:border-white hover:text-white'}`}
                 >
                   CUSTOM BOOKS
                 </button>
              </div>
           </div>

           {/* Right Content Area */}
           <div className="w-full lg:w-2/3">
              {activeTab === 'HISTORY' ? (
                 <div className="flex flex-col w-full">
                    <h3 className="text-3xl sm:text-4xl font-['IndieSellout'] text-[#E48F45] tracking-widest uppercase mb-4 sm:mb-6 drop-shadow-md text-center lg:text-left">
                      Match History
                    </h3>
                    
                    {loading ? (
                      <div className="py-10"><ReckonLoader text="Loading matches..." /></div>
                    ) : history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-10 border-4 border-dashed border-white/20">
                         <Lottie
                           isClickToPauseDisabled={true}
                           height={200}
                           width={200}
                           options={animationDefaultOptions}
                         />
                         <p className="mt-4 text-lg sm:text-2xl font-cabana text-white/50 tracking-widest text-center">
                           NO MATCHES PLAYED YET...
                         </p>
                      </div>
                    ) : (
                      <div className="w-full space-y-4">
                        {history.map((match) => {
                           const isTie = match.winnerId === 'tie';
                           const userPlayer = match.players.find(p => p.userId === userInfo?.id);
                           const isWinner = !isTie && match.winnerId === userPlayer?.id;
                           const opponent = match.players.find(p => p.id !== userPlayer?.id);

                           return (
                             <div key={match._id} className="w-full border-4 border-white/40 bg-[#1a1a1a] p-1 flex flex-col shadow-[4px_4px_0px_rgba(255,255,255,0.2)]">
                                <div 
                                  className="w-full p-4 flex flex-col sm:flex-row justify-between items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                                  onClick={() => setExpandedMatch(expandedMatch === match._id ? null : match._id)}
                                >
                                   <div className="flex flex-col items-center sm:items-start w-full sm:w-1/3">
                                     <div className="text-xs sm:text-sm text-white/50 font-cabana uppercase">
                                        {new Date(match.playedAt).toLocaleDateString()}
                                     </div>
                                     <div className="text-lg sm:text-2xl font-bold text-white font-['IndieSellout'] tracking-widest mt-1">
                                        {userPlayer?.name || "You"} <span className="text-[#87CEFA] mx-1">vs</span> {opponent?.name || "Unknown"}
                                     </div>
                                  </div>

                                  <div className="text-2xl sm:text-3xl font-black text-[#E48F45] tracking-tighter w-full sm:w-1/3 text-center">
                                     {userPlayer?.score || 0} - {opponent?.score || 0}
                                  </div>

                                  <div className="flex items-center justify-end gap-4 w-full sm:w-1/3">
                                     <div className={`px-2 sm:px-4 py-1 text-base sm:text-xl font-bold font-['IndieSellout'] tracking-widest border-2 shadow-[2px_2px_0px_black] ${
                                       isWinner ? 'bg-green-500 text-white border-green-700' : 
                                       isTie ? 'bg-yellow-500 text-white border-yellow-700' : 
                                       'bg-rose-500 text-white border-rose-700'
                                     }`}>
                                       {isWinner ? 'VICTORY' : isTie ? 'TIE' : 'DEFEAT'}
                                     </div>
                                     <div className="text-white/50">
                                       {expandedMatch === match._id ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                                     </div>
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {expandedMatch === match._id && (
                                     <motion.div
                                       initial={{ height: 0, opacity: 0 }}
                                       animate={{ height: "auto", opacity: 1 }}
                                       exit={{ height: 0, opacity: 0 }}
                                       className="overflow-hidden border-t-2 border-dashed border-white/20 bg-black/40"
                                     >
                                         <div className="p-4 sm:p-6 flex flex-col md:flex-row justify-around gap-4 sm:gap-6">
                                           <div className="text-center font-cabana">
                                              <p className="text-white/50 mb-1 text-sm sm:text-base">Rounds Played</p>
                                              <p className="text-2xl sm:text-3xl font-['IndieSellout'] text-white">{match.roundsPlayed}</p>
                                           </div>
                                           <div className="text-center font-cabana">
                                              <p className="text-white/50 mb-1 text-sm sm:text-base">Room Code</p>
                                              <p className="text-2xl sm:text-3xl font-['IndieSellout'] text-[#87CEFA]">{match.roomId}</p>
                                           </div>
                                        </div>
                                     </motion.div>
                                  )}
                                </AnimatePresence>
                             </div>
                           );
                        })}
                      </div>
                    )}
                 </div>
              ) : (
                 <QuestionBookManager />
              )}
           </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
