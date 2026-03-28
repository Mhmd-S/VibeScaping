"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DrawingBoardRef } from "../DrawingBoard";
import { GeneratedImage } from "@/app/types/annotation";
import Ai01, { type GeminiImageModel } from "@/components/ai-01";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { createWorkspace, updateLastOpened } from "@/app/utils/localWorkspace";
import { generateImage, buildAnnotationPrompt } from "@/app/utils/geminiClient";
import { getWorkspaceData, saveWorkspaceData } from "@/app/utils/db";
import { savePrompt } from "@/app/utils/promptHistory";
import { IconMessage } from "@tabler/icons-react";

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
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const userOverrodeSendSelected = useRef(false);
  const drawingBoardRef = useRef<DrawingBoardRef>(null);

  // Ensure we only run client-side code after mount
  useEffect(() => {
    setIsMounted(true);
    if (initialWorkspaceId && typeof window !== 'undefined') {
      setWorkspaceId(initialWorkspaceId);
    }
    
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    if (hasSelected) {
      // Auto-enable unless user manually toggled it off
      if (!userOverrodeSendSelected.current) {
        setSendSelectedOnly(true);
      }
    } else {
      setSendSelectedOnly(false);
      userOverrodeSendSelected.current = false;
    }
  }, []);

  const handleSubmitCore = async (
    prompt: string,
    model: GeminiImageModel,
    useSelectedOnly: boolean
  ) => {
    if (typeof window === 'undefined') return;
    if (!prompt.trim() || isLoading) return;

    if (!workspaceId) {
      handleFirstDraw();
    }

    setPrompt("");
    setIsLoading(true);

    try {
      let canvasExport;

      if (useSelectedOnly && hasSelectedElements) {
        canvasExport = await drawingBoardRef.current?.exportSelectedElementsAsImage();
        if (!canvasExport) {
          canvasExport = await drawingBoardRef.current?.exportCanvasAsImage();
        }
      } else {
        canvasExport = await drawingBoardRef.current?.exportCanvasAsImage();
      }

      if (!canvasExport) {
        throw new Error("Failed to export canvas, Chat");
      }

      // Get user session if available (for subscription mode)
      let userId: string | null = null;
      try {
        const sessionResponse = await fetch('/api/auth/session');
        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          userId = session?.user?.id || null;
        }
      } catch (error) {
        // Session fetch failed
        console.log('Session fetch failed');
      }

      // Call Gemini API via server
      const result = await generateImage(
        {
          prompt,
          imageBase64: canvasExport.image,
          mimeType: canvasExport.mimeType,
          model,
        },
        userId,
        workspaceId || undefined
      );

      if (!result.success) {
        throw new Error(
          result.error || result.details || "Failed to process request"
        );
      }

      if (result.image) {
        const base64Image = result.image.startsWith("data:")
          ? result.image
          : `data:${result.mimeType || "image/png"};base64,${result.image}`;

        const newImage: GeneratedImage = {
          image: base64Image,
          mimeType: result.mimeType || "image/png",
          description: prompt,
        };

        drawingBoardRef.current?.setImage(newImage);

        savePrompt(prompt);
        toast.success("Image updated successfully");
      } else {
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

  const handleSubmit = async (
    promptValue: string,
    model?: GeminiImageModel
  ) => {
    const currentPrompt = promptValue.trim();
    const modelToUse = model || selectedModel;
    await handleSubmitCore(currentPrompt, modelToUse, sendSelectedOnly);
  };

  const handleAnnotationSubmit = async (
    promptValue: string,
    model?: GeminiImageModel
  ) => {
    const annotationPrompt = buildAnnotationPrompt(promptValue);
    const modelToUse = model || selectedModel;
    // Always send full canvas for annotations (need full context)
    await handleSubmitCore(annotationPrompt, modelToUse, false);
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
    <div className="relative h-full w-full md:py-2 md:px-2 md:pr-2">
      {/* Mobile Menu Button - Top Left */}
      <div className="absolute top-20 left-2 z-50 md:hidden">
        <SidebarTrigger className="h-10 w-10 shadow-lg" />
      </div>

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
        <div className="absolute bottom-36 right-6 z-50 flex items-center gap-3 rounded-xl bg-card/95 backdrop-blur-sm border border-border shadow-lg px-4 py-3 animate-fade-in-up">
          <Spinner className="size-5 text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Generating...
          </p>
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
        onSendSelectedOnlyChange={(value: boolean) => {
          userOverrodeSendSelected.current = !value;
          setSendSelectedOnly(value);
        }}
        onAnnotationSubmit={handleAnnotationSubmit}
        isVisible={isMobile ? isChatVisible : true}
        onClose={isMobile ? () => setIsChatVisible(false) : undefined}
      />

      {/* Floating toggle button - shown when chat is hidden on mobile */}
      {isMobile && !isChatVisible && (
        <Button
          type="button"
          size="icon"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsChatVisible(true)}
        >
          <IconMessage className="size-6" />
        </Button>
      )}
    </div>
  );
};

export default DrawingBoardChat;
