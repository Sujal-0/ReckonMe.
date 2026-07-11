import { useState } from "react";
import SignIn from "./SignIn";
import SignUp from "./SignUp";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // toggle between signin/signup

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white">
      {mode === "signin" ? <SignIn /> : <SignUp />}

      <p className="mt-4 text-sm">
        {mode === "signin" ? (
          <>
            Don’t have an account?{" "}
            <button
              onClick={() => setMode("signup")}
              className="mx-auto mt-4 text-2xl text-white/70 hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:w-0 after:h-[1px] after:left-0 after:bottom-0 after:bg-white/40 after:transition-all after:duration-300 hover:after:w-full"
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              onClick={() => setMode("signin")}
              className="mx-auto mt-4 text-2xl text-white/70 hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:w-0 after:h-[1px] after:left-0 after:bottom-0 after:bg-white/40 after:transition-all after:duration-300 hover:after:w-full"
            >
              Sign In
            </button>
          </>
        )}
      </p>
    </div>
  );
}
