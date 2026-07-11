import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ContactForm from "../SkiperUI/ContactForm";

export const BlockInTextCard = () => {
  const exampleQueries = [
    "How do I join a game with a friend?",
    "My game room is not loading.",
    "Can I create my own questions?",
    "How does the scoring work?",
    "How can I provide feedback?",
  ];

  const [open, setOpen] = useState(false);

  const openForm = () => setOpen(true);

  return (
    <div className="flex items-center justify-center px-8 py-24 text-white">
      <Card
        tag="/ Support"
        text={
          <>
            <strong>Got a question?</strong> We'd love to help! Contact support
            for any issue you may face.
          </>
        }
        examples={exampleQueries}
        open={open}
        setOpen={setOpen}
        openForm={openForm}
      />
    </div>
  );
};

const Card = ({ tag, text, examples, open, setOpen, openForm }) => {
  return (
    <div className="w-full max-w-xl space-y-6">
      <div>
        <p className="mb-1.5 text-xl font-light uppercase text-gray-400">
          {tag}
        </p>
        <hr className="border-gray-700" />
      </div>
      <p className="max-w-lg text-3xl font-medium leading-relaxed">{text}</p>
      <div>
        <Typewrite examples={examples} />
        <hr className="border-gray-300" />
      </div>
      <button
        className="w-full px-10 py-2 font-medium bg-[#0A0A0A] text-[#ffffff] text-4xl transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
        onClick={openForm}
      >
        Contact Support
      </button>

      {/* Pass open + setOpen to ContactForm */}
      <ContactForm open={open} setOpen={setOpen} />
    </div>
  );
};

const LETTER_DELAY = 0.025;
const BOX_FADE_DURATION = 0.125;
const FADE_DELAY = 5;
const MAIN_FADE_DURATION = 0.25;
const SWAP_DELAY_IN_MS = 5500;

const Typewrite = ({ examples }) => {
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setExampleIndex((pv) => (pv + 1) % examples.length);
    }, SWAP_DELAY_IN_MS);

    return () => clearInterval(intervalId);
  }, [examples]);

  return (
    <p className="mb-2.5 text-lg font-light uppercase text-gray-400">
      <span className="inline-block bg-white size-2" />
      <span className="ml-3">
        EXAMPLE:{" "}
        {examples[exampleIndex].split("").map((l, i) => (
          <motion.span
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{
              delay: FADE_DELAY,
              duration: MAIN_FADE_DURATION,
              ease: "easeInOut",
            }}
            key={`${exampleIndex}-${i}`}
            className="relative"
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: i * LETTER_DELAY,
                duration: 0,
              }}
            >
              {l}
            </motion.span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                delay: i * LETTER_DELAY,
                times: [0, 0.1, 1],
                duration: BOX_FADE_DURATION,
                ease: "easeInOut",
              }}
              className="absolute bottom-[3px] left-[1px] right-0 top-[3px] bg-white"
            />
          </motion.span>
        ))}
      </span>
    </p>
  );
};

export default BlockInTextCard;
