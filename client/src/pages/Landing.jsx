import { Highlighter } from "@/components/magicui/highlighter";
import { ChevronRight } from "lucide-react";
import SplitText from "@/components/ReactBits/SplitText";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpringModal from "@/components/SpringModalUI/SpringModal";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import { apiClient } from "@/lib/api-client";
import { LOGOUT_ROUTE } from "@/utils/constants";
import SpotlightCard from "@/components/ReactBits/SpotLightCard";
import { MorphingText } from "@/components/magicui/morphing-text";
import { SparklesText } from "@/components/ui/sparkles-text";
import TextFlipperEffect from "@/components/SkiperUI/TextFlipperEffect";
import BlockInTextCard from "@/components/HoverDev/BlockInTextCard";
import Footer from "./Footer";
import Navbar from "./Navbar";

export default function Landing() {
  const how2PlayRef = useRef(null);
  const FindTheCreator = useRef(null);
  const Feedback = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const { userInfo, setUserInfo } = useAppStore();

  const scrollToHowToPlay = () => {
    how2PlayRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToFindTheCreator = () => {
    FindTheCreator.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToFeedback = () => {
    Feedback.current?.scrollIntoView({ behavior: "smooth" });
  };

  const navigate = useNavigate();

  const handleAuth = () => {
    navigate("/auth");
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  const logOut = async () => {
    try {
      const response = await apiClient.post(
        LOGOUT_ROUTE,
        {},
        { withCredentials: true }
      );
      if (response.status === 200) {
        setUserInfo(null);
        navigate("/");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  return (
    <div className="w-full h-full">
      {/* Hero Section (100vh) */}
      <section className="flex flex-col h-screen">
        {/* Transparent Navbar */}
        <Navbar
          userInfo={userInfo}
          handleProfile={handleProfile}
          scrollToHowToPlay={scrollToHowToPlay}
          scrollToFindTheCreator={scrollToFindTheCreator}
          scrollToFeedback={scrollToFeedback}
          logOut={logOut}
          handleAuth={handleAuth}
        />

        {/* Center Content */}
        <div
          id="center"
          className="flex flex-col items-center justify-center flex-1 px-4 text-center"
        >
          <SparklesText className="bg-transparent text-white leading-none inline-block" colors={{first: "#E48F45", second: "#87CEFA"}} sparklesCount={8}>
            <SplitText
              text="ReckonMe!"
              className="text-4xl font-semibold leading-tight tracking-widest sm:text-5xl md:text-6xl lg:text-8xl"
              delay={100}
              duration={0.6}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="center"
            />
          </SparklesText>

          <p className="mt-4 text-lg leading-snug tracking-wide sm:text-2xl md:text-3xl lg:text-4xl font-cabana">
            The game{" "}
            <Highlighter action="underline" color="#443C68">
              where you reckon
            </Highlighter>{" "}
            what your{" "}
            <Highlighter action="highlight" color="#87CEFA">
              friends
            </Highlighter>{" "}
            are thinking .
          </p>
          <button
            className="mt-10 sm:mt-16 px-6 sm:px-10 lg:px-12 
                 text-lg sm:text-2xl lg:text-3xl font-boldpx-12 py-2 font-bold  tracking-wider bg-[#0A0A0A] text-[#ffffff] w-fit transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] flex items-center gap-4 group"
            onClick={() => setIsOpen(true)}
          >
            Reckon Me{" "}
            <ChevronRight className="transition-transform duration-300 group-hover:translate-x-3" />
          </button>
          {/* Modal */}
          <SpringModal isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      </section>

      {/* Instructions Section (100vh) */}
      <section
        ref={how2PlayRef}
        className="flex items-center justify-center h-screen"
        id="How2Play"
      >
        <div className="max-w-3xl text-center">
          <Highlighter action="highlight" color="#4D4C7D">
            <SplitText
              text="How2Play"
              className="px-6 text-4xl font-semibold leading-tight tracking-widest sm:text-5xl md:text-6xl lg:text-8xl"
              delay={100}
              duration={0.6}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="center"
            />
          </Highlighter>
          <p className="mt-4 text-xl leading-tight tracking-widest text-start sm:text-2xl md:text-3xl lg:text-4xl font-cabana">
            - Answer to each question
          </p>
          <p className="mt-4 text-xl leading-tight tracking-widest text-start sm:text-2xl md:text-3xl lg:text-4xl font-cabana">
            - Guess what your friends answered!
          </p>
          <p className="mt-4 text-xl leading-tight tracking-widest text-start sm:text-2xl md:text-3xl lg:text-4xl font-cabana">
            - Who has most right guesses wins!
          </p>
        </div>
      </section>
      {/* <section className="flex items-center justify-center h-screen">
        <div className="w-full max-w-lg mt-12">
          <ThoughtsAnimatedList />
        </div>
      </section> */}
      <section className="flex flex-col items-center justify-center min-h-screen px-4 py-12 lg:flex-row lg:gap-12">
        {/* Left Side Text */}
        <div className="w-full max-w-lg mt-8 text-center lg:text-left lg:mt-0">
          <span className="block px-2 text-4xl font-semibold leading-tight tracking-widest sm:px-4 sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
            Created By -
          </span>
          <MorphingText
            texts={["Me", "Sujal", "Web Developer", "An Avid Learner"]}
            className="font-['IndieSellout'] block px-2 sm:px-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-widest mt-4"
          />
        </div>

        {/* Spotlight Card */}
        <SpotlightCard
          className="w-full max-w-lg mt-10 custom-spotlight-card sketchy-shape border-4 border-white/20 lg:mt-0"
          spotlightColor="rgba(0, 229, 255, 0.2)"
        >
          <div className="w-full">
            <p className="text-lg leading-relaxed text-center text-gray-300 sm:text-xl md:text-2xl lg:text-3xl lg:text-left font-cabana">
              Hi, I'm Sujal, the developer behind ReckonMe. I built this game
              because I love how technology can bring people closer and spark
              genuine moments of fun. This is my passion project, a simple way
              for friends to connect and discover a new side to each other. I
              hope you have as much fun playing as I did building it!
            </p>
            <div className="mt-6 text-lg text-center sm:text-xl md:text-2xl lg:text-left font-cabana">
              <Highlighter action="highlight" color="#4D4C7D">
                A passion project for friends, by a friend.
              </Highlighter>
            </div>
          </div>
        </SpotlightCard>
      </section>

      <section
        id="creator"
        className="flex items-center justify-center h-screen"
        ref={FindTheCreator}
      >
        <div className="w-full max-w-lg mt-12">
          <TextFlipperEffect />
        </div>
      </section>
      <section
        id="feedback"
        className="flex items-center justify-center h-screen"
        ref={Feedback}
      >
        <div className="w-full max-w-lg mt-12 space-y-12">
          <BlockInTextCard />
          {/* <ContactForm /> */}
        </div>
      </section>
      <section className="flex items-center justify-center">
        <div className="w-full max-w-lg">
          <Footer />
        </div>
      </section>
    </div>
  );
}
