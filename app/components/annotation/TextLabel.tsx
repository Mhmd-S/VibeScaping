import { Rect, Text, Transformer } from "react-konva";
import { Html } from "react-konva-utils";
import { useEffect, useRef, useState, useCallback } from "react";
import Konva from "konva";
import { Annotation } from "../../types/landscape";
import {
  DEFAULT_LABEL_WIDTH,
  DEFAULT_LABEL_HEIGHT,
  MIN_LABEL_WIDTH,
} from "../../utils/annotationHelpers";

interface TextAreaProps {
  textNode: Konva.Text;
  onClose: () => void;
  onChange: (text: string) => void;
  onClick: (e: Konva.KonvaEventObject<Event>) => void;
}

const TextArea = ({ textNode, onClose, onChange, onClick }: TextAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const stage = textNode.getStage();
    if (!stage) return;
    const textPosition = textNode.position();
    const stageBox = stage.container().getBoundingClientRect();
    const areaPosition = {
      x: textPosition.x,
      y: textPosition.y,
    };

    // Match styles with the text node
    textarea.value = textNode.text();
    textarea.style.position = "absolute";
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${textNode.width() - textNode.padding() * 2}px`;
    textarea.style.height = `${
      textNode.height() - textNode.padding() * 2 + 5
    }px`;
    textarea.style.fontSize = `${textNode.fontSize()}px`;
    textarea.style.border = "none";
    textarea.style.padding = "12px";
    textarea.style.margin = "0px";
    textarea.style.overflow = "hidden";
    textarea.style.background = "none";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = `${textNode.lineHeight()}`;
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.transformOrigin = "left top";
    textarea.style.textAlign = textNode.align();
    textarea.style.color = "#FF0000";

    const rotation = textNode.rotation();
    let transform = "";
    if (rotation) {
      transform += `rotateZ(${rotation}deg)`;
    }
    textarea.style.transform = transform;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + 3}px`;

    textarea.focus();

    const handleOutsideClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const clickedNode = e.target;
      // Check if the click is outside the textarea and not on the text node itself
      if (clickedNode !== textNode && !textarea.contains(e.evt.target as Node)) {
        onChange(textarea.value);
        onClose();
      }
    };

    // Add event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onChange(textarea.value);
        onClose();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleInput = () => {
      const scale = textNode.getAbsoluteScale().x;
      textarea.style.width = `${textNode.width() * scale}px`;
      textarea.style.height = "auto";
      textarea.style.height = `${
        textarea.scrollHeight + textNode.fontSize()
      }px`;
    };

    textarea.addEventListener("keydown", handleKeyDown);
    textarea.addEventListener("input", handleInput);
    
    // Add click listener to the Konva stage instead of window
    setTimeout(() => {
      if (stage) {
        stage.on("click", handleOutsideClick);
      }
    });

    return () => {
      textarea.removeEventListener("keydown", handleKeyDown);
      textarea.removeEventListener("input", handleInput);
      if (stage) {
        stage.off("click", handleOutsideClick);
      }
    };
  }, [textNode, onChange, onClose]);

  return (
    <textarea
      ref={textareaRef}
      style={{
        minHeight: "1em",
        position: "absolute",
      }}
    />
  );
};

interface TextEditorProps {
  textNode: Konva.Text;
  onClose: () => void;
  onChange: (text: string) => void;
  onClick: (e: Konva.KonvaEventObject<Event>) => void;
}

const TextEditor = (props: TextEditorProps) => {
  return (
    <Html>
      <TextArea {...props} />
    </Html>
  );
};

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


  const handleTextChange = useCallback(
    (newText: string) => {
      onTextChange(annotation.id, newText);
    },
    [annotation.id, onTextChange]
  );

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
          onChange={handleTextChange}
          onClose={onFinishEditing}
          onClick={handleClick}
        />
      )}
      <Transformer
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
