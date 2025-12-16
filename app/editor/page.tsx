"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { AnnotationEditor } from "../components/AnnotationEditor";
import { ChatSidebar } from "../components/chat/ChatSidebar";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MessageSquare } from "lucide-react";
import { GeneratedImage, RevisionNode } from "../types/annotation";

type RemoteAnnotatedImage = {
  id: string;
  generatedImageUrl: string;
  originalImageUrl?: string | null;
  mimeType?: string | null;
  description?: string | null;
  revisionHistory?: RevisionNode[] | null;
  createdAt?: string;
};

const publicImageBaseUrl =
  process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
  process.env.CLOUDFLARE_R2_PUBLIC_URL;

const toPublicImageUrl = (originalUrl?: string | null) => {
  if (!originalUrl) return undefined;
  if (!publicImageBaseUrl) return originalUrl;

  try {
    const parsed = new URL(originalUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (segments.length === 0) return originalUrl;

    const keyPath =
      segments[0] === "workspaces"
        ? segments.join("/")
        : segments.slice(1).join("/") || segments[0];
    const normalizedBase = publicImageBaseUrl.replace(/\/$/, "");

    return `${normalizedBase}/${keyPath}`;
  } catch (error) {
    console.warn(
      "Failed to build public image URL, falling back to original",
      error
    );
    return originalUrl;
  }
};

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const toBase64Payload = (value: string) => {
  if (value.startsWith("data:")) {
    const [, base64Part] = value.split(",", 2);
    return base64Part || "";
  }
  return value;
};

const buildGeneratedImageFromAnnotatedImage = (
  annotatedImage: RemoteAnnotatedImage
): GeneratedImage => ({
  image:
    toPublicImageUrl(annotatedImage.generatedImageUrl) ||
    annotatedImage.generatedImageUrl,
  mimeType: annotatedImage.mimeType || "image/png",
  description: annotatedImage.description ?? undefined,
});

const buildOriginalCapturedImageFromAnnotatedImage = (
  annotatedImage: RemoteAnnotatedImage
): GeneratedImage | null => {
  if (!annotatedImage.originalImageUrl) return null;
  return {
    image:
      toPublicImageUrl(annotatedImage.originalImageUrl) ||
      annotatedImage.originalImageUrl,
    mimeType: annotatedImage.mimeType || "image/png",
    description: "Original image",
  };
};

const mapAnnotatedImagesToEditorState = (
  annotatedImages: RemoteAnnotatedImage[]
) => {
  if (!annotatedImages.length) {
    throw new Error("No annotated images found for this workspace.");
  }

  const sorted = [...annotatedImages].sort((a, b) => {
    const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
    return aTs - bTs;
  });

  const originalAnnotatedImageWithImage = sorted.find(
    (annotatedImage) => !!annotatedImage.originalImageUrl
  );
  const originalPayload = originalAnnotatedImageWithImage
    ? buildOriginalCapturedImageFromAnnotatedImage(
        originalAnnotatedImageWithImage
      )
    : null;

  const revisionHistory = sorted.map((annotatedImage, index) => {
    const image =
      toPublicImageUrl(annotatedImage.generatedImageUrl) ||
      annotatedImage.generatedImageUrl;
    const timestamp = annotatedImage.createdAt
      ? Date.parse(annotatedImage.createdAt)
      : Date.now();
    return {
      id: annotatedImage.id || `rev-${index}`,
      parentId: index === 0 ? null : sorted[index - 1]?.id ?? null,
      image,
      mimeType: annotatedImage.mimeType || "image/png",
      annotations: [],
      timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp,
      label: annotatedImage.description || `Image ${index + 1}`,
    } satisfies RevisionNode;
  });

  const latestAnnotatedImage = sorted[sorted.length - 1];
  const generatedPayload =
    buildGeneratedImageFromAnnotatedImage(latestAnnotatedImage);
  const currentRevisionId =
    revisionHistory[revisionHistory.length - 1]?.id ?? null;

  return {
    generatedPayload,
    originalPayload,
    revisionHistory,
    currentRevisionId,
  };
};

const EditorPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceIdFromQuery = searchParams.get("workspaceId");
  const [workspaceId, setWorkspaceId] = useState("");
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(
    null
  );
  const [originalCapturedImage, setOriginalCapturedImage] =
    useState<GeneratedImage | null>(null);
  const [revisionHistory, setRevisionHistory] = useState<RevisionNode[]>([]);
  const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isSavingToWorkspace, setIsSavingToWorkspace] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (!workspaceIdFromQuery) {
      setLoadError("Missing workspace. Open a workspace to continue.");
      setWorkspaceId("");
      return;
    }
    setWorkspaceId(workspaceIdFromQuery);
  }, [workspaceIdFromQuery]);

  const loadAnnotatedImagesForWorkspace = useCallback(
    async (workspaceId: string) => {
      setIsLoadingImage(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/images`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Unable to load images for this workspace"
          );
        }

        const annotatedImages: RemoteAnnotatedImage[] =
          data.annotatedImages ?? [];
        const {
          generatedPayload,
          originalPayload,
          revisionHistory: mappedHistory,
          currentRevisionId,
        } = mapAnnotatedImagesToEditorState(annotatedImages);

        setGeneratedImage(generatedPayload);
        setOriginalCapturedImage(originalPayload);
        setRevisionHistory(mappedHistory);
        setCurrentRevisionId(currentRevisionId);
      } catch (err) {
        setGeneratedImage(null);
        setOriginalCapturedImage(null);
        setRevisionHistory([]);
        setCurrentRevisionId(null);
        setLoadError(
          err instanceof Error ? err.message : "Unable to load images"
        );
      } finally {
        setIsLoadingImage(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!workspaceId) {
      return;
    }
    loadAnnotatedImagesForWorkspace(workspaceId);
  }, [workspaceId, loadAnnotatedImagesForWorkspace]);

  const autoSaveAnnotatedImage = useCallback(
    async (overrides?: {
      generatedImage?: GeneratedImage;
      revisionHistory?: RevisionNode[];
      currentRevisionId?: string | null;
      workspaceId?: string | null;
    }) => {
      if (isSavingToWorkspace) return;

      const targetWorkspaceId = overrides?.workspaceId ?? workspaceId;
      const imagePayload = overrides?.generatedImage ?? generatedImage;
      const revisionPayload = overrides?.revisionHistory ?? revisionHistory;

      if (!targetWorkspaceId) {
        return;
      }

      if (!imagePayload) {
        setSaveErrorMessage("Nothing to save yet.");
        return;
      }

      if (isHttpUrl(imagePayload.image)) {
        setSaveErrorMessage(
          "This image is already stored on the CDN. Make edits to create a new revision before saving."
        );
        return;
      }

      const generatedImageBase64 = toBase64Payload(imagePayload.image);
      const originalImageBase64 =
        originalCapturedImage && !isHttpUrl(originalCapturedImage.image)
          ? toBase64Payload(originalCapturedImage.image)
          : undefined;

      setIsSavingToWorkspace(true);
      setSaveSuccessMessage(null);
      setSaveErrorMessage(null);

      try {
        const response = await fetch(
          `/api/workspaces/${targetWorkspaceId}/images`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              generatedImageBase64,
              generatedMimeType: imagePayload.mimeType,
              originalImageBase64,
              originalMimeType: originalImageBase64
                ? originalCapturedImage?.mimeType
                : undefined,
              revisionHistory: revisionPayload,
              description: imagePayload.description,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Unable to save annotated image");
        }

        setSaveSuccessMessage("Progress saved to workspace and CDN");
      } catch (err) {
        setSaveErrorMessage(
          err instanceof Error ? err.message : "Unable to save annotated image"
        );
      } finally {
        setIsSavingToWorkspace(false);
      }
    },
    [
      workspaceId,
      generatedImage,
      originalCapturedImage,
      revisionHistory,
      isSavingToWorkspace,
    ]
  );

  const handleRevisionComplete = useCallback(
    async (data: {
      image: string;
      mimeType: string;
      description?: string;
      annotations: string[];
    }) => {
      const newRevisionId = `rev-${Date.now()}`;
      const newRevision: RevisionNode = {
        id: newRevisionId,
        parentId: currentRevisionId,
        image: data.image,
        mimeType: data.mimeType,
        annotations: data.annotations,
        timestamp: Date.now(),
        label: `Revision ${revisionHistory.length}`,
      };

      const updatedHistory = [...revisionHistory, newRevision];
      setGeneratedImage({
        image: data.image,
        mimeType: data.mimeType,
        description: data.description,
      });
      setRevisionHistory(updatedHistory);
      setCurrentRevisionId(newRevisionId);

      const nextGeneratedImage = {
        image: data.image,
        mimeType: data.mimeType,
        description: data.description,
      };

      await autoSaveAnnotatedImage({
        generatedImage: nextGeneratedImage,
        revisionHistory: updatedHistory,
        currentRevisionId: newRevisionId,
      });
    },
    [currentRevisionId, revisionHistory, autoSaveAnnotatedImage]
  );

  const handleRetryLoad = useCallback(() => {
    if (workspaceId) {
      loadAnnotatedImagesForWorkspace(workspaceId);
      return;
    }
    router.push("/chat");
  }, [loadAnnotatedImagesForWorkspace, workspaceId, router]);

  const handleSaveToWorkspace = useCallback(async () => {
    if (!workspaceId) {
      setSaveErrorMessage("Missing workspace context.");
      return;
    }
    await autoSaveAnnotatedImage();
  }, [workspaceId, autoSaveAnnotatedImage]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-lg bg-card p-8 shadow-lg">
          <h2 className="mb-3 text-xl font-semibold text-card-foreground">
            Nothing to Annotate
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/workspaces")}>
              Go to workspaces
            </Button>
            <Button variant="outline" onClick={handleRetryLoad}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingImage || !generatedImage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-lg bg-card p-8 shadow-lg">
          <div className="text-sm text-muted-foreground">
            {isLoadingImage ? "Loading image..." : "No image available yet."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen bg-background">
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-2 border-b border-border bg-card/40 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-wide text-primary">
                Persistence
              </p>
              <p className="text-sm text-card-foreground">
                Saving annotations for workspace{" "}
                {workspaceId || "(select a workspace)"}.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChatOpen(!isChatOpen)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {isChatOpen ? "Hide Chat" : "Show Chat"}
              </Button>
              <Button
                type="button"
                onClick={handleSaveToWorkspace}
                disabled={isSavingToWorkspace || !workspaceId}
              >
                {isSavingToWorkspace ? "Saving..." : "Save to workspace"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {saveErrorMessage && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{saveErrorMessage}</AlertDescription>
              </Alert>
            )}
            {saveSuccessMessage && (
              <Alert className="py-2">
                <AlertDescription>{saveSuccessMessage}</AlertDescription>
              </Alert>
            )}
          </div>
          <AnnotationEditor
            generatedImage={generatedImage}
            originalCapturedImage={originalCapturedImage}
            onCancel={() => {
              router.push("/workspaces");
            }}
            onRevisionComplete={handleRevisionComplete}
            onError={(message) => setErrorMessage(message)}
          />
        </div>
        <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {errorMessage && (
          <Alert
            variant="destructive"
            className="fixed top-20 right-4 max-w-md shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <AlertTitle>Revision Error</AlertTitle>
                <AlertDescription className="mt-1 whitespace-pre-line">
                  {errorMessage}
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setErrorMessage(null)}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default EditorPage;
