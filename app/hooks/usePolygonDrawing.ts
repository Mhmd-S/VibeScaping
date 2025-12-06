'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import simplify from 'simplify-js';
import { PolygonPath } from '../types/landscape';

const simplifyPolygon = (points: PolygonPath[], tolerance: number = 0.0001): PolygonPath[] => {
    if (points.length <= 3) return points;

    const isClosed = points.length > 0 &&
        points[0].lat === points[points.length - 1].lat &&
        points[0].lng === points[points.length - 1].lng;
    const workingPoints = isClosed ? points.slice(0, -1) : points;

    if (workingPoints.length <= 2) return points;

    const simplifyPoints = workingPoints.map((p) => ({ x: p.lng, y: p.lat }));
    const simplified = simplify(simplifyPoints, tolerance, true);
    const result = simplified.map((p) => ({ lat: p.y, lng: p.x }));
    return isClosed ? [...result, result[0]] : result;
};

const normalizePolygonPath = (path: PolygonPath[]): PolygonPath[] => {
    if (path.length < 2) return path;
    const first = path[0];
    const last = path[path.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
        return path.slice(0, -1);
    }
    return path;
};

export const usePolygonDrawing = () => {
    const [drawnPolygon, setDrawnPolygon] = useState<google.maps.Polygon | null>(null);
    const [polygonPath, setPolygonPath] = useState<PolygonPath[]>([]);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    const mapRef = useRef<google.maps.Map | null>(null);
    const currentPathRef = useRef<google.maps.LatLng[]>([]);
    const polylineRef = useRef<google.maps.Polyline | null>(null);
    const startMarkerRef = useRef<google.maps.Marker | null>(null);
    const polygonEditListenersRef = useRef<google.maps.MapsEventListener[]>([]);
    const vertexMarkersRef = useRef<google.maps.Marker[]>([]);

    const calculateDistance = (point1: google.maps.LatLng, point2: google.maps.LatLng): number => {
        return google.maps.geometry.spherical.computeDistanceBetween(point1, point2);
    };

    const detachPolygonEditListeners = useCallback(() => {
        polygonEditListenersRef.current.forEach((listener) => listener.remove());
        polygonEditListenersRef.current = [];
    }, []);

    const clearVertexMarkers = useCallback(() => {
        vertexMarkersRef.current.forEach((marker) => marker.setMap(null));
        vertexMarkersRef.current = [];
    }, []);

    const renderVertexMarkers = useCallback((polygon: google.maps.Polygon) => {
        clearVertexMarkers();
        if (!mapRef.current) return;
        const path = polygon.getPath();
        path.getArray().forEach((latLng, index) => {
            const marker = new google.maps.Marker({
                position: latLng,
                map: mapRef.current,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#ffffff',
                    fillOpacity: 1,
                    strokeColor: '#2563eb',
                    strokeWeight: 3,
                },
                zIndex: 2000 + index,
                clickable: false,
            });
            vertexMarkersRef.current.push(marker);
        });
    }, [clearVertexMarkers]);

    const handlePolygonPathUpdate = useCallback((polygon: google.maps.Polygon) => {
        const path = polygon.getPath();
        const updatedPath = path.getArray().map((latLng) => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
        }));
        setPolygonPath(normalizePolygonPath(updatedPath));
        renderVertexMarkers(polygon);
    }, [renderVertexMarkers]);

    const enablePolygonEditing = useCallback((polygon: google.maps.Polygon) => {
        detachPolygonEditListeners();
        polygon.setEditable(true);
        polygon.setDraggable(false);
        const path = polygon.getPath();
        const listeners = [
            path.addListener('set_at', () => handlePolygonPathUpdate(polygon)),
            path.addListener('insert_at', () => handlePolygonPathUpdate(polygon)),
            path.addListener('remove_at', () => handlePolygonPathUpdate(polygon)),
        ];
        polygonEditListenersRef.current = listeners;
        renderVertexMarkers(polygon);
    }, [detachPolygonEditListeners, handlePolygonPathUpdate, renderVertexMarkers]);

    const finishPolygon = useCallback(() => {
        if (!mapRef.current || currentPathRef.current.length < 3) {
            setIsDrawing(false);
            if (polylineRef.current) {
                polylineRef.current.setMap(null);
                polylineRef.current = null;
            }
            if (startMarkerRef.current) {
                startMarkerRef.current.setMap(null);
                startMarkerRef.current = null;
            }
            currentPathRef.current = [];
            return;
        }

        const closedPath = [...currentPathRef.current, currentPathRef.current[0]];
        const rawCoordinates: PolygonPath[] = closedPath.map((latLng) => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
        }));

        const simplifiedCoordinates = simplifyPolygon(rawCoordinates, 0.00005);
        const normalizedPath = normalizePolygonPath(simplifiedCoordinates);
        const simplifiedPath = normalizedPath.map((coord) =>
            new google.maps.LatLng(coord.lat, coord.lng)
        );

        const polygon = new google.maps.Polygon({
            paths: simplifiedPath,
            fillColor: '#2563eb',
            fillOpacity: 0.2,
            strokeColor: '#2563eb',
            strokeWeight: 3,
            map: mapRef.current,
        });

        if (polylineRef.current) {
            polylineRef.current.setMap(null);
            polylineRef.current = null;
        }
        if (startMarkerRef.current) {
            startMarkerRef.current.setMap(null);
            startMarkerRef.current = null;
        }

        setDrawnPolygon(polygon);
        setPolygonPath(normalizedPath);
        enablePolygonEditing(polygon);

        setIsDrawing(false);
        setIsDrawingMode(false);
        currentPathRef.current = [];
    }, [enablePolygonEditing]);

    const handleClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (!isDrawingMode || !mapRef.current || !e.latLng) return;

        if (!isDrawing) {
            setIsDrawing(true);
            currentPathRef.current = [e.latLng];

            const startMarker = new google.maps.Marker({
                position: e.latLng,
                map: mapRef.current,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#ff0000',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                },
                zIndex: 1000,
                clickable: true,
            });
            startMarkerRef.current = startMarker;

            google.maps.event.addListener(startMarker, 'click', () => {
                if (currentPathRef.current.length >= 3) {
                    finishPolygon();
                }
            });

            const polyline = new google.maps.Polyline({
                path: currentPathRef.current,
                strokeColor: '#ff0000',
                strokeWeight: 2,
                map: mapRef.current,
            });
            polylineRef.current = polyline;
        } else {
            if (currentPathRef.current.length >= 3) {
                const startPoint = currentPathRef.current[0];
                const distance = calculateDistance(startPoint, e.latLng);
                if (distance < 50) {
                    finishPolygon();
                    return;
                }
            }
            finishPolygon();
        }
    }, [isDrawingMode, isDrawing, finishPolygon]);

    const handleMouseMove = useCallback((e: google.maps.MapMouseEvent) => {
        if (!isDrawing || !mapRef.current || !e.latLng || !polylineRef.current) return;

        if (currentPathRef.current.length > 0) {
            const lastPoint = currentPathRef.current[currentPathRef.current.length - 1];
            const distance = calculateDistance(lastPoint, e.latLng);
            if (distance < 2) {
                return;
            }
        }

        currentPathRef.current.push(e.latLng);
        polylineRef.current.setPath(currentPathRef.current);

        if (currentPathRef.current.length >= 3 && startMarkerRef.current) {
            const startPoint = currentPathRef.current[0];
            const distance = calculateDistance(startPoint, e.latLng);

            if (distance < 50) {
                startMarkerRef.current.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#00ff00',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                });
            } else {
                startMarkerRef.current.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#ff0000',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                });
            }
        }
    }, [isDrawing]);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const mapDiv = map.getDiv();

        if (isDrawingMode) {
            map.setOptions({ draggable: false });
            mapDiv.style.cursor = 'crosshair';
            const clickListener = map.addListener('click', handleClick);
            const mouseMoveListener = map.addListener('mousemove', handleMouseMove);

            return () => {
                google.maps.event.removeListener(clickListener);
                google.maps.event.removeListener(mouseMoveListener);
                map.setOptions({ draggable: true });
                mapDiv.style.cursor = '';
            };
        }

        map.setOptions({ draggable: true });
        mapDiv.style.cursor = '';
    }, [isDrawingMode, handleClick, handleMouseMove]);

    const toggleDrawingMode = useCallback(() => {
        if (isDrawingMode) {
            setIsDrawingMode(false);
            setIsDrawing(false);
            if (polylineRef.current) {
                polylineRef.current.setMap(null);
                polylineRef.current = null;
            }
            if (startMarkerRef.current) {
                startMarkerRef.current.setMap(null);
                startMarkerRef.current = null;
            }
            currentPathRef.current = [];
        } else {
            if (drawnPolygon) {
                detachPolygonEditListeners();
                drawnPolygon.setMap(null);
                setDrawnPolygon(null);
                setPolygonPath([]);
            }
            setIsDrawingMode(true);
        }
    }, [isDrawingMode, drawnPolygon, detachPolygonEditListeners]);

    const clearPolygon = useCallback(() => {
        if (drawnPolygon) {
            detachPolygonEditListeners();
            clearVertexMarkers();
            drawnPolygon.setMap(null);
            setDrawnPolygon(null);
            setPolygonPath([]);
        }
        if (polylineRef.current) {
            polylineRef.current.setMap(null);
            polylineRef.current = null;
        }
        if (startMarkerRef.current) {
            startMarkerRef.current.setMap(null);
            startMarkerRef.current = null;
        }
        setIsDrawingMode(false);
        setIsDrawing(false);
        currentPathRef.current = [];
        clearVertexMarkers();
    }, [drawnPolygon, detachPolygonEditListeners, clearVertexMarkers]);

    useEffect(() => {
        return () => {
            detachPolygonEditListeners();
            clearVertexMarkers();
        };
    }, [detachPolygonEditListeners, clearVertexMarkers]);

    const hidePolygonOverlays = useCallback(() => {
        if (!drawnPolygon) return () => {};

        const polygonMap = drawnPolygon.getMap();
        const polygonVisible = drawnPolygon.getVisible();
        const polygonEditable = drawnPolygon.getEditable();
        const markerState = vertexMarkersRef.current.map((marker) => ({
            map: marker.getMap(),
            visible: marker.getVisible(),
        }));

        drawnPolygon.setEditable(false);
        drawnPolygon.setMap(null);
        vertexMarkersRef.current.forEach((marker) => marker.setMap(null));

        return () => {
            if (polygonMap) {
                drawnPolygon.setMap(polygonMap);
            }
            drawnPolygon.setVisible(polygonVisible);
            drawnPolygon.setEditable(polygonEditable);

            vertexMarkersRef.current.forEach((marker, idx) => {
                const state = markerState[idx];
                if (state?.map) {
                    marker.setMap(state.map);
                }
                marker.setVisible(state?.visible ?? true);
            });
        };
    }, [drawnPolygon]);

    return {
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
    };
};

