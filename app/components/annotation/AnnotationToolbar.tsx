import {
    ArrowLeft,
    ArrowRight,
    History,
    MousePointer2,
    Minus,
    Pencil,
    Type,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { AnnotationTool } from "../../types/landscape";

interface AnnotationToolbarProps {
  currentTool: AnnotationTool;
  onBack: () => void;
  onToolChange: (tool: AnnotationTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onOpenCheckpoints: () => void;
  spawnTextbox: () => void;
}

export const AnnotationToolbar = ({
    onBack,
    currentTool,
    onToolChange,
    spawnTextbox,
    onZoomOut,
    onZoomIn,
    onOpenCheckpoints,
}: AnnotationToolbarProps) => {
  return (
    <div className="flex w-16 flex-col items-center gap-1 border-r border-zinc-700 bg-zinc-800 py-4">
      <button
        onClick={onBack}
        className="rounded-lg bg-blue-600 p-3 text-white transition-colors hover:bg-blue-700"
        title="Back to dashboard"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => onToolChange("select")}
        className={`rounded-lg p-3 transition-colors mt-2 ${
          currentTool === "select"
            ? "bg-blue-600 text-white"
            : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
        }`}
        title="Select"
      >
        <MousePointer2 className="h-5 w-5" />
      </button>
      <button
        onClick={() => onToolChange("line")}
        className={`rounded-lg p-3 transition-colors ${
          currentTool === "line"
            ? "bg-blue-600 text-white"
            : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
        }`}
        title="Line"
      >
        <Minus className="h-5 w-5" />
      </button>
      <button
        onClick={() => onToolChange("arrow")}
        className={`rounded-lg p-3 transition-colors ${
          currentTool === "arrow"
            ? "bg-blue-600 text-white"
            : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
        }`}
        title="Arrow"
      >
        <ArrowRight className="h-5 w-5" />
      </button>
      <button
        onClick={() => onToolChange("freehand")}
        className={`rounded-lg p-3 transition-colors ${
          currentTool === "freehand"
            ? "bg-blue-600 text-white"
            : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
        }`}
        title="Freehand Drawing"
      >
        <Pencil className="h-5 w-5" />
      </button>
      <button
        onClick={spawnTextbox}
        className={`rounded-lg p-3 transition-colors ${
          currentTool === "textbox"
            ? "bg-blue-600 text-white"
            : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
        }`}
        title="Textbox"
      >
        <Type className="h-5 w-5" />
      </button>

      <div className="my-2 h-px w-10 bg-zinc-600" />

      <button
        onClick={onZoomIn}
        className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Zoom In (Ctrl+Scroll)"
      >
        <ZoomIn className="h-5 w-5" />
      </button>
      <button
        onClick={onZoomOut}
        className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Zoom Out (Ctrl+Scroll)"
      >
        <ZoomOut className="h-5 w-5" />
      </button>
      <div className="my-2 h-px w-10 bg-zinc-600" />

      <button
        onClick={onOpenCheckpoints}
        className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Checkpoints"
      >
        <History className="h-5 w-5" />
      </button>
    </div>
  );
};

