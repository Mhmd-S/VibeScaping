"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DrawingBoardRef } from "../DrawingBoard";
import { GeneratedImage } from "@/app/types/annotation";
import Ai01 from "@/components/ai-01";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { createWorkspace, updateLastOpened } from "@/app/utils/localWorkspace";
import { generateImage } from "@/app/utils/geminiClient";
import { getApiKey } from "@/app/utils/apiKey";

import dynamic from "next/dynamic";

// Since client components get prerenderd on server as well hence importing
// the excalidraw stuff dynamically with ssr false

const ExcalidrawWrapper = dynamic(
  async () => (await import("../DrawingBoard")).default,
  {
    ssr: false,
  }
);

interface DrawingBoardChatProps {
  workspaceId?: string;
}

const DrawingBoardChat = ({ workspaceId: initialWorkspaceId }: DrawingBoardChatProps) => {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(initialWorkspaceId || undefined);
  const [hasCreatedWorkspace, setHasCreatedWorkspace] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const drawingBoardRef = useRef<DrawingBoardRef>(null);

  // Create workspace on first draw if none exists
  const handleFirstDraw = useCallback(() => {
    if (hasCreatedWorkspace || workspaceId) return;

    const newWorkspace = createWorkspace();
    setWorkspaceId(newWorkspace.id);
    setHasCreatedWorkspace(true);
    router.push(`/chat?workspaceId=${newWorkspace.id}`);
    updateLastOpened(newWorkspace.id);
  }, [hasCreatedWorkspace, workspaceId, router]);

  const handleImageUpdate = useCallback((image: GeneratedImage) => {
    setCurrentImage(image);
  }, []);

  const handleError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const handleSubmit = async (promptValue: string) => {
    if (!promptValue.trim() || isLoading) return;

    // Check for API key
    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error("Please configure your Gemini API key in settings");
      return;
    }

    // Ensure workspace exists
    if (!workspaceId) {
      handleFirstDraw();
    }

    const currentPrompt = promptValue.trim();
    setPrompt("");
    setIsLoading(true);

    try {
      // Export current canvas state
      const canvasExport = await drawingBoardRef.current?.exportCanvasAsImage();

      if (!canvasExport) {
        console.log("Canvas Export", canvasExport);
        throw new Error("Failed to export canvas, Chat");
      }

      // Call Gemini API directly from client
      const result = await generateImage({
        prompt: currentPrompt,
        imageBase64: canvasExport.image,
        mimeType: canvasExport.mimeType,
      });

      if (!result.success) {
        throw new Error(result.error || result.details || "Failed to process request");
      }

      // If we got an image back, update the drawing board
      if (result.image) {
        const base64Image = result.image.startsWith("data:")
          ? result.image
          : `data:${result.mimeType || "image/png"};base64,${result.image}`;

        const newImage: GeneratedImage = {
          image: base64Image,
          mimeType: result.mimeType || "image/png",
          description: currentPrompt,
        };

        // Update drawing board with new image
        drawingBoardRef.current?.setImage(newImage);

        toast.success("Image updated successfully");
      } else {
        // If no image but we have a message, it's a text response (shouldn't happen in drawing mode, but handle it)
        toast.info("Response received");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process request";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    // Use the first image file
    const file = imageFiles[0];
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newImage: GeneratedImage = {
          image: dataUrl,
          mimeType: file.type,
          description: file.name,
        };
        drawingBoardRef.current?.setImage(newImage);
        setCurrentImage(newImage);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      handleError("Failed to load image");
    }
  };

  return (
    <div className="relative py-2 pr-2 h-full">
      {/* Drawing Board */}
      <div className="relative">
        <ExcalidrawWrapper
          ref={drawingBoardRef}
          initialImage={currentImage}
          onImageUpdate={handleImageUpdate}
          onError={handleError}
          workspaceId={workspaceId}
          onFirstDraw={handleFirstDraw}
        />
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="size-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating your image...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
        <Ai01
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
          onFileSelect={handleFileSelect}
          placeholder="Describe what you want to create or modify..."
          showTitle={false}
          isLoading={isLoading}
        />
    </div>
  );
};

export default DrawingBoardChat;
