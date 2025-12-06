'use client';

import { useCallback, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import { useCurrentLocation } from './hooks/useCurrentLocation';
import { usePolygonDrawing } from './hooks/usePolygonDrawing';
import { saveGenerationSession } from './utils/generationSession';

const mapContainerStyle = {
    width: '100%',
    height: '100vh',
};

const defaultZoom = 15;

const Home = () => {
    const router = useRouter();
    const { location, loading, error } = useCurrentLocation();
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

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
    } = usePolygonDrawing();

    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    const captureImage = useCallback(async () => {
        if (!mapRef.current || !drawnPolygon || polygonPath.length === 0) {
            alert('Please draw a polygon first');
            return;
        }

        const mapElement = mapRef.current.getDiv();
        if (!mapElement) {
            alert('Could not find map element');
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

            let canvas: HTMLCanvasElement | null = null;
            try {
                canvas = await html2canvas(mapElement, {
                    useCORS: true,
                    allowTaint: true,
                    scale: 2,
                    logging: false,
                    backgroundColor: null,
                });
            } finally {
                restoreOverlays();
            }

            if (!canvas) {
                throw new Error('Failed to capture map image');
            }

            const projection = mapRef.current.getProjection();
            if (!projection) {
                throw new Error('Could not get map projection');
            }

            const mapBounds = mapRef.current.getBounds();
            if (!mapBounds) {
                throw new Error('Could not get map bounds');
            }

            const ne = mapBounds.getNorthEast();
            const sw = mapBounds.getSouthWest();
            const nePoint = projection.fromLatLngToPoint(ne);
            const swPoint = projection.fromLatLngToPoint(sw);

            if (!nePoint || !swPoint) {
                throw new Error('Could not convert bounds to world coordinates');
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

            const croppedCanvas = document.createElement('canvas');
            const croppedWidth = maxX - minX;
            const croppedHeight = maxY - minY;
            croppedCanvas.width = croppedWidth;
            croppedCanvas.height = croppedHeight;
            const croppedCtx = croppedCanvas.getContext('2d');
            if (!croppedCtx) {
                throw new Error('Could not get canvas context');
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
                minX, minY, croppedWidth, croppedHeight,
                0, 0, croppedWidth, croppedHeight
            );
            croppedCtx.restore();

            const dataUrl = croppedCanvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1];

            const response = await fetch('/api/generate-landscape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageBase64: base64,
                    mimeType: 'image/png',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.details || data.error || 'Failed to generate landscape';
                const error = new Error(errorMessage);
                if (data.apiError) {
                    (error as any).apiError = data.apiError;
                }
                throw error;
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
                    mimeType: 'image/png',
                    description: 'Original map capture',
                },
                revisionHistory: [
                    {
                        id: rootRevisionId,
                        parentId: null,
                        image: data.image,
                        mimeType: data.mimeType,
                        annotations: [],
                        timestamp: Date.now(),
                        label: 'Original',
                    },
                ],
                currentRevisionId: rootRevisionId,
            });

            router.push('/editor');
        } catch (err) {
            setGenerateError(err instanceof Error ? err.message : 'Failed to generate landscape. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    }, [drawnPolygon, polygonPath, mapRef, hidePolygonOverlays, router]);

    const handleClearPolygon = useCallback(() => {
        clearPolygon();
    }, [clearPolygon]);

    if (!googleMapsApiKey) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
                <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
                    <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                        Google Maps API Key Required
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Please set the NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
                <div className="text-center">
                    <div className="mb-4 text-lg font-medium text-black dark:text-zinc-50">
                        Detecting your location...
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Please allow location access when prompted
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
                <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
                    <h2 className="mb-4 text-xl font-semibold text-red-600 dark:text-red-400">
                        Location Error
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen w-full">
            <LoadScript
                googleMapsApiKey={googleMapsApiKey}
                libraries={['geometry']}
                onLoad={() => setIsMapLoaded(true)}
            >
                {isMapLoaded && location && (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={location}
                        zoom={defaultZoom}
                        onLoad={onMapLoad}
                        options={{
                            tilt: 0,
                            mapTypeId: 'satellite',
                            mapTypeControl: false,
                            fullscreenControl: false,
                            rotateControl: false,
                            streetViewControl: false,
                            zoomControl: false,
                        }}
                    >
                        <Marker
                            position={location}
                            title="Your Current Location"
                        />
                    </GoogleMap>
                )}
            </LoadScript>

            {location && (
                <>
                    <div className="absolute bottom-4 left-4 rounded-lg bg-white p-4 shadow-lg dark:bg-zinc-900">
                        <div className="text-sm font-medium text-black dark:text-zinc-50">
                            Current Location
                        </div>
                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                            Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                        </div>
                    </div>
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <button
                            onClick={toggleDrawingMode}
                            className={`rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-colors ${
                                isDrawingMode
                                    ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                                    : 'bg-white text-black hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            {isDrawingMode ? 'Stop Drawing' : 'Start Freehand Drawing'}
                        </button>
                        {isDrawingMode && (
                            <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {isDrawing
                                    ? 'Move mouse to draw. Click near the green dot to close, or click anywhere to finish'
                                    : 'Click to start drawing, then move mouse'}
                            </div>
                        )}
                        {drawnPolygon && (
                            <>
                                <button
                                    onClick={handleClearPolygon}
                                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black shadow-lg transition-colors hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                                >
                                    Clear Area
                                </button>
                                <button
                                    onClick={captureImage}
                                    disabled={isGenerating}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    {isGenerating ? 'Generating...' : 'Generate Landscape Map'}
                                </button>
                            </>
                        )}
                    </div>

                    {generateError && (
                        <div className="absolute top-4 right-4 max-w-md rounded-lg bg-red-100 p-4 shadow-lg dark:bg-red-900">
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                        Generation Error
                                    </p>
                                    <div className="mt-1 text-xs text-red-600 dark:text-red-300 whitespace-pre-line">
                                        {generateError}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setGenerateError(null)}
                                    className="text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="rounded-xl bg-white p-8 shadow-2xl dark:bg-zinc-900">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                            Generating Landscape Map
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            Nano Banana Pro is creating your landscape architecture map...
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

export default Home;
