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
    Crop,
} from "lucide-react";
import { AnnotationTool } from "../../types/annotation";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

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
    <div className="flex w-16 flex-col items-center gap-1 border-r border-border bg-card py-4">
      <Button
        onClick={onBack}
        variant="outline"
        size="icon"
        title="Back to dashboard"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Button
        onClick={() => onToolChange("select")}
        variant={currentTool === "select" ? "default" : "ghost"}
        size="icon"
        className="mt-2"
        title="Select"
      >
        <MousePointer2 className="h-5 w-5" />
      </Button>
      <Button
        onClick={() => onToolChange("line")}
        variant={currentTool === "line" ? "default" : "ghost"}
        size="icon"
        title="Line"
      >
        <Minus className="h-5 w-5" />
      </Button>
      <Button
        onClick={() => onToolChange("arrow")}
        variant={currentTool === "arrow" ? "default" : "ghost"}
        size="icon"
        title="Arrow"
      >
        <ArrowRight className="h-5 w-5" />
      </Button>
      <Button
        onClick={() => onToolChange("freehand")}
        variant={currentTool === "freehand" ? "default" : "ghost"}
        size="icon"
        title="Freehand Drawing"
      >
        <Pencil className="h-5 w-5" />
      </Button>
      <Button
        onClick={spawnTextbox}
        variant={currentTool === "textbox" ? "default" : "ghost"}
        size="icon"
        title="Textbox"
      >
        <Type className="h-5 w-5" />
      </Button>
      <Button
        onClick={() => onToolChange("crop")}
        variant={currentTool === "crop" ? "default" : "ghost"}
        size="icon"
        title="Crop Image"
      >
        <Crop className="h-5 w-5" />
      </Button>

      <div className="my-2 h-px w-10 bg-border" />

      <Button
        onClick={onZoomIn}
        variant="ghost"
        size="icon"
        title="Zoom In (Ctrl+Scroll)"
      >
        <ZoomIn className="h-5 w-5" />
      </Button>
      <Button
        onClick={onZoomOut}
        variant="ghost"
        size="icon"
        title="Zoom Out (Ctrl+Scroll)"
      >
        <ZoomOut className="h-5 w-5" />
      </Button>
      <div className="my-2 h-px w-10 bg-border" />

      <Button
        onClick={onOpenCheckpoints}
        variant="ghost"
        size="icon"
        title="Checkpoints"
      >
        <History className="h-5 w-5" />
      </Button>
    </div>
  );
};

