import { Line } from "react-konva";
import { Annotation, Point } from "../types/landscape";

/**
 * Render annotation shape based on type
 */
export const renderAnnotationShape = (ann: Annotation, isDashed = false) => {
  const pts = ann.points;
  if (pts.length < 2) return null;

  const strokeColor = ann.color;
  const strokeWidth = 3;
  const dash = isDashed ? [5, 5] : undefined;

  // Only freehand annotations are supported
  const flatPoints = pts.flatMap((p) => [p.x, p.y]);
  return (
    <Line
      key={ann.id}
      points={flatPoints}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
      dash={dash}
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
  if (!currentAnnotationPoints || currentAnnotationPoints.length < 2 || currentTool === "select") {
    return null;
  }

  const pts = currentAnnotationPoints;
  const strokeColor = annotationColor;
  const strokeWidth = 3;
  const dash = [5, 5];

  // Only freehand annotations are supported
  const flatPoints = pts.flatMap((p) => [p.x, p.y]);
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

