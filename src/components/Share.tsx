"use client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Upload } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";

type User = {
  namespace: string;
};

const Share = ({ namespace }: User) => {
  const router = useRouter();
  const { toast } = useToast();
  const [disabled, setDisabled] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  return (
    <>
      {disabled ? (
        <div /*className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-4 flex-row bg-gray-900 rounded p-4"*/
        >
          <motion.div className="w-5 h-5 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div /*className="w-full h-full flex items-center justify-center p-4"*/>
          <Card
            className="border-none" /*className="w-full max-w-2xl mx-auto shadow-lg bg-black border-none flex flex-col h-[calc(100vh-8rem)] max-h-[800px]"*/
          >
            <input
              type="file"
              id="fileInput"
              className="hidden w-full"
              accept="application/pdf"
              onChange={() => {
                setDisabled(true);
                const fileInput = document.getElementById(
                  "fileInput"
                ) as HTMLInputElement;
                if (
                  !fileInput ||
                  !fileInput.files ||
                  fileInput.files.length === 0
                ) {
                  toast({
                    duration: 2000,
                    variant: "destructive",
                    description: "No file attached.",
                  });
                  return;
                }
                const fileData = fileInput.files[0];
                const formData = new FormData();
                formData.append("file", fileData);
                formData.append("namespace", namespace);
                formData.append("private", "false");

                toast({
                  duration: 10000,
                  description: "Adding your PDF to AI's knowledge...",
                });

                fetch("/api/upsert", {
                  method: "POST",
                  body: formData,
                })
                  .then((res) => res.json())
                  .then((data) => {
                    console.log("response after upload:", data);
                    if (data.error) {
                      toast({
                        duration: 2000,
                        variant: "destructive",
                        description: data.error,
                      });
                      setDisabled(false);
                    } else if (data.message) {
                      toast({
                        duration: 2000,
                        description:
                          "Added the PDF to AI's knowledge successfully.",
                      });
                      setTimeout(() => {
                        router.replace(`/chat/${data.message}`);
                      }, 100);
                      setDisabled(false);
                    } else {
                      throw new Error("Upload ID missing in response");
                    }
                  })
                  .catch((error) => {
                    console.error("Upload error:", error);
                    toast({
                      duration: 2000,
                      variant: "destructive",
                      description: "Something went wrong!",
                    });
                    setDisabled(false);
                  });
              }}
            />

            {/* Input Section */}
            {!showLoader && (
              <CardContent className="p-2 bg-black flex-shrink-0 border-none">
                <div className="flex w-full flex-row items-center justify-center bg-black">
                  <div className="cursor-pointer border-none px-2 py-1 pt-2 text-gray-400 hover:text-gray-800">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          onClick={() => {
                            const tmp = document.querySelector(
                              `[id="fileInput"]`
                            ) as HTMLInputElement;
                            tmp?.click();
                          }}
                        >
                          <div className={buttonVariants()}>
                            {" "}
                            <div className="flex flex-row gap-2">
                              <Upload className="size-[20px]" /> Publish to
                              Share!
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span>Upload Document</span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
};
export default Share;
