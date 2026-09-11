import { useState, useEffect } from "react";
import SplitText from "@/components/SplitText";
import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";

export const PreGameInput = ({ onSubmit, isSubmitting, phaseTimer }) => {
  const [statements, setStatements] = useState([
    { text: "", isLie: false },
    { text: "", isLie: false },
    { text: "", isLie: false }
  ]);
  
  const timeLeft = phaseTimer?.timeLeft ?? 120;

  useEffect(() => {
    if (timeLeft === 0 && !isSubmitting) {
      const autoStatements = statements.map((s, i) => {
        if (s.text.trim()) {
          return { text: s.text.trim(), isLie: s.isLie };
        }
        
        // Randomized Funny Fallback
        const fallbacks = [
          "I fell asleep at my keyboard",
          "I couldn't think of a third thing",
          "My brain stopped working",
          "I panicked and typed nothing",
          "I am literally just a potato"
        ];
        return {
          text: fallbacks[i % fallbacks.length].toUpperCase(),
          isLie: s.isLie
        };
      });

      // Random Lie Selection if none picked
      if (!autoStatements.some(s => s.isLie)) {
        const randomIndex = Math.floor(Math.random() * autoStatements.length);
        autoStatements[randomIndex].isLie = true;
      }
      
      onSubmit(autoStatements);
    }
  }, [timeLeft, isSubmitting, onSubmit, statements]);

  const handleTextChange = (index, value) => {
    const newStatements = [...statements];
    newStatements[index].text = value;
    setStatements(newStatements);
  };

  const handleSelectLie = (index) => {
    const newStatements = statements.map((s, i) => ({
      ...s,
      isLie: i === index
    }));
    setStatements(newStatements);
  };

  const isValid = statements.every(s => s.text.trim().length > 0) && statements.some(s => s.isLie);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    onSubmit(statements);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-white bg-transparent font-['IndieSellout']">
      <div className="w-full max-w-2xl bg-transparent sketchy-shape border-4 border-white/20 p-8 relative shadow-2xl">
        
        <div className="text-center mb-8 flex flex-col items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#FF99CC] tracking-widest mb-2">THE HOT SEAT</h1>
          <div className="text-lg md:text-xl text-white/90 tracking-wider font-cabana max-w-lg mb-4 h-16 flex items-center justify-center">
            <SplitText
              text="Write two truths and one lie about yourself. Select which one is the lie. Make it convincing!"
              splitBy="word"
              delay={30}
            />
          </div>
          
          {/* Timer Display */}
          <div className={`text-3xl md:text-4xl font-bold font-['IndieSellout'] tracking-widest ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-[#87CEFA]'}`}>
            {timeLeft}S
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {statements.map((s, index) => (
            <div 
              key={index}
              onClick={() => handleSelectLie(index)}
              className={`flex items-center gap-4 p-4 border-2 transition-all cursor-pointer ${
                s.isLie 
                  ? "border-[#E48F45] bg-[#E48F45]/10 shadow-[4px_4px_0px_#E48F45]" 
                  : "border-white/20 bg-black/60 focus-within:border-[#87CEFA]"
              }`}
            >
              <button
                type="button"
                className="shrink-0 transition-colors pointer-events-none"
                title="Mark as the Lie"
              >
                {s.isLie ? (
                  <CheckCircle2 className="text-[#E48F45]" size={32} />
                ) : (
                  <Circle className="text-white/30 hover:text-white/60" size={32} />
                )}
              </button>
              
              <input
                type="text"
                value={s.text}
                onChange={(e) => handleTextChange(index, e.target.value.toUpperCase())}
                onClick={(e) => e.stopPropagation()}
                placeholder={`Statement ${index + 1}...`}
                maxLength={90}
                className="flex-1 bg-transparent text-2xl font-bold text-white placeholder-white/30 focus:outline-none rounded-none uppercase font-cabana"
                disabled={isSubmitting}
              />
              
              {s.isLie && (
                <span className="inline-block shrink-0 px-2 md:px-3 py-1 bg-[#E48F45] text-black text-xs md:text-sm font-bold tracking-widest">
                  THE LIE
                </span>
              )}
            </div>
          ))}

          <div className="pt-6">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full p-4 font-bold bg-[#87CEFA] text-[#0A0A0A] text-2xl tracking-widest transition-all shadow-[4px_4px_0px_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            >
              {isSubmitting ? "Locking in..." : "Lock in statements"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
