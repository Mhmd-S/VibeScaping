"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DrawingBoardRef } from "../DrawingBoard";
import { GeneratedImage } from "@/app/types/annotation";
import Ai01, { type GeminiImageModel } from "@/components/ai-01";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { createWorkspace, updateLastOpened } from "@/app/utils/localWorkspace";
import { generateImage } from "@/app/utils/geminiClient";
import { getApiKey } from "@/app/utils/apiKey";
import { getWorkspaceData, saveWorkspaceData } from "@/app/utils/db";

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

const DrawingBoardChat = ({
  workspaceId: initialWorkspaceId,
}: DrawingBoardChatProps) => {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(
    typeof window !== 'undefined' ? (initialWorkspaceId || undefined) : undefined
  );
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [selectedModel, setSelectedModel] = useState<GeminiImageModel>(
    "gemini-3-pro-image-preview"
  );
  const [isMounted, setIsMounted] = useState(false);
  const [hasSelectedElements, setHasSelectedElements] = useState(false);
  const [sendSelectedOnly, setSendSelectedOnly] = useState(false);
  const drawingBoardRef = useRef<DrawingBoardRef>(null);

  // Ensure we only run client-side code after mount
  useEffect(() => {
    setIsMounted(true);
    if (initialWorkspaceId && typeof window !== 'undefined') {
      setWorkspaceId(initialWorkspaceId);
    }
  }, [initialWorkspaceId]);

  // Check for selected elements on mount (fallback if onChange doesn't fire)
  useEffect(() => {
    if (!isMounted || !drawingBoardRef.current) return;

    const checkSelectedElements = () => {
      if (drawingBoardRef.current) {
        const hasSelected = drawingBoardRef.current?.hasSelectedElements() || false;
        setHasSelectedElements(hasSelected);
      }
    };

    // Check after a short delay to ensure Excalidraw is ready
    const timeout = setTimeout(checkSelectedElements, 500);

    return () => clearTimeout(timeout);
  }, [isMounted]);

  // Create workspace on first draw if none exists
  const handleFirstDraw = useCallback(async () => {
    if (typeof window === 'undefined') return;
    // If we already have an ID, don't create another one
    if (workspaceId) return;

    try {
      // 1. Create the workspace metadata in localStorage
      const newWorkspace = createWorkspace("New Landscaping Project");

      // 2. IMPORTANT: Move any temp drawings from "anonymous_temp" to the new ID in IndexedDB
      // This ensures the drawing doesn't vanish when the ID switches
      const tempData = await getWorkspaceData("anonymous_temp");
      if (tempData) {
        await saveWorkspaceData(newWorkspace.id, tempData);
      }

      // 3. Update the URL. This will trigger the DrawingBoard's useEffect to 'load' the new ID
      router.replace(`/chat?workspaceId=${newWorkspace.id}`);
      updateLastOpened(newWorkspace.id);
    } catch (error) {
      console.error("Failed to transition to new workspace", error);
    }
  }, [workspaceId, router]);

  const handleImageUpdate = useCallback((image: GeneratedImage) => {
    setCurrentImage(image);
  }, []);

  const handleError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const handleSelectionChange = useCallback((hasSelected: boolean) => {
    setHasSelectedElements(hasSelected);
    // Reset sendSelectedOnly if no elements are selected
    if (!hasSelected) {
      setSendSelectedOnly(false);
    }
  }, []);

  const handleSubmit = async (
    promptValue: string,
    model?: GeminiImageModel
  ) => {
    if (typeof window === 'undefined') return;
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
    const modelToUse = model || selectedModel;
    setPrompt("");
    setIsLoading(true);

    try {
      // Use user's preference for sending selected only or full canvas
      let canvasExport;

      if (sendSelectedOnly && hasSelectedElements) {
        // Export only selected elements
        canvasExport = await drawingBoardRef.current?.exportSelectedElementsAsImage();
        if (!canvasExport) {
          // Fallback to full canvas if selected export fails
          canvasExport = await drawingBoardRef.current?.exportCanvasAsImage();
        }
      } else {
        // Export full canvas
        canvasExport = await drawingBoardRef.current?.exportCanvasAsImage();
      }

      if (!canvasExport) {
        console.log("Canvas Export", canvasExport);
        throw new Error("Failed to export canvas, Chat");
      }

      // Call Gemini API directly from client
      const result = await generateImage({
        prompt: currentPrompt,
        imageBase64: canvasExport.image,
        mimeType: canvasExport.mimeType,
        model: modelToUse,
      });

      if (!result.success) {
        throw new Error(
          result.error || result.details || "Failed to process request"
        );
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
    if (typeof window === 'undefined') return;
    
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

  // Don't render until mounted to avoid SSR issues
  if (!isMounted) {
    return (
      <div className="relative py-2 pr-2 h-full flex items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="relative py-2 pr-2 h-full">
      {/* Drawing Board */}
      <ExcalidrawWrapper
        ref={drawingBoardRef}
        initialImage={currentImage}
        onImageUpdate={handleImageUpdate}
        onError={handleError}
        workspaceId={workspaceId}
        onFirstDraw={handleFirstDraw}
        onSelectionChange={handleSelectionChange}
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

      {/* Chat Input */}
      <Ai01
        value={prompt}
        onChange={setPrompt}
        onSubmit={handleSubmit}
        onFileSelect={handleFileSelect}
        placeholder="Describe what you want to create or modify..."
        showTitle={false}
        isLoading={isLoading}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        hasSelectedElements={hasSelectedElements}
        sendSelectedOnly={sendSelectedOnly}
        onSendSelectedOnlyChange={setSendSelectedOnly}
      />
    </div>
  );
};

export default DrawingBoardChat;
