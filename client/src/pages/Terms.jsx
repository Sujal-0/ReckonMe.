import React from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Highlighter } from "@/components/magicui/highlighter";

export default function Terms() {
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
            Terms & Conditions
          </Highlighter>
        </h1>
        
        <div className="space-y-10 text-xl sm:text-2xl leading-relaxed text-white/80 font-cabana tracking-wide">
          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                1. The Ground Rules
              </Highlighter>
            </h2>
            <p className="mt-2">
              By playing <strong>ReckonMe!</strong>, you agree to these Terms and Conditions. Since this is a game about guessing what your friends are thinking, we expect you to keep things fun. Play nice, don't break the servers, and respect your fellow players.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                2. User Content (Custom Questions)
              </Highlighter>
            </h2>
            <p className="mt-2">
              You have the ability to create Custom Questions. This is awesome! But with great power comes great responsibility:
            </p>
            <ul className="pl-6 mt-4 space-y-3 list-disc">
              <li>Don't upload anything illegal, harmful, or wildly inappropriate that would get us in trouble.</li>
              <li>You own your custom questions, but by saving them to our server, you give us permission to host them so you can actually play them.</li>
              <li>We reserve the right to delete any custom questions that cross the line into abusive or malicious territory.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                3. Accounts & Security
              </Highlighter>
            </h2>
            <p className="mt-2">
              If you create an account, keep your password safe! If someone hacks your account and starts making terrible guesses in your name, that's on you. We do our best to keep our database secure, but please don't use the same password you use for your bank account.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                4. Service Interruptions
              </Highlighter>
            </h2>
            <p className="mt-2">
              ReckonMe! is an indie project. Sometimes bugs happen, servers crash, or we accidentally deploy a typo that breaks the lobby. We promise to fix it as fast as we can, but we are not liable if a game disconnects right before you were about to win.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                5. Intellectual Property
              </Highlighter>
            </h2>
            <p className="mt-2">
              The code, the cool sketchy borders, the UI, and the concept of ReckonMe! belong to us. Feel free to be inspired by it, but please don't just clone the site and call it "ReckonYou!".
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl sm:text-4xl font-indiesellout text-white tracking-widest inline-block">
              <Highlighter action="highlight" color="#4D4C7D">
                6. Changes to these Terms
              </Highlighter>
            </h2>
            <p className="mt-2">
              We might update these terms as the game grows. If we make any massive changes, we'll try to let you know, but you should probably check back here every once in a while.
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
