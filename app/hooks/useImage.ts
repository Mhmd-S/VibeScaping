import { useEffect, useState } from "react";

/**
 * Hook to load an image from a source URL and return HTMLImageElement
 */
export const useImage = (
  src: string,
  crossOrigin: string = "Anonymous"
): [HTMLImageElement | null, "loading" | "loaded" | "failed"] => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    "loading"
  );

  useEffect(() => {
    if (!src) {
      setImage(null);
      setStatus("failed");
      return;
    }

    const img = new window.Image();
    img.crossOrigin = crossOrigin;

    const handleLoad = () => {
      setImage(img);
      setStatus("loaded");
    };

    const handleError = () => {
      setImage(null);
      setStatus("failed");
    };

    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);
    img.src = src;

    return () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, [src, crossOrigin]);

  return [image, status];
};

