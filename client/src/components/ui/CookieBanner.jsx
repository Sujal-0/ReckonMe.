import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has already accepted or dismissed the cookie banner
    const hasConsent = localStorage.getItem("reckonme_cookie_consent");
    if (!hasConsent) {
      // Small delay so it slides up after the page loads, making it feel less aggressive
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("reckonme_cookie_consent", "true");
    setIsVisible(false);
  };

  const handleReadMore = () => {
    navigate("/privacy");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed z-50 p-4 bottom-4 right-4 left-4 md:left-auto md:max-w-sm bg-[#0A0A0A] sketchy-shape border-4 border-white shadow-[4px_4px_0px_white] flex flex-col gap-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-[#87CEFA]">
              <Cookie className="w-5 h-5" />
              <h3 className="text-2xl font-bold font-indiesellout tracking-widest mt-1">Cookies!</h3>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-lg leading-relaxed text-white/90 font-cabana tracking-wide">
            We use tiny digital cookies to keep you logged in and to remember your game preferences. By clicking accept, you're cool with that!
          </p>
          
          <div className="flex justify-end gap-3 mt-2">
            <button 
              onClick={handleReadMore}
              className="px-4 py-2 text-sm font-bold tracking-wider text-white transition-all bg-[#0A0A0A] shadow-[2px_2px_0px_white] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-indiesellout"
            >
              READ MORE
            </button>
            <button 
              onClick={handleAccept}
              className="px-4 py-2 text-sm font-bold tracking-wider text-white transition-all bg-[#0A0A0A] shadow-[2px_2px_0px_white] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-indiesellout"
            >
              ACCEPT
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
