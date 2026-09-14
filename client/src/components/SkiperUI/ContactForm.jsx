"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import { MESSAGE_ROUTE } from "@/utils/constants";

const ContactForm = ({ open, setOpen }) => {
  const [formState, setFormState] = useState("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    setFormState("loading");

    try {
      const response = await apiClient.post(MESSAGE_ROUTE, {
        name,
        email,
        message,
      });

      // reset and close after 3.3s
      if (response.status === 201) {
        setFormState("success");
        setTimeout(() => {
          setOpen(false);
          setFormState("idle");
          setName("");
          setEmail("");
          setMessage("");
        }, 3300);
      } else {
        alert("Something went wrong!");
        setFormState("idle");
      }
    } catch (error) {
      console.error("Contact submit error:", error);
      alert("Failed to send message. The server might be misconfigured.");
      setFormState("idle");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          {/* Form */}
          <motion.div
            className="fixed top-1/2 left-1/2 z-50 w-[384px] bg-[#0A0A0A] rounded-xl shadow-xl"
            initial={{ opacity: 0, scale: 0.8, y: "-50%", x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
            exit={{ opacity: 0, scale: 0.8, y: "-50%", x: "-50%" }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {formState === "success" ? (
              <div className="p-6 text-center text-white">
                <h2 className="text-2xl font-bold">Message Sent</h2>
                <p className="mt-2 text-gray-300">
                  Thank you for contacting us. We'll get back to you soon!
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name || !email || !message) return;
                  submit();
                }}
                className="p-6 space-y-4 text-white"
              >
                <div>
                  <label className="block mb-1 text-2xl font-medium">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 text-2xl bg-transparent border-2 rounded-lg border-white/30 focus:outline-none font-['IndieSellout'] tracking-widest"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-2xl font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 text-2xl bg-transparent border-2 rounded-lg border-white/30 focus:outline-none font-['IndieSellout'] tracking-widest"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-2xl font-medium">
                    Message
                  </label>
                  <textarea
                    value={message}
                    placeholder="Message..."
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-2 text-2xl bg-transparent border-2 rounded-lg border-white/30 focus:outline-none min-h-[120px] font-cabana tracking-widest"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={formState === "loading"}
                  className="w-full py-2 text-3xl font-bold tracking-wider bg-[#0A0A0A] text-[#ffffff] transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] flex items-center justify-center"
                >
                  {formState === "loading" ? "Sending..." : "Submit"}
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContactForm;
