import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import loadingAnimation from '@/assets/Lotties/Loading.json';
import { useState, useEffect } from 'react';
import Particles from '@/components/Particles';

export const ReckonLoader = ({ text = "LOADING...", texts = null, speed = 800, isOverlay = false }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isOverlay) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOverlay]);

  useEffect(() => {
    if (texts && texts.length > 0) {
      const interval = setInterval(() => {
        setIndex((prev) => (prev + 1) % texts.length);
      }, speed);
      return () => clearInterval(interval);
    }
  }, [texts, speed]);

  const currentText = texts ? texts[index] : text;

  const content = (
    <div className="flex flex-col items-center justify-center gap-2 p-4 md:p-8 min-h-[300px] w-full max-w-[100vw] overflow-hidden">
      <div className="relative w-32 h-32 md:w-40 md:h-40 z-10 flex flex-col items-center justify-center shrink-0">
        <Lottie animationData={loadingAnimation} loop={true} autoplay={true} className="w-full h-full filter brightness-[2] drop-shadow-[0_0_2px_white]" />
      </div>
      
      <div className="w-full max-w-[95vw] md:max-w-3xl flex items-center justify-center min-h-[4rem] -mt-4 md:-mt-10 relative">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentText}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex justify-center items-center"
          >
            <span className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold font-['IndieSellout'] tracking-widest text-white text-center px-4 uppercase break-words leading-tight">
              {currentText}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0A0A0A] overflow-hidden">
        {/* Space Theme Background to act like a solid page */}
        <div className="absolute inset-0 z-0">
          <Particles
            particleColors={["#ffffff", "#ffffff"]}
            particleCount={200}
            particleSpread={10}
            speed={0.1}
            particleBaseSize={100}
            moveParticlesOnHover={false}
            alphaParticles={false}
            disableRotation={false}
          />
        </div>
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
