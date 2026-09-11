import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")).render(
  <>
    <App />
    <Toaster 
      closeButton 
      position="top-center"
      toastOptions={{
        className: 'bg-[#0A0A0A] text-[#ffffff] border-0 border-b-2 font-bold font-cabana text-xl shadow-[3px_3px_0px_white] rounded-lg'
      }}
    />
  </>
);
