import { Highlighter } from "@/components/magicui/highlighter";
import { apiClient } from "@/lib/api-client.js";
import { useAppStore } from "@/store";
import { LOGIN_ROUTE } from "@/utils/constants.js";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function SignIn() {
  const [identifier, setIdentifier] = useState(""); // email OR username
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setUserInfo } = useAppStore();

  const validateSignin = () => {
    if (!identifier.length) {
      toast.error("Email or Username is required");
      return false;
    }

    if (!password.length) {
      toast.error("Password is required");
      return false;
    }
    return true;
  };

  const handleSignin = async () => {
    // console.log("Login payload:", payload);

    // Send payload to your API here
    if (validateSignin()) {
      const payload = { identifier, password };
      const response = await apiClient.post(LOGIN_ROUTE, payload, {
        withCredentials: true,
      });
      if (response.data.user.id) {
        setUserInfo(response.data.user);
        navigate("/");
        toast.success("Login successful");
      }
      console.log({ response });
    }
  };

  const handleGoBack = () => {
    navigate("/");
  };
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-100 p-6 rounded-xl bg-black/40 shadow-lg"
      >
        <nav className="w-full flex justify-between items-center p-4 absolute top-0 left-0">
          <div>
            <button
              className="px-8 py-2 text-3xl font-bold font-['IndieSellout'] tracking-wider bg-[#0A0A0A] text-[#ffffff] w-fit transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] mt-4 flex items-center gap-4 group"
              onClick={handleGoBack}
            >
              <ChevronLeft className="transition-transform duration-300 group-hover:-translate-x-3" />
              Go Back{" "}
            </button>
          </div>
        </nav>
        <Highlighter action="highlight" color="#2B2B2B">
          <h1 className="text-4xl leading-tight font-semibold px-6">Sign In</h1>
        </Highlighter>
        <div className="flex flex-col">
          <input
            type="text"
            placeholder="Email/Username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            maxLength={30}
            className="flex-1 px-4 py-1 mt-4 rounded-none bg-transparent text-2xl font-medium text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-cabana tracking-widest leading-tight"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 px-4 py-1 mt-4 rounded-none bg-transparent text-2xl font-medium text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-cabana tracking-widest leading-tight"
          />
          <button
            className="px-10 py-2 font-medium mt-4 bg-[#0A0A0A] text-[#ffffff] text-2xl w-full transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
            onClick={handleSignin}
          >
            Sign In
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
