import simplify from "simplify-js";
import { Annotation, Point } from "../types/landscape";

// Label sizing constants
export const MIN_LABEL_WIDTH = 80;
export const MIN_LABEL_HEIGHT = 36;
export const DEFAULT_LABEL_WIDTH = 220;
export const DEFAULT_LABEL_HEIGHT = 50;
export const LABEL_PADDING = 12;

/**
 * Simplify annotation points to reduce complexity
 */
export const simplifyAnnotationPoints = (
  points: Point[],
  tolerance: number = 2
): Point[] => {
  if (points.length <= 2) return points;
  const simplifyPoints = points.map((p) => ({ x: p.x, y: p.y }));
  const simplified = simplify(simplifyPoints, tolerance, true);
  return simplified.map((p) => ({ x: p.x, y: p.y }));
};

/**
 * Get the anchor point for an annotation label
 */
export const getAnnotationAnchorPoint = (ann: Annotation) => {
  const pts = ann.points;
  if (!pts.length) return { x: 0, y: 0 };

  const xs = pts.map((pt) => pt.x);
  const ys = pts.map((pt) => pt.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const margin = 20;

  // Default position for new labels (freehand only)
  if (!ann.labelOffset || (ann.labelOffset.x === 0 && ann.labelOffset.y === 0)) {
    // Position to the right and centered vertically
    return { x: maxX + margin, y: (minY + maxY) / 2 };
  }

  // If labelOffset is already set, just return it
  return ann.labelOffset;
};

/**
 * Get the connection point on the annotation shape (closest point to the label)
 */
export const getShapeConnectionPoint = (ann: Annotation, labelX: number, labelY: number) => {
  const pts = ann.points;
  if (!pts.length) return { x: 0, y: 0 };

  const xs = pts.map((pt) => pt.x);
  const ys = pts.map((pt) => pt.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Return the center point of the shape's bounding box
  return { x: centerX, y: centerY };
};

/**
 * Get the connection point on the label box (edge closest to the shape)
 */
export const getLabelConnectionPoint = (
  labelX: number,
  labelY: number,
  labelWidth: number,
  labelHeight: number,
  shapeX: number,
  shapeY: number
) => {
  const labelCenterX = labelX + labelWidth / 2;
  const labelCenterY = labelY + labelHeight / 2;

  // Calculate angle from label center to shape
  const angle = Math.atan2(shapeY - labelCenterY, shapeX - labelCenterX);

  // Calculate intersection point on label rectangle
  const corners = [
    { x: labelX, y: labelY }, // top-left
    { x: labelX + labelWidth, y: labelY }, // top-right
    { x: labelX + labelWidth, y: labelY + labelHeight }, // bottom-right
    { x: labelX, y: labelY + labelHeight }, // bottom-left
  ];

  // Find which edge of the label is closest to the shape
  let closestPoint = { x: labelCenterX, y: labelCenterY };
  let minDist = Infinity;

  // Check edges
  const edges = [
    { p1: corners[0], p2: corners[1] }, // top
    { p1: corners[1], p2: corners[2] }, // right
    { p1: corners[2], p2: corners[3] }, // bottom
    { p1: corners[3], p2: corners[0] }, // left
  ];

  edges.forEach(edge => {
    const midX = (edge.p1.x + edge.p2.x) / 2;
    const midY = (edge.p1.y + edge.p2.y) / 2;
    const dist = Math.sqrt(Math.pow(midX - shapeX, 2) + Math.pow(midY - shapeY, 2));
    if (dist < minDist) {
      minDist = dist;
      closestPoint = { x: midX, y: midY };
    }
  });

  return closestPoint;
};

/**
 * Calculate the intersection point of a line (from startX, startY towards endX, endY) 
 * with a rectangle (label box)
 */
export const getLineRectangleIntersection = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  labelX: number,
  labelY: number,
  labelWidth: number,
  labelHeight: number
) => {
  // Direction vector
  const dx = endX - startX;
  const dy = endY - startY;
  
  // Normalize if needed (extend the line far enough)
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) {
    // If no direction, return label center
    return { x: labelX + labelWidth / 2, y: labelY + labelHeight / 2 };
  }
  
  const dirX = dx / length;
  const dirY = dy / length;
  
  // Extend the line far enough to ensure intersection
  const extendedEndX = startX + dirX * 10000;
  const extendedEndY = startY + dirY * 10000;
  
  // Check intersection with each edge of the rectangle
  const intersections: Array<{x: number, y: number, distance: number}> = [];
  
  // Helper function to calculate line-line intersection
  const lineIntersection = (
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): {x: number, y: number} | null => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    if (t >= 0 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }
    return null;
  };
  
  // Check all four edges
  const edges = [
    { x1: labelX, y1: labelY, x2: labelX + labelWidth, y2: labelY }, // top
    { x1: labelX + labelWidth, y1: labelY, x2: labelX + labelWidth, y2: labelY + labelHeight }, // right
    { x1: labelX + labelWidth, y1: labelY + labelHeight, x2: labelX, y2: labelY + labelHeight }, // bottom
    { x1: labelX, y1: labelY + labelHeight, x2: labelX, y2: labelY }, // left
  ];
  
  edges.forEach(edge => {
    const intersection = lineIntersection(
      startX, startY, extendedEndX, extendedEndY,
      edge.x1, edge.y1, edge.x2, edge.y2
    );
    
    if (intersection) {
      const distance = Math.sqrt(
        Math.pow(intersection.x - startX, 2) + 
        Math.pow(intersection.y - startY, 2)
      );
      intersections.push({ ...intersection, distance });
    }
  });
  
  // Return the closest intersection point
  if (intersections.length > 0) {
    intersections.sort((a, b) => a.distance - b.distance);
    return { x: intersections[0].x, y: intersections[0].y };
  }
  
  // Fallback to label center if no intersection found
  return { x: labelX + labelWidth / 2, y: labelY + labelHeight / 2 };
};

