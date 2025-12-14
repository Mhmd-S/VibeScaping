"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useRouter, useSearchParams } from "next/navigation";
import html2canvas from 'html2canvas-pro';
import { X, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { useCurrentLocation } from "@/app/hooks/useCurrentLocation";
import { usePolygonDrawing } from "@/app/hooks/usePolygonDrawing";
import { saveGenerationSession } from "@/app/utils/generationSession";
import { Location } from "@/app/types/landscape";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const mapContainerStyle = {
  width: "100%",
  height: "100vh",
};

const defaultZoom = 15;
const fallbackCenter: Location = {
  lat: 37.0902,
  lng: -95.7129,
};

const MapView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { location, loading, error } = useCurrentLocation();
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchedLocation, setIsSearchedLocation] = useState(false);

  const {
    mapRef,
    drawnPolygon,
    polygonPath,
    isDrawingMode,
    isDrawing,
    toggleDrawingMode,
    clearPolygon,
    onMapLoad,
    hidePolygonOverlays,
    setPolygonPath,
  } = usePolygonDrawing();
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  type GoogleMapsLibrary = "drawing" | "geometry" | "places" | "visualization";
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const libraries: GoogleMapsLibrary[] = ["geometry", "places"];

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-maps-script",
    googleMapsApiKey,
    libraries,
  });

  useEffect(() => {
    if (location && !mapCenter) {
      setMapCenter(location);
      setIsSearchedLocation(false);
    }
  }, [location, mapCenter]);

  useEffect(() => {
    if (isDrawingMode) {
      const message = isDrawing
        ? "Move mouse to draw. Click near the green dot to close, or click anywhere to finish"
        : "Click to start drawing, then move mouse";
      toast.info(message, {
        id: "drawing-mode",
        duration: Infinity,
      });
    } else {
      toast.dismiss("drawing-mode");
    }
  }, [isDrawingMode, isDrawing]);

  const captureImage = useCallback(async () => {
    const projectId = searchParams.get("projectId");
    if (!mapRef.current || !drawnPolygon || polygonPath.length === 0) {
      alert("Please draw a polygon first");
      return;
    }

    const mapElement = mapRef.current.getDiv();
    if (!mapElement) {
      alert("Could not find map element");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      if (mapRef.current.setHeading) {
        mapRef.current.setHeading(0);
      }
      if (mapRef.current.setTilt) {
        mapRef.current.setTilt(0);
      }

      const bounds = new google.maps.LatLngBounds();
      polygonPath.forEach((coord) => {
        bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
      });
      mapRef.current.fitBounds(bounds, 50);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const restoreOverlays = hidePolygonOverlays();

      const waitForMapRender = () =>
        new Promise<void>((resolve) => {
          if (!mapRef.current) {
            resolve();
            return;
          }

          let resolved = false;
          const timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            resolve();
          }, 300);

          google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);
            resolve();
          });

          requestAnimationFrame(() => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);
            resolve();
          });
        });

      const waitForNextPaint = () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });

      await waitForMapRender();
      await waitForNextPaint();

      let canvas: HTMLCanvasElement | null = null;
      try {
        // Get computed RGB values for CSS custom properties from the original document
        const tempEl = document.createElement('div');
        tempEl.style.position = 'absolute';
        tempEl.style.visibility = 'hidden';
        document.body.appendChild(tempEl);
        
        const cssVars = [
          'background', 'foreground', 'card', 'card-foreground',
          'popover', 'popover-foreground', 'primary', 'primary-foreground',
          'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
          'accent', 'accent-foreground', 'destructive', 'border', 'input', 'ring',
          'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
          'sidebar', 'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground',
          'sidebar-accent', 'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring'
        ];
        
        const computedVars: Record<string, string> = {};
        cssVars.forEach((varName) => {
          try {
            const computed = window.getComputedStyle(tempEl);
            tempEl.style.backgroundColor = `var(--${varName})`;
            const rgbValue = computed.backgroundColor;
            if (rgbValue && rgbValue !== 'rgba(0, 0, 0, 0)' && rgbValue !== 'transparent') {
              computedVars[varName] = rgbValue;
            }
          } catch (e) {
            // Ignore errors
          }
        });
        
        document.body.removeChild(tempEl);
        
        canvas = await html2canvas(mapElement, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          logging: false,
          backgroundColor: null,
          onclone: (clonedDoc) => {
            // Inject a style override to replace CSS custom properties with computed RGB values
            const overrideStyle = clonedDoc.createElement('style');
            const varOverrides = Object.entries(computedVars)
              .map(([name, value]) => `--${name}: ${value} !important;`)
              .join('\n');
            
            overrideStyle.textContent = `
              :root, .dark {
                ${varOverrides}
              }
            `;
            const head = clonedDoc.head || clonedDoc.documentElement;
            head.appendChild(overrideStyle);
          },
        });
      } finally {
        restoreOverlays();
      }

      if (!canvas) {
        throw new Error("Failed to capture map image");
      }

      const projection = mapRef.current.getProjection();
      if (!projection) {
        throw new Error("Could not get map projection");
      }

      const mapBounds = mapRef.current.getBounds();
      if (!mapBounds) {
        throw new Error("Could not get map bounds");
      }

      const ne = mapBounds.getNorthEast();
      const sw = mapBounds.getSouthWest();
      const nePoint = projection.fromLatLngToPoint(ne);
      const swPoint = projection.fromLatLngToPoint(sw);

      if (!nePoint || !swPoint) {
        throw new Error("Could not convert bounds to world coordinates");
      }

      const pixelPoints: { x: number; y: number }[] = [];
      polygonPath.forEach((coord) => {
        const latLng = new google.maps.LatLng(coord.lat, coord.lng);
        const point = projection.fromLatLngToPoint(latLng);

        if (!point) return;

        const normalizedX = (point.x - swPoint.x) / (nePoint.x - swPoint.x);
        const normalizedY = (point.y - nePoint.y) / (swPoint.y - nePoint.y);

        const x = normalizedX * canvas.width;
        const y = normalizedY * canvas.height;
        pixelPoints.push({ x, y });
      });

      const minX = Math.min(...pixelPoints.map((p) => p.x));
      const maxX = Math.max(...pixelPoints.map((p) => p.x));
      const minY = Math.min(...pixelPoints.map((p) => p.y));
      const maxY = Math.max(...pixelPoints.map((p) => p.y));

      const computeDominantAxisAngle = (
        points: { x: number; y: number }[]
      ): number => {
        if (points.length < 2) return 0;

        const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

        let sxx = 0;
        let syy = 0;
        let sxy = 0;

        points.forEach((p) => {
          const dx = p.x - meanX;
          const dy = p.y - meanY;
          sxx += dx * dx;
          syy += dy * dy;
          sxy += dx * dy;
        });

        const angleRad = 0.5 * Math.atan2(2 * sxy, sxx - syy);
        return (angleRad * 180) / Math.PI;
      };

      const rotateCanvas = (source: HTMLCanvasElement, angleDeg: number) => {
        if (!angleDeg) return source;

        const angleRad = (angleDeg * Math.PI) / 180;
        const sin = Math.abs(Math.sin(angleRad));
        const cos = Math.abs(Math.cos(angleRad));

        const newWidth = Math.ceil(source.width * cos + source.height * sin);
        const newHeight = Math.ceil(source.height * cos + source.width * sin);

        const rotated = document.createElement("canvas");
        rotated.width = newWidth;
        rotated.height = newHeight;
        const ctx = rotated.getContext("2d");
        if (!ctx) {
          return source;
        }

        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(angleRad);
        ctx.drawImage(source, -source.width / 2, -source.height / 2);

        return rotated;
      };

      const croppedCanvas = document.createElement("canvas");
      const croppedWidth = maxX - minX;
      const croppedHeight = maxY - minY;
      croppedCanvas.width = croppedWidth;
      croppedCanvas.height = croppedHeight;
      const croppedCtx = croppedCanvas.getContext("2d");
      if (!croppedCtx) {
        throw new Error("Could not get canvas context");
      }

      croppedCtx.save();
      croppedCtx.beginPath();
      pixelPoints.forEach((point, index) => {
        const x = point.x - minX;
        const y = point.y - minY;
        if (index === 0) {
          croppedCtx.moveTo(x, y);
        } else {
          croppedCtx.lineTo(x, y);
        }
      });
      croppedCtx.closePath();
      croppedCtx.clip();
      croppedCtx.drawImage(
        canvas,
        minX,
        minY,
        croppedWidth,
        croppedHeight,
        0,
        0,
        croppedWidth,
        croppedHeight
      );
      croppedCtx.restore();

      const dominantAngle = computeDominantAxisAngle(pixelPoints);
      const rotatedCanvas = rotateCanvas(croppedCanvas, -dominantAngle);

      const dataUrl = rotatedCanvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];

      const response = await fetch("/api/generate-landscape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: "image/png",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.details || data.error || "Failed to generate landscape";
        const error = new Error(errorMessage);
        if (data.apiError) {
          (error as any).apiError = data.apiError;
        }
        throw error;
      }

      const projectId = searchParams.get("projectId");
      if (!projectId) {
        throw new Error(
          "Missing project. Please start from the dashboard to save your design."
        );
      }

      const persistResponse = await fetch(
        `/api/projects/${projectId}/designs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            generatedImageBase64: data.image,
            generatedMimeType: data.mimeType,
            originalImageBase64: base64,
            originalMimeType: "image/png",
            revisionHistory: [],
            description: data.description,
          }),
        }
      );

      const persisted = await persistResponse.json();
      if (!persistResponse.ok) {
        const persistError =
          persisted?.details ||
          persisted?.error ||
          "Failed to save design to project";
        throw new Error(persistError);
      }

      const rootRevisionId = `rev-${Date.now()}`;

      saveGenerationSession({
        generatedImage: {
          image: data.image,
          mimeType: data.mimeType,
          description: data.description,
        },
        originalCapturedImage: {
          image: base64,
          mimeType: "image/png",
          description: "Original map capture",
        },
        revisionHistory: [
          {
            id: rootRevisionId,
            parentId: null,
            image: data.image,
            mimeType: data.mimeType,
            annotations: [],
            timestamp: Date.now(),
            label: "Original",
          },
        ],
        currentRevisionId: rootRevisionId,
        isReplicaApproved: false,
        projectId: projectId || null,
      });

      router.push(projectId ? `/editor?projectId=${projectId}` : "/editor");
    } catch (err) {
      setGenerateError(
        err instanceof Error
          ? err.message
          : "Failed to generate landscape. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    drawnPolygon,
    polygonPath,
    mapRef,
    hidePolygonOverlays,
    router,
    searchParams,
  ]);

  const handleClearPolygon = useCallback(() => {
    clearPolygon();
    setPolygonPath([]);
  }, [clearPolygon, setPolygonPath]);

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      onMapLoad(map);
      geocoderRef.current = new google.maps.Geocoder();
      const center = mapCenter || location;
      if (center) {
        map.panTo(center);
      }
      setIsMapLoaded(true);
    },
    [mapCenter, onMapLoad, location]
  );

  const parseCoordinates = useCallback((value: string): Location | null => {
    const trimmed = value.trim();
    const coordMatch = trimmed.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (!coordMatch) return null;
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[3]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }, []);

  const searchAddress = useCallback(async () => {
    if (isGenerating) {
      setSearchError("Landscape generation in progress. Please wait.");
      return;
    }

    const query = searchQuery.trim();
    if (!query) {
      setSearchError("Please enter an address to search.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const directCoords = parseCoordinates(query);
      if (directCoords) {
        setMapCenter(directCoords);
        setIsSearchedLocation(true);
        if (mapRef.current) {
          mapRef.current.panTo(directCoords);
          mapRef.current.setZoom(17);
        }
        return;
      }

      if (!geocoderRef.current) {
        setSearchError("Map is still loading. Please wait a moment.");
        return;
      }

      const results = await new Promise<google.maps.GeocoderResult[]>(
        (resolve, reject) => {
          geocoderRef.current?.geocode(
            { address: query },
            (geocodeResults, status) => {
              if (status === "OK" && geocodeResults) {
                resolve(geocodeResults);
                return;
              }
              if (status === "ZERO_RESULTS") {
                reject(new Error("No results found for that address."));
                return;
              }
              reject(
                new Error(
                  `Geocoding failed: ${
                    status || "UNKNOWN_ERROR"
                  }. Ensure Geocoding API is enabled for your key.`
                )
              );
            }
          );
        }
      );

      if (!results || results.length === 0) {
        setSearchError("No results found for that address.");
        return;
      }

      const resultLocation = results[0].geometry.location;
      const nextCenter: Location = {
        lat: resultLocation.lat(),
        lng: resultLocation.lng(),
      };

      setMapCenter(nextCenter);
      setIsSearchedLocation(true);
      if (mapRef.current) {
        mapRef.current.panTo(nextCenter);
        mapRef.current.setZoom(17);
      }
    } catch (searchErr) {
      setSearchError(
        searchErr instanceof Error
          ? searchErr.message
          : "Unable to find that address."
      );
    } finally {
      setIsSearching(false);
    }
  }, [isGenerating, searchQuery, mapRef]);

  if (!googleMapsApiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-sans">
        <div className="rounded-lg bg-card p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-card-foreground">
            Google Maps API Key Required
          </h2>
          <p className="text-muted-foreground">
            Please set the NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-sans">
        <div className="rounded-lg bg-card p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-card-foreground">
            Google Maps failed to load
          </h2>
          <p className="text-muted-foreground">
            {loadError.message || "Please refresh and try again."}
          </p>
        </div>
      </div>
    );
  }

  const activeCenter = mapCenter || location || fallbackCenter;
  const markerPosition = mapCenter || location;
  const shouldShowMarker = markerPosition && !isSearchedLocation;

  return (
    <div className="relative min-h-screen w-full">
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={activeCenter}
          zoom={defaultZoom}
          onLoad={handleMapLoad}
          options={{
            tilt: 0,
            mapTypeId: "satellite",
            mapTypeControl: false,
            fullscreenControl: false,
            rotateControl: true,
            streetViewControl: false,
            zoomControl: true,
          }}
        >
          {shouldShowMarker && (
            <Marker position={markerPosition} title="Selected Location" />
          )}
        </GoogleMap>
      )}

      <div className="pointer-events-none absolute left-0 right-0 top-3 z-10 px-4 sm:top-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="pointer-events-auto w-full rounded-xl bg-card/95 p-4 shadow-lg backdrop-blur sm:max-w-lg lg:max-w-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-card-foreground">
                  Choose a location
                </p>
                <p className="text-xs text-muted-foreground">
                  Search by address or use your current location
                </p>
              </div>
              {loading && (
                <span className="text-xs text-primary">
                  Detecting location...
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    searchAddress();
                  }
                }}
                disabled={isGenerating}
                placeholder="Enter an address, city, or coordinates"
                className="w-full flex-1"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={searchAddress}
                  disabled={isSearching || isGenerating}
                  className="shrink-0"
                >
                  {isSearching ? "Searching..." : "Find"}
                </Button>
              </div>
            </div>
            {(searchError || error) && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription className="text-xs">
                  {searchError || error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div
            className={`
                            pointer-events-auto w-full rounded-xl bg-card/95 p-4 shadow-lg backdrop-blur sm:max-w-sm md:w-80 md:shrink-0
                            fixed bottom-0 left-4 right-4 z-20
                            sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:z-auto
                            ${
                              isGenerating
                                ? "pointer-events-none opacity-80"
                                : ""
                            }
                        `}
            style={{
              // Only add maxWidth on sm and up, else use full width
              maxWidth: undefined,
            }}
          >
            <div className="flex flex-col gap-2">
              <Button
                onClick={drawnPolygon ? captureImage : toggleDrawingMode}
                disabled={drawnPolygon ? isGenerating : false}
                variant={
                  isDrawingMode
                    ? "destructive"
                    : drawnPolygon
                    ? "default"
                    : "outline"
                }
                className="w-full"
              >
                {drawnPolygon
                  ? isGenerating
                    ? "Generating..."
                    : "Generate Landscape Map"
                  : isDrawingMode
                  ? "Stop Drawing"
                  : "Start Freehand Drawing"}
                {drawnPolygon && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
              <Button
                onClick={handleClearPolygon}
                disabled={!drawnPolygon}
                variant="outline"
                className="w-full"
              >
                Clear Area
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto mb-2 flex justify-end absolute bottom-4 left-4">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="bg-card/95 backdrop-blur"
        >
            <ArrowLeft className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>

      {isMapLoaded && (
        <>
          {generateError && (
            <Alert
              variant="destructive"
              className="absolute top-4 right-4 max-w-md shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <AlertTitle>Generation Error</AlertTitle>
                  <AlertDescription className="mt-1 whitespace-pre-line text-xs">
                    {generateError}
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setGenerateError(null)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          )}

          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="rounded-xl bg-card p-8 shadow-2xl">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-card-foreground">
                      Generating Landscape Map
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Processing...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MapView;
