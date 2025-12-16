import { Text, Transformer } from "react-konva";
import { useEffect, useRef, useState, useCallback } from "react";
import Konva from "konva";
import { Annotation } from "@/app/types/annotation";
import {
  DEFAULT_LABEL_WIDTH,
  DEFAULT_LABEL_HEIGHT,
} from "@/app/utils/annotationHelpers";
import TextEditor from "@/app/components/annotation/TextEditor";
interface TextLabelProps {
  annotation: Annotation;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTransformEnd: (
    id: string,
    width: number,
    height: number,
    x: number,
    y: number
  ) => void;
  onClick: (id: string, e: Konva.KonvaEventObject<Event>) => void;
  onTextChange: (id: string, text: string) => void;
  onFinishEditing: () => void;
  isSelected: boolean;
  isEditing: boolean;
}

export const TextLabel = ({
  annotation,
  onDragEnd,
  onTransformEnd,
  onClick,
  onTextChange,
  onFinishEditing,
  isSelected,
  isEditing,
}: TextLabelProps) => {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [textWidth, setTextWidth] = useState(
    annotation.labelSize?.width || DEFAULT_LABEL_WIDTH
  );

  useEffect(() => {
    const newWidth = annotation.labelSize?.width || DEFAULT_LABEL_WIDTH;
    setTextWidth(newWidth);
    if (textRef.current) {
      textRef.current.width(newWidth);
    }
  }, [annotation.labelSize?.width]);

  useEffect(() => {
    if (trRef.current && textRef.current && isSelected && !isEditing) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isEditing]);


  const handleTransform = useCallback(() => {
    const node = textRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const newWidth = node.width() * scaleX;
    setTextWidth(newWidth);
    node.setAttrs({
      width: newWidth,
      scaleX: 1,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    const node = textRef.current;
    if (!node) return;
    const pos = node.position();
    onDragEnd(annotation.id, pos.x, pos.y);
  }, [annotation.id, onDragEnd]);

  const handleTransformEnd = useCallback(() => {
    const node = textRef.current;
    if (!node) return;
    const pos = node.position();
    const width = node.width();
    const height = node.height();
    onTransformEnd(annotation.id, width, height, pos.x, pos.y);
  }, [annotation.id, onTransformEnd]);

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<Event>) => {
      onClick(annotation.id, e);
    },
    [annotation.id, onClick]
  );

  const labelOffset = annotation.labelOffset || { x: 0, y: 0 };
  const labelSize = annotation.labelSize || {
    width: DEFAULT_LABEL_WIDTH,
    height: DEFAULT_LABEL_HEIGHT,
  };

  return (
    <>
      <Text
        ref={textRef}
        text={annotation.text || "Insert text here"}
        x={labelOffset.x}
        y={labelOffset.y}
        fontSize={20}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#FF0000"
        draggable={!isEditing}
        width={textWidth}
        padding={12}
        wrap="word"
        onTransform={handleTransform}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        onClick={handleClick}
        visible={!isEditing}
        fillAfterStrokeEnabled={false}
      />
      {isEditing && textRef.current && (
        <TextEditor
          textNode={textRef.current}
          handleTextChange={(newText: string) => onTextChange(annotation.id, newText)}
          onFinishEditing={onFinishEditing}
        />
      )}
      <Transformer
      visible={isSelected && !isEditing}
        ref={trRef}
        x={labelOffset.x}
        y={labelOffset.y}
        width={textWidth}
        height={labelSize.height + 6}
        rotateEnabled={false}
      />
    </>
  );
};
