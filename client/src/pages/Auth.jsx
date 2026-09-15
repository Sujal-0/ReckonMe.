import { useSearchParams } from "react-router-dom";
import SignIn from "./SignIn";
import SignUp from "./SignUp";

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "signin";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white">
      {mode === "signin" ? <SignIn /> : <SignUp />}

      <p className="mt-4 text-sm">
        {mode === "signin" ? (
          <>
            Don’t have an account?{" "}
            <button
              onClick={() => setSearchParams({ mode: "signup" })}
              className="mx-auto mt-4 text-xl md:text-2xl text-white/70 hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:w-0 after:h-[1px] after:left-0 after:bottom-0 after:bg-white/40 after:transition-all after:duration-300 hover:after:w-full"
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              onClick={() => setSearchParams({ mode: "signin" })}
              className="mx-auto mt-4 text-xl md:text-2xl text-white/70 hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:w-0 after:h-[1px] after:left-0 after:bottom-0 after:bg-white/40 after:transition-all after:duration-300 hover:after:w-full"
            >
              Sign In
            </button>
          </>
        )}
      </p>

      <p className="mt-8 text-xs text-center text-white/50 max-w-xs md:max-w-md">
        By continuing, you agree to ReckonMe!'s{" "}
        <a href="/terms" className="underline hover:text-white">Terms of Service</a>{" "}
        and{" "}
        <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>.
      </p>
    </div>
  );
}
