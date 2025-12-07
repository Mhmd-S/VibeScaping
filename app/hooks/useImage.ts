import { useEffect, useState } from "react";

/**
 * Hook to load an image from a source URL and return HTMLImageElement
 */
export const useImage = (src: string) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setImage(img);
    };
    img.src = src;
  }, [src]);
  
  return image;
};

