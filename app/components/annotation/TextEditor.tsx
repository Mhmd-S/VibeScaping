import { Html } from "react-konva-utils";
import { useEffect, useRef } from "react";
import Konva from "konva";

interface TextAreaProps {
    textNode: Konva.Text;
    onFinishEditing: () => void;
    handleTextChange: (text: string) => void;
  }
  
  const TextArea = ({ textNode, onFinishEditing, handleTextChange }: TextAreaProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isSavingRef = useRef(false);
  
    useEffect(() => {
      if (!textareaRef.current) return;
  
      const textarea = textareaRef.current;
      const stage = textNode.getStage();
      if (!stage) return;
      const textPosition = textNode.position();
  
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
  
      let transform = "";
      textarea.style.transform = transform;
  
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight + 3}px`;
  
      textarea.focus();
  
      // Reset saving flag when starting to edit
      isSavingRef.current = false;
  
      const saveAndFinish = () => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        handleTextChange(textarea.value);
        onFinishEditing();
      };
  
      // Add event listeners
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          saveAndFinish();
        }
        if (e.key === "Escape") {
          onFinishEditing();
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
  
      // Handle blur event on textarea (when it loses focus)
      // This is the primary mechanism for saving when clicking outside
      const handleBlur = () => {
        // Use a small timeout to ensure the click event has been processed
        // and to allow other event handlers to run first
        setTimeout(() => {
          // Only save if we haven't already saved (e.g., from Enter key or mousedown)
          if (!isSavingRef.current) {
            saveAndFinish();
          }
        }, 150);
      };
  
      // Handle mousedown on document to catch clicks outside the textarea
      // This is a backup mechanism in case blur doesn't fire reliably
      const handleDocumentMouseDown = (e: MouseEvent) => {
        if (!textarea) return;
        
        const target = e.target as Node;
        // Check if the click was on the textarea or inside it
        if (textarea.contains(target)) {
          return; // Click was on the textarea, don't save
        }
        
        // Check if the click was within the textarea's bounding box
        const textareaRect = textarea.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        
        const isClickOnTextarea = 
          clickX >= textareaRect.left &&
          clickX <= textareaRect.right &&
          clickY >= textareaRect.top &&
          clickY <= textareaRect.bottom;
        
        if (!isClickOnTextarea && !isSavingRef.current) {
          // Click was outside the textarea, save the text
          saveAndFinish();
        }
      };
  
      textarea.addEventListener("keydown", handleKeyDown);
      textarea.addEventListener("input", handleInput);
      textarea.addEventListener("blur", handleBlur);
      // Use capture phase to catch the event early
      document.addEventListener("mousedown", handleDocumentMouseDown, true);
  
      return () => {
        textarea.removeEventListener("keydown", handleKeyDown);
        textarea.removeEventListener("input", handleInput);
        textarea.removeEventListener("blur", handleBlur);
        document.removeEventListener("mousedown", handleDocumentMouseDown, true);
      };
    }, [textNode, handleTextChange, onFinishEditing]);
  
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
    onFinishEditing: () => void;
    handleTextChange: (text: string) => void;
  }
  
  const TextEditor = (props: TextEditorProps) => {
    return (
      <Html>
        <TextArea {...props} />
      </Html>
    );
  };

  export default TextEditor;
  