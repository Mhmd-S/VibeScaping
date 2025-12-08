import {
  History,
  MousePointer2,
  Pencil,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { AnnotationTool } from "../../types/landscape";

interface AnnotationToolbarProps {
  currentTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onOpenCheckpoints: () => void;
}

export const AnnotationToolbar = ({
  currentTool,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onRotateLeft,
  onRotateRight,
  onOpenCheckpoints,
}: AnnotationToolbarProps) => {
  return (
    <div className="flex w-16 flex-col items-center gap-1 border-r border-zinc-700 bg-zinc-800 py-4">
      <button
        onClick={() => onToolChange("select")}
        className={`rounded-lg p-3 transition-colors ${
          currentTool === "select"
            ? "bg-blue-600 text-white"
            : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
        }`}
        title="Select"
      >
        <MousePointer2 className="h-5 w-5" />
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
      {/* <button
        onClick={onRotateLeft}
        className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Rotate Left"
      >
        <RotateCcw className="h-5 w-5" />
      </button>
      <button
        onClick={onRotateRight}
        className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Rotate Right"
      >
        <RotateCw className="h-5 w-5" />
      </button> */}

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

