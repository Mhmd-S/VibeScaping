import { useEffect, useRef, useState } from 'react';
import { Group, Rect, Text, Transformer } from 'react-konva';
import { Html } from 'react-konva-utils';
import Konva from 'konva';
import { Annotation } from '../../types/landscape';
import {
    MIN_LABEL_WIDTH,
    MIN_LABEL_HEIGHT,
    DEFAULT_LABEL_WIDTH,
    DEFAULT_LABEL_HEIGHT,
    LABEL_PADDING,
} from '../../utils/annotationHelpers';

interface TextAreaProps {
    textNode: Konva.Text;
    onClose: () => void;
    onChange: (value: string) => void;
}

const TextArea = ({ textNode, onClose, onChange }: TextAreaProps) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (!textareaRef.current || !textNode) return;

        const textarea = textareaRef.current;
        if (!textNode.getStage()) return;
        const textPosition = textNode.position();
        const areaPosition = {
            x: textPosition.x,
            y: textPosition.y,
        };

        textarea.value = textNode.text();
        textarea.style.position = 'absolute';
        textarea.style.top = `${areaPosition.y}px`;
        textarea.style.left = `${areaPosition.x}px`;
        textarea.style.width = `${textNode.width() - textNode.padding() * 2}px`;
        textarea.style.height = `${textNode.height() - textNode.padding() * 2 + 5}px`;
        textarea.style.fontSize = `${textNode.fontSize()}px`;
        textarea.style.border = 'none';
        textarea.style.padding = '0px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'none';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.lineHeight = `${textNode.lineHeight()}`;
        textarea.style.fontFamily = textNode.fontFamily();
        textarea.style.transformOrigin = 'left top';
        textarea.style.textAlign = textNode.align();
        textarea.style.color = textNode.fill();

        const rotation = textNode.rotation();
        let transform = '';
        if (rotation) {
            transform += `rotateZ(${rotation}deg)`;
        }
        textarea.style.transform = transform;

        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight + 3}px`;

        textarea.focus();

        const handleOutsideClick = (e: MouseEvent) => {
            if (e.target !== textarea) {
                onChange(textarea.value);
                onClose();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onChange(textarea.value);
                onClose();
            }
            if (e.key === 'Escape') {
                onClose();
            }
        };

        const handleInput = () => {
            const scale = textNode.getAbsoluteScale().x;
            textarea.style.width = `${textNode.width() * scale}px`;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight + textNode.fontSize()}px`;
        };

        textarea.addEventListener('keydown', handleKeyDown);
        textarea.addEventListener('input', handleInput);
        setTimeout(() => {
            window.addEventListener('click', handleOutsideClick);
        });

        return () => {
            textarea.removeEventListener('keydown', handleKeyDown);
            textarea.removeEventListener('input', handleInput);
            window.removeEventListener('click', handleOutsideClick);
        };
    }, [textNode, onChange, onClose]);

    return (
        <textarea
            ref={textareaRef}
            style={{
                minHeight: '1em',
                position: 'absolute',
            }}
        />
    );
};

const TextEditor = (props: TextAreaProps) => {
    return (
        <Html>
            <TextArea {...props} />
        </Html>
    );
};

interface TextLabelProps {
    annotation: Annotation;
    onDragEnd: (id: string, x: number, y: number) => void;
    onTransformEnd: (id: string, width: number, height: number, x: number, y: number) => void;
    onDoubleClick: (id: string) => void;
    onClick: (id: string, e: Konva.KonvaEventObject<Event>) => void;
    onTextChange: (id: string, text: string) => void;
    onFinishEditing: (id: string) => void;
    isSelected: boolean;
    isEditing?: boolean;
}

export const TextLabel = ({ 
    annotation, 
    onDragEnd, 
    onTransformEnd, 
    onDoubleClick, 
    onClick, 
    onTextChange,
    onFinishEditing,
    isSelected,
    isEditing = false,
}: TextLabelProps) => {
    const groupRef = useRef<Konva.Group>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const textRef = useRef<Konva.Text>(null);
    const rectRef = useRef<Konva.Rect>(null);
    const [textNode, setTextNode] = useState<Konva.Text | null>(null);

    useEffect(() => {
        setTextNode(textRef.current);
    }, [annotation.id]);

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

        const tempText = new Konva.Text({
            text: annotation.text,
            fontSize: 14,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: LABEL_PADDING,
            width: annotation.labelSize?.width || DEFAULT_LABEL_WIDTH,
        });

        const textHeight = tempText.height();

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

        rect.width(newWidth);
        rect.height(newHeight);
        
        if (textRef.current) {
            textRef.current.width(newWidth - LABEL_PADDING * 2);
            textRef.current.height(newHeight - LABEL_PADDING * 2);
        }

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
                opacity={isEditing ? 0 : 1}
                draggable={!isEditing}
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
                    onClick(annotation.id, e);
                }}
                onTap={(e) => {
                    e.cancelBubble = true;
                    onClick(annotation.id, e as unknown as Konva.KonvaEventObject<Event>);
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
                <Rect
                    ref={rectRef}
                    width={labelSize.width}
                    height={labelSize.height}
                    fill="#ffffff"
                    stroke={isSelected ? "#2563eb" : annotation.color}
                    strokeWidth={isSelected ? 3 : 2}
                    cornerRadius={6}
                    shadowColor={isSelected ? "#1d4ed8" : "black"}
                    shadowBlur={isSelected ? 18 : 10}
                    shadowOpacity={isSelected ? 0.45 : 0.3}
                    shadowOffsetX={2}
                    shadowOffsetY={2}
                />
                <Text
                    ref={textRef}
                    text={
                        isEditing
                            ? ""
                            : annotation.text || "Double-click to edit"
                    }
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
                    visible={!isEditing}
                />
                {isEditing && textNode && (
                    <TextEditor
                        textNode={textNode}
                        onChange={(value) => onTextChange(annotation.id, value)}
                        onClose={() => onFinishEditing(annotation.id)}
                    />
                )}
            </Group>
            {!isEditing && isSelected && (
                <Transformer
                    ref={transformerRef}
                    rotateEnabled={false}
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                    keepRatio={false}
                    boundBoxFunc={(oldBox, newBox) => {
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

