import { useEffect, useRef } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import Konva from "konva";
import { Annotation } from "../../types/landscape";
import {
  MIN_LABEL_WIDTH,
  MIN_LABEL_HEIGHT,
  DEFAULT_LABEL_WIDTH,
  DEFAULT_LABEL_HEIGHT,
  LABEL_PADDING,
} from "../../utils/annotationHelpers";

interface TextLabelProps {
  annotation: Annotation;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTransformEnd: (id: string, width: number, height: number, x: number, y: number) => void;
  onDoubleClick: (id: string) => void;
  onClick: (id: string) => void;
  isSelected: boolean;
}

export const TextLabel = ({ 
  annotation, 
  onDragEnd, 
  onTransformEnd, 
  onDoubleClick, 
  onClick, 
  isSelected 
}: TextLabelProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const textRef = useRef<Konva.Text>(null);
  const rectRef = useRef<Konva.Rect>(null);

  useEffect(() => {
    if (isSelected && transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Calculate adaptive size based on text content
  const calculateTextSize = () => {
    if (!annotation.text) {
      return {
        width: DEFAULT_LABEL_WIDTH,
        height: DEFAULT_LABEL_HEIGHT,
      };
    }

    // Create temporary text element to measure
    const tempText = new Konva.Text({
      text: annotation.text,
      fontSize: 14,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: LABEL_PADDING,
      width: annotation.labelSize?.width || DEFAULT_LABEL_WIDTH,
    });

    const textHeight = tempText.height();
    const textWidth = tempText.width();

    return {
      width: Math.max(MIN_LABEL_WIDTH, annotation.labelSize?.width || DEFAULT_LABEL_WIDTH),
      height: Math.max(MIN_LABEL_HEIGHT, textHeight + LABEL_PADDING * 2),
    };
  };

  const labelSize = annotation.labelSize || calculateTextSize();

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const node = groupRef.current;
    if (!node) return;
    onDragEnd(annotation.id, node.x(), node.y());
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    e.cancelBubble = true;
    const node = groupRef.current;
    const rect = rectRef.current;
    if (!node || !rect) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const newWidth = Math.max(MIN_LABEL_WIDTH, rect.width() * scaleX);
    const newHeight = Math.max(MIN_LABEL_HEIGHT, rect.height() * scaleY);

    // Update dimensions without jumping
    rect.width(newWidth);
    rect.height(newHeight);
    
    if (textRef.current) {
      textRef.current.width(newWidth - LABEL_PADDING * 2);
      textRef.current.height(newHeight - LABEL_PADDING * 2);
    }

    // Reset scale to prevent accumulation
    node.scaleX(1);
    node.scaleY(1);

    onTransformEnd(annotation.id, newWidth, newHeight, node.x(), node.y());
  };

  return (
    <>
      <Group
        ref={groupRef}
        x={annotation.labelOffset?.x || 0}
        y={annotation.labelOffset?.y || 0}
        draggable
        onDragStart={(e) => {
          e.cancelBubble = true;
        }}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onMouseUp={(e) => {
          e.cancelBubble = true;
        }}
        onClick={(e) => {
          e.cancelBubble = true;
          onClick(annotation.id);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onClick(annotation.id);
        }}
        onDblClick={(e) => {
          e.cancelBubble = true;
          onDoubleClick(annotation.id);
        }}
        onDblTap={(e) => {
          e.cancelBubble = true;
          onDoubleClick(annotation.id);
        }}
      >
        {/* Background */}
        <Rect
          ref={rectRef}
          width={labelSize.width}
          height={labelSize.height}
          fill="rgba(255, 255, 255, 0.95)"
          stroke={annotation.color}
          strokeWidth={2}
          cornerRadius={6}
          shadowColor="black"
          shadowBlur={10}
          shadowOpacity={0.3}
          shadowOffsetX={2}
          shadowOffsetY={2}
        />
        {/* Text */}
        <Text
          ref={textRef}
          text={annotation.text || "Double-click to edit"}
          x={LABEL_PADDING}
          y={LABEL_PADDING}
          width={labelSize.width - LABEL_PADDING * 2}
          fontSize={14}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={annotation.text ? annotation.color : "#9ca3af"}
          align="left"
          verticalAlign="top"
          wrap="word"
          ellipsis={false}
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          keepRatio={false}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (newBox.width < MIN_LABEL_WIDTH || newBox.height < MIN_LABEL_HEIGHT) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

