import React from "react";
import Lottie from "react-lottie";
import notFoundAnimation from "@/assets/Lotties/Error404.json";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const notFoundOptions = {
  loop: true,
  autoplay: true,
  animationData: notFoundAnimation,
};

export default function NotFound() {
  const navigate = useNavigate();
  const handleGoBack = () => {
    navigate("/");
  };
  return (
    <div className="flex items-center justify-center w-full min-h-screen">
      <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
        <Lottie
          isClickToPauseDisabled={true}
          height={300}
          width={300}
          options={notFoundOptions}
        />
        <h1 className="mt-4 text-5xl font-medium">Page Not Found :'(</h1>
        <div>
          <button
            className="px-16 py-2 text-3xl font-bold Stracking-wider bg-[#0A0A0A] text-[#ffffff] w-fit transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] mt-10 flex items-center gap-4 group"
            onClick={handleGoBack}
          >
            <ChevronLeft className="transition-transform duration-300 group-hover:-translate-x-3" />
            Go Back To Home{" "}
          </button>
        </div>
      </div>
    </div>
  );
}
