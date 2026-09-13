import React from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Highlighter } from "@/components/magicui/highlighter";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen px-4 py-12 sm:py-20 pb-32 overflow-y-auto">
      <div className="w-full max-w-4xl p-6 sm:p-8 md:p-12 bg-[#0A0A0A] sketchy-shape border-4 border-white shadow-[6px_6px_0px_white] text-white">
        
        <button
          className="flex items-center gap-2 px-6 py-2 mb-8 text-lg sm:text-xl font-bold tracking-wider text-white transition-all bg-[#0A0A0A] shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] group font-indiesellout w-fit"
          onClick={() => navigate("/")}
        >
          <ChevronLeft className="transition-transform duration-300 group-hover:-translate-x-2" />
          BACK TO HOME
        </button>

        <h1 className="mb-12 text-4xl sm:text-5xl md:text-6xl font-indiesellout text-[#ffffff] tracking-widest text-center">
          <Highlighter action="highlight" color="#E48F45">
            Privacy Policy
          </Highlighter>
        </h1>
        
        <div className="space-y-10 text-xl sm:text-2xl leading-relaxed text-white/80 font-cabana tracking-wide">
          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                1. The Vibe (Who We Are)
              </Highlighter>
            </h2>
            <p className="mt-2">
              Welcome to <strong>ReckonMe!</strong> We're here to help you figure out what your friends are actually thinking, not to steal your data or do anything creepy with it. Since we are an indie project built for fun, our policy is simple: we only collect what we absolutely need to make the game work.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                2. What We Actually Collect
              </Highlighter>
            </h2>
            <p className="mt-2">
              When you play ReckonMe!, we collect the bare minimum:
            </p>
            <ul className="pl-6 mt-4 space-y-3 list-disc">
              <li><strong>Your Username & Email:</strong> Just so you can log in, save your custom questions, and flex your match history.</li>
              <li><strong>Game Data:</strong> The questions you create and the hilarious (or terrible) guesses you make during a match.</li>
              <li><strong>Cookies:</strong> Not the chocolate chip kind. We use tiny digital cookies to keep you logged in and to remember your preferences.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                3. How We Use It
              </Highlighter>
            </h2>
            <p className="mt-2">
              We use your data purely to run the game. We don't sell your email to spammers, we don't track you across the internet, and we certainly don't care about your search history. Your custom questions stay in your rooms and your profile!
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                4. Who We Share It With
              </Highlighter>
            </h2>
            <p className="mt-2">
              Literally nobody. Unless a wizard casts a spell on our servers or the law absolutely demands it, your data stays within the ReckonMe! database.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                5. Your Rights
              </Highlighter>
            </h2>
            <p className="mt-2">
              Don't want to play anymore? That makes us sad, but you have the right to disappear. If you want your account wiped from our database, just reach out to us and we'll cast it into the digital void.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                6. Contact Us
              </Highlighter>
            </h2>
            <p className="mt-2">
              Got questions? Found a bug? Just want to say hi? You can reach the creator directly at: <br/>
              <a href="mailto:sujalsingh2204@gmail.com" className="text-[#E48F45] hover:underline font-bold font-['IndieSellout'] mt-2 inline-block text-lg sm:text-xl">
                sujalsingh2204@gmail.com
              </a>
            </p>
          </section>

          <p className="pt-12 text-base sm:text-lg italic text-center text-white/50">
            Last Updated: Somewhere in the near future.
          </p>
        </div>
      </div>
    </div>
  );
}
