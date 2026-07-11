"use client";

import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/magicui/animated-list";

const thoughts = [
  {
    text: "What’s the funniest bug you’ve ever seen in code?",
    hint: "Hint: Think about those ‘works only on my machine’ moments 😅",
    time: "1m ago",
  },
  {
    text: "If JavaScript had a mascot, what would it be?",
    hint: "Hint: Maybe a quirky animal, or something async 🦊",
    time: "2m ago",
  },
  {
    text: "Best excuse you’ve given for breaking production?",
    hint: "Hint: The classic ‘It worked locally!’ counts.",
    time: "5m ago",
  },
  {
    text: "Tabs vs Spaces – eternal battle?",
    hint: "Hint: Pick a side or stir the pot 🤭",
    time: "10m ago",
  },
  {
    text: "If coding were a sport, what would be the championship?",
    hint: "Hint: Competitive bug fixing at 2 AM?",
    time: "15m ago",
  },
  {
    text: "Most creative 404 page idea?",
    hint: "Hint: Something funny, interactive, or a mini-game.",
    time: "20m ago",
  },
  {
    text: "What emoji describes debugging best?",
    hint: "Hint: 🐛🔍 or maybe 🥲?",
    time: "30m ago",
  },
  {
    text: "Dark mode or light mode?",
    hint: "Hint: Developers unite under dark mode 🌑",
    time: "45m ago",
  },

  // Extra ones
  {
    text: "What’s your most over-engineered project?",
    hint: "Hint: That ‘simple script’ that turned into a full framework 😅",
    time: "1h ago",
  },
  {
    text: "Funniest commit message you’ve written?",
    hint: "Hint: Bonus points if it’s sarcastic.",
    time: "1h 15m ago",
  },
  {
    text: "Best late-night coding snack?",
    hint: "Hint: Pizza, coffee, or instant noodles?",
    time: "1h 30m ago",
  },
  {
    text: "Do you code better with music or silence?",
    hint: "Hint: Share your playlist or your sacred silence.",
    time: "2h ago",
  },
  {
    text: "Longest time you spent debugging a single issue?",
    hint: "Hint: That one missing semicolon…",
    time: "2h 30m ago",
  },
  {
    text: "First programming language you ever learned?",
    hint: "Hint: C, Python, or Scratch maybe?",
    time: "3h ago",
  },
  {
    text: "Mobile apps or web apps – which do you prefer building?",
    hint: "Hint: Depends on what excites you most 🚀",
    time: "4h ago",
  },
  {
    text: "If AI could replace one boring dev task, which should it be?",
    hint: "Hint: Testing? Writing docs? Fixing merge conflicts?",
    time: "5h ago",
  },
];

// Repeat the thoughts array to make it long enough for a continuous loop
const repeatedThoughts = Array.from({ length: 10 }, () => thoughts).flat();

const ThoughtCard = ({ text, hint, time }) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[800px] cursor-pointer overflow-hidden rounded-2xl p-4",
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        "bg-white/40 [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center text-lg font-medium whitespace-pre dark:text-white">
            <span className="text-sm sm:text-lg dark:text-white/40">
              Thought
            </span>
            <span className="mx-1">·</span>
            <span className="text-sm text-white/20 dark:text-white/80">
              {time}
            </span>
          </figcaption>
          <p className="text-4xl text-black dark:text-white/40">{text}</p>
          <p className="text-2xl italic text-white/80 dark:text-white/40">
            {hint}
          </p>
        </div>
      </div>
    </figure>
  );
};

export default function ThoughtsAnimatedList({ className }) {
  return (
    <div
      className={cn(
        "relative flex h-[500px] w-full flex-col overflow-hidden p-2",
        className
      )}
    >
      <AnimatedList>
        {repeatedThoughts.map((item, idx) => (
          // Use a key that combines the text and index to ensure uniqueness
          <ThoughtCard key={`${item.text}-${idx}`} {...item} />
        ))}
      </AnimatedList>

      {/* Fade effect at bottom */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none h-1/4 "></div>
    </div>
  );
}
