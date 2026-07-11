import { Highlighter } from "@/components/magicui/highlighter";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/store";
import { LOGOUT_ROUTE } from "@/utils/constants";
import { ChevronLeft } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { animationDefaultOptions } from "@/lib/utils";
import Lottie from "react-lottie";

const Profile = () => {
  const navigate = useNavigate();
  const { userInfo, setUserInfo } = useAppStore();

  const handleGoBack = () => {
    navigate("/");
  };

  const logOut = async () => {
    try {
      const response = await apiClient.post(
        LOGOUT_ROUTE,
        {},
        { withCredentials: true }
      );
      if (response.status === 200) {
        setUserInfo(null);
        navigate("/");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  return (
    <div className="w-full h-full">
      <div className="flex flex-col h-screen">
        <nav className="fixed top-0 left-0 w-full px-6 mt-4">
          <div className="grid items-center w-full grid-cols-3">
            {/* Left Side - Logo */}
            <div className="text-4xl font-bold">Rme.</div>

            {/* Middle Side - Username */}
            <div className="flex justify-center text-4xl font-semibold">
              <Highlighter action="highlight" color="#87CEFA">
                @{userInfo?.username}
              </Highlighter>
            </div>

            {/* Right Side - Buttons */}
            <div className="flex justify-end gap-4">
              <button
                className="px-8 py-2 text-2xl font-bold tracking-wider bg-[#0A0A0A] text-[#ffffff] w-fit transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] flex items-center gap-4 group"
                onClick={handleGoBack}
              >
                <ChevronLeft className="transition-transform duration-300 group-hover:-translate-x-3" />
                Go Back
              </button>

              <button
                className="px-12 py-2 font-bold bg-[#0A0A0A] text-[#ffffff] text-2xl w-fit transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                onClick={logOut}
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
          <h2 className="text-6xl font-semibold leading-tight tracking-widest">
            <Highlighter action="underline" color="#443C68">
              Welcome! {userInfo?.username}
            </Highlighter>
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
          <Lottie
            isClickToPauseDisabled={true}
            height={300}
            width={300}
            options={animationDefaultOptions}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
