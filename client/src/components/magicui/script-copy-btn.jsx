"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

export function ScriptCopyBtn({
  showMultiplePackageOptions = true,
  commandMap,
  className,
}) {
  const packageManagers = Object.keys(commandMap);
  const [packageManager, setPackageManager] = useState(packageManagers[0]);
  const [copied, setCopied] = useState(false);
  const command = commandMap[packageManager];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "mx-auto flex max-w-md items-center justify-center",
        className
      )}
    >
      <div className="w-full space-y-2">
        {/* Toggle Buttons */}
        <div className="flex items-center justify-between mb-2">
          {showMultiplePackageOptions && (
            <div className="relative">
              <div className="inline-flex overflow-hidden text-xs border rounded-none border-border">
                {packageManagers.map((pm, index) => (
                  <div key={pm} className="flex items-center">
                    {index > 0 && (
                      <div className="w-px h-4 bg-border" aria-hidden="true" />
                    )}
                    <Button
                      variant="ghost"
                      size="lg"
                      className={`relative rounded-none bg-background px-2 py-1 hover:bg-white/80 hover:text-white ${
                        packageManager === pm
                          ? "text-lg font-bold text-black font-cabana tracking-widest"
                          : "text-lg font-bold text-black font-cabana tracking-widest"
                      }`}
                      onClick={() => setPackageManager(pm)}
                    >
                      {pm}
                      {packageManager === pm && (
                        <motion.div
                          className="absolute inset-x-0 bottom-[1px] mx-auto h-0.5 w-[90%] bg-primary"
                          layoutId="activeTab"
                          initial={false}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Command Block + Copy */}
        <div className="relative flex flex-col sm:flex-row items-stretch">
          <div className="grow w-full overflow-hidden">
            <pre
              className={cn(
                "flex items-center justify-center h-full p-3 border-2 border-white overflow-hidden rounded-none",
                "bg-transparent text-[#ffffff]",
                "font-['IndieSellout'] text-lg tracking-wider sm:text-2xl sm:tracking-widest leading-relaxed font-semibold text-center whitespace-nowrap"
              )}
            >
              {command}
            </pre>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="mt-2 sm:mt-0 sm:ml-2 px-6 py-4 rounded-none border-2 border-white font-medium bg-[#0A0A0A] text-[#ffffff] w-full sm:w-auto h-auto transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50 flex items-center justify-center shrink-0"
            onClick={copyToClipboard}
            aria-label={copied ? "Copied" : "Copy to clipboard"}
          >
            <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
            <Copy
              className={`h-6 w-6 transition-all duration-300 ${
                copied ? "scale-0" : "scale-100"
              }`}
            />
            <Check
              className={`absolute inset-0 m-auto h-6 w-6 transition-all duration-300 ${
                copied ? "scale-100" : "scale-0"
              }`}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
