import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad, Swords } from "lucide-react";
import { Highlighter } from "@/components/magicui/highlighter";

export default function Navbar({
  userInfo,
  handleProfile,
  scrollToHowToPlay,
  scrollToFindTheCreator,
  scrollToFeedback,
  logOut,
  handleAuth,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="absolute top-0 left-0 w-full px-4 sm:px-6">
      <div className="flex items-center justify-between">
        {/* Left section: Logo + Username */}
        <div className="flex items-center gap-4 sm:gap-10">
          <div className="h-14 w-14 sm:w-18 sm:h-18">
            <img src="/RMeLogo.png" alt="logoRMe" />
          </div>
          {userInfo && (
            <div
              className="text-lg font-semibold cursor-pointer sm:text-2xl"
              onClick={handleProfile}
            >
              <span className="text-xl font-semibold sm:text-3xl">
                Welcome Back!{" "}
              </span>
              <Highlighter action="highlight" color="#443C68">
                @{userInfo.username}
              </Highlighter>
            </div>
          )}
        </div>

        {/* Desktop Nav Buttons */}
        <div className="items-center hidden gap-3 md:flex lg:gap-4">
          <button
            className="px-4 sm:px-6 text-base sm:text-xl py-2 font-medium bg-[#0A0A0A] text-white transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
            onClick={scrollToHowToPlay}
          >
            How 2 Play
          </button>
          <button
            className="px-4 sm:px-6 py-2 text-base sm:text-xl font-medium bg-[#0A0A0A] text-white transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
            onClick={scrollToFindTheCreator}
          >
            Find the Creator.
          </button>
          <button
            className="px-4 sm:px-6 py-2 text-base sm:text-xl font-medium bg-[#0A0A0A] text-white transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
            onClick={scrollToFeedback}
          >
            Feedback
          </button>
          {userInfo ? (
            <button
              className="px-4 sm:px-6 py-2 text-base sm:text-xl font-medium bg-[#0A0A0A] text-white transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
              onClick={logOut}
            >
              Logout
            </button>
          ) : (
            <button
              className="px-4 sm:px-6 py-2 text-base sm:text-xl font-medium bg-[#0A0A0A] text-white transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
              onClick={handleAuth}
            >
              Sign In / Sign Up
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? (
              <Swords size={28} className="text-white/70 hover:text-white" />
            ) : (
              <Gamepad size={28} className="text-white/70 hover:text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center space-y-3 md:hidden"
          >
            <button
              className="w-full px-4 py-2 font-medium bg-[#0A0A0A] text-white"
              onClick={() => {
                scrollToHowToPlay();
                setIsOpen(false);
              }}
            >
              How 2 Play
            </button>
            <button
              className="w-full px-4 py-2 font-medium bg-[#0A0A0A] text-white"
              onClick={() => {
                scrollToFindTheCreator();
                setIsOpen(false);
              }}
            >
              Find the Creator.
            </button>
            <button
              className="w-full px-4 py-2 font-medium bg-[#0A0A0A] text-white"
              onClick={() => {
                scrollToFeedback();
                setIsOpen(false);
              }}
            >
              Feedback
            </button>
            {userInfo ? (
              <button
                className="w-full px-4 py-2 font-medium bg-[#0A0A0A] text-white"
                onClick={() => {
                  logOut();
                  setIsOpen(false);
                }}
              >
                Logout
              </button>
            ) : (
              <button
                className="w-full px-4 py-2 font-medium bg-[#0A0A0A] text-white"
                onClick={() => {
                  handleAuth();
                  setIsOpen(false);
                }}
              >
                Sign In / Sign Up
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
