import React from "react";
import { Link } from "react-router-dom";
import {
  Facebook,
  Twitter,
  Github,
  Linkedin,
  Mail,
  Instagram,
} from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="w-full py-8 text-white bg-transparent">
      <div className="container flex flex-col items-center px-6 mx-auto space-y-6">
        {/* Logo */}
        <div className="w-20 h-20" onClick={() => scrollToSection("center")}>
          <img src="/RMeLogo.png" alt="logoRMe" />
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xl md:text-2xl font-medium tracking-widest font-['indiesellout']">
          <button
            onClick={() => scrollToSection("How2Play")}
            className="hover:text-[#87CEFA] transition"
          >
            How 2 Play
          </button>
          <button
            onClick={() => scrollToSection("creator")}
            className="hover:text-[#87CEFA] transition"
          >
            Find the Creator
          </button>
          <button
            onClick={() => scrollToSection("feedback")}
            className="hover:text-[#87CEFA] transition"
          >
            Feedback
          </button>
          
          {/* Force a line break on mobile screens only */}
          <div className="w-full md:hidden"></div>

          <Link
            to="/privacy"
            className="hover:text-[#87CEFA] transition"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="hover:text-[#87CEFA] transition"
          >
            Terms
          </Link>
        </div>

        {/* Social Icons */}
        <div className="flex gap-6 text-lg font-medium">
          <a
            href="https://github.com/Sujal-0"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#87CEFA] transition"
          >
            <Github className="w-6 h-6 hover:text-[#87CEFA] transition" />
          </a>
          <a
            href="https://linkedin.com/in/sujalsingh01"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#87CEFA] transition"
          >
            <Linkedin className="w-6 h-6 hover:text-[#87CEFA] transition" />
          </a>
          <a
            href="https://www.instagram.com/_sujal_singh01/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#87CEFA] transition"
          >
            <Instagram className="w-6 h-6 hover:text-[#87CEFA] transition" />
          </a>
          <a
            href="mailto:sujalsingh2204@gmail.com"
            className="hover:text-[#87CEFA] transition"
          >
            <Mail className="w-6 h-6 hover:text-[#87CEFA] transition" />
          </a>
        </div>

        {/* Copyright */}
        <div className="text-lg text-gray-400">
          Copyright ⓒ {year} <span className="font-semibold">ReckonMe!</span>.
          All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
