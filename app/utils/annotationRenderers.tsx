import Konva from "konva";
import { Arrow, Line } from "react-konva";
import { Annotation, Point } from "../types/landscape";

type RenderOptions = {
    isSelected?: boolean;
    onSelect?: (id: string, e: Konva.KonvaEventObject<Event>) => void;
    onDoubleClick?: (id: string, e: Konva.KonvaEventObject<Event>) => void;
};

/**
 * Render annotation shape based on type
 */
export const renderAnnotationShape = (
    ann: Annotation,
    isDashed = false,
    options?: RenderOptions
) => {
    const pts = ann.points;
    if (ann.type !== "textbox" && pts.length < 2) return null;

    const strokeColor = ann.color;
    const isSelected = options?.isSelected ?? false;
    const strokeWidth = 3;
    const dash = isDashed ? [5, 5] : undefined;
    const commonEvents = {
        onClick: (e: Konva.KonvaEventObject<Event>) => options?.onSelect?.(ann.id, e),
        onTap: (e: Konva.KonvaEventObject<Event>) => options?.onSelect?.(ann.id, e),
        onDblClick: (e: Konva.KonvaEventObject<Event>) => options?.onDoubleClick?.(ann.id, e),
        onDblTap: (e: Konva.KonvaEventObject<Event>) => options?.onDoubleClick?.(ann.id, e),
    };
    const highlightProps = isSelected
        ? {
              shadowColor: "#2563eb",
              shadowBlur: 16,
              shadowOpacity: 0.45,
              shadowEnabled: true,
          }
        : { shadowEnabled: false as const };
    const hitStrokeWidth = 12;

    const flatPoints = pts.flatMap((p) => [p.x, p.y]);

    if (ann.type === "arrow") {
        return (
            <Arrow
                key={ann.id}
                points={flatPoints}
                stroke={strokeColor}
                fill={strokeColor}
                strokeWidth={strokeWidth}
                pointerLength={12}
                pointerWidth={12}
                lineCap="round"
                lineJoin="round"
                dash={dash}
                hitStrokeWidth={hitStrokeWidth}
                {...highlightProps}
                {...commonEvents}
            />
        );
    }

    return (
        <Line
            key={ann.id}
            points={flatPoints}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
            dash={dash}
                hitStrokeWidth={hitStrokeWidth}
                {...highlightProps}
            {...commonEvents}
        />
    );
};

/**
 * Render current drawing preview while user is drawing
 */
export const renderCurrentDrawing = (
    currentAnnotationPoints: Point[],
    currentTool: string,
    annotationColor: string
) => {
    if (
        !currentAnnotationPoints ||
        currentAnnotationPoints.length < 2 ||
        currentTool === "select"
    ) {
        return null;
    }

    const pts = currentAnnotationPoints;
    const strokeColor = annotationColor;
    const strokeWidth = 3;
    const dash = [5, 5];

    const flatPoints = pts.flatMap((p) => [p.x, p.y]);

    if (currentTool === "arrow") {
        return (
            <Arrow
                points={flatPoints}
                stroke={strokeColor}
                fill={strokeColor}
                strokeWidth={strokeWidth}
                pointerLength={12}
                pointerWidth={12}
                lineCap="round"
                lineJoin="round"
                dash={dash}
            />
        );
    }

    return (
        <Line
            points={flatPoints}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
            dash={dash}
        />
    );
};

