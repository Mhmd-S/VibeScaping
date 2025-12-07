export interface Location {
    lat: number;
    lng: number;
}

export interface PolygonPath {
    lat: number;
    lng: number;
}

export interface GeneratedImage {
    image: string;
    mimeType: string;
    description?: string;
}

export type AnnotationTool = 'select' | 'freehand';

export interface Point {
    x: number;
    y: number;
}

export interface Annotation {
    id: string;
    type: AnnotationTool;
    points: Point[];
    text: string;
    color: string;
    isEditing: boolean;
    labelOffset?: Point;
    labelSize?: {
        width: number;
        height: number;
    };
}

export interface RevisionNode {
    id: string;
    parentId: string | null;
    image: string;
    mimeType: string;
    annotations: string[];
    timestamp: number;
    label?: string;
}

