import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";

import useRoomStore from "@/store/roomStore";

export const SmartChat = ({ messages, onSendMessage, isOpen, onToggle, positionClass, player, onApproveAccess, room, isAnyPanelOpen, mobileFloating = false }) => {
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  
  const { getPlayers } = useRoomStore();
  const players = getPlayers();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    } else if (messages.length > 0) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage("");
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <motion.button
          initial={false}
          animate={{ right: isAnyPanelOpen ? 432 : 32 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggle}
          className={`${mobileFloating ? 'flex' : 'hidden md:flex'} fixed bottom-[28px] z-50 p-2 bg-white border-2 border-[#0A0A0A] rounded-none transition-all shadow-[4px_4px_0px_white] hover:-translate-x-[4px] hover:-translate-y-[4px] hover:shadow-none`}
        >
          <img src="/chat.png" alt="Chat" className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <MessageCircle size={26} className="hidden text-black" />
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center w-8 h-8 bg-rose-600 text-white font-bold rounded-full text-sm font-['IndieSellout'] border-2 border-white">
              {unreadCount}
            </span>
          )}
        </motion.button>
      )}

      {/* Sliding Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-[#0A0A0A] border-l-4 border-white/20 sketchy-shape shadow-[-8px_0px_0px_rgba(255,255,255,0.1)] flex flex-col z-50 overflow-hidden"
            >
            {/* Header */}
            <div className="flex items-center justify-between p-4 cartoon-dashed-border-b">
              <div className="flex items-center gap-2">
                <MessageCircle className="text-[#87CEFA]" />
                <h3 className="text-2xl font-bold text-white font-['IndieSellout'] tracking-widest uppercase">
                  Chat
                </h3>
              </div>
              <button
                onClick={onToggle}
                className="p-1 text-white/50 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#4D4C7D] scrollbar-track-transparent ${messages.length === 0 ? 'flex items-center justify-center' : 'space-y-4'}`}>
              {messages.length === 0 ? (
                <div className="text-white/40 font-['IndieSellout'] text-xl text-center">
                  No messages yet. Say hi!
                </div>
              ) : (
                messages.map((msg) => {
                  const msgPlayer = players.find((p) => p.id === msg.playerId);
                  const seed = msgPlayer?.avatarSeed || msg.playerName || msg.playerId;
                  const avatarUrl = `https://api.dicebear.com/7.x/croodles/svg?seed=${seed}&backgroundColor=transparent`;
                  const isRequestAccess = msg.type === "request_access";
                  
                  return (
                    <div key={msg.id} className={`flex gap-3 bg-transparent border-2 sketchy-shape ${isRequestAccess ? "border-[#E48F45] shadow-[3px_3px_0px_#E48F45]" : "border-[#4D4C7D] shadow-[3px_3px_0px_#4D4C7D]"} p-3`}>
                      <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 overflow-hidden flex items-center justify-center border border-white/20">
                        <img src={avatarUrl} alt="avatar" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex justify-between items-end mb-1">
                          <span className={`font-bold uppercase tracking-widest ${isRequestAccess ? "text-[#E48F45]" : "text-[#87CEFA]"} font-['IndieSellout'] text-xl`}>
                            {msg.playerName}
                          </span>
                          <span className="text-[10px] font-cabana tracking-widest text-white/50">{msg.timestamp}</span>
                        </div>
                        <p className="text-white text-lg font-cabana font-bold tracking-wider">{msg.message}</p>
                        {isRequestAccess && player?.isHost && (
                           <div className="mt-3">
                             {room?.settings?.sharedSettingsAccess ? (
                               <div className="text-sm font-bold text-[#00E5FF] font-['IndieSellout'] bg-white/10 px-2 py-1 rounded inline-block">Approved!</div>
                             ) : (
                             <button 
                                 onClick={onApproveAccess}
                                 className="px-3 py-1.5 font-bold bg-[#E48F45] text-black text-sm rounded-none shadow-[2px_2px_0px_white] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                               >
                                 Approve Access
                               </button>
                             )}
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 pb-24 md:pb-6 border-t-4 border-white/20 border-dotted">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={200}
                  className="flex-1 px-4 py-3 rounded-none bg-transparent text-xl font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-colors font-cabana"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-[#ffffff] text-[#0A0A0A] rounded-none transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={24} />
                </button>
              </form>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
