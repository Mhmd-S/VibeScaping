"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  IconSparkles,
  IconPhoto,
  IconChevronDown,
  IconWand,
} from "@tabler/icons-react";
import { useRef, useState, useEffect } from "react";

export type GeminiImageModel = 
  | 'gemini-3-pro-image-preview'
  | 'gemini-2.5-flash-image';

export const GEMINI_IMAGE_MODELS: Array<{ value: GeminiImageModel; label: string; description?: string }> = [
  { 
    value: 'gemini-3-pro-image-preview', 
    label: 'Gemini 3 Pro Image',
    description: 'Latest preview model with advanced image generation'
  },
  { 
    value: 'gemini-2.5-flash-image', 
    label: 'Gemini 2.5 Flash Image',
    description: 'Fast and efficient image generation model'
  },
];

interface Ai01Props {
  onFileSelect?: (files: File[]) => void;
  showTitle?: boolean;
  isLoading?: boolean;
  selectedModel?: GeminiImageModel;
  onModelChange?: (model: GeminiImageModel) => void;
  hasSelectedElements?: boolean;
  sendSelectedOnly?: boolean;
  onSendSelectedOnlyChange?: (value: boolean) => void;
  onAnnotationSubmit?: (value: string, model?: GeminiImageModel) => void;
  isVisible?: boolean;
}

export default function Ai01({
  onFileSelect,
  showTitle = false,
  isLoading = false,
  selectedModel = 'gemini-3-pro-image-preview',
  onModelChange,
  hasSelectedElements = false,
  sendSelectedOnly = false,
  onSendSelectedOnlyChange,
  onAnnotationSubmit,
  isVisible = true,
}: Ai01Props) {
  const [currentModel, setCurrentModel] = useState<GeminiImageModel>(selectedModel);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentModel(selectedModel);
  }, [selectedModel]);

  const handleModelChange = (newModel: GeminiImageModel) => {
    setCurrentModel(newModel);
    onModelChange?.(newModel);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onFileSelect) {
      onFileSelect(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute bottom-18 left-4 right-4 md:bottom-8 lg:left-[30%] lg:right-auto lg:w-[640px] z-50">
      {showTitle && (
        <h1 className="mb-7 mx-auto max-w-2xl text-center text-2xl font-semibold leading-9 text-foreground px-1 text-pretty whitespace-pre-wrap">
          How can I help you today?
        </h1>
      )}

      <div className="w-full">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={handleFileChange}
        />

        {/* Toolbar container */}
        <div className="w-full mx-auto dark:bg-muted/50 overflow-clip bg-clip-padding shadow-lg border border-border transition-all duration-200 bg-card rounded-2xl">
          {/* Controls row */}
          <div className="flex items-center justify-between px-3 py-3">
            {/* Left side controls */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md hover:bg-accent outline-none ring-0"
                title="Upload image"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconPhoto className="size-4 text-muted-foreground" />
              </Button>

              {/* Model selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-md hover:bg-accent outline-none ring-0 gap-1.5"
                  >
                    <IconSparkles className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {GEMINI_IMAGE_MODELS.find((m) => m.value === currentModel)?.label || currentModel}
                    </span>
                    <IconChevronDown className="size-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-w-xs rounded-2xl p-1.5"
                >
                  <DropdownMenuGroup className="space-y-1">
                    {GEMINI_IMAGE_MODELS.map((model) => (
                      <DropdownMenuItem
                        key={model.value}
                        className={cn(
                          "rounded-[calc(1rem-6px)]",
                          currentModel === model.value && "bg-accent"
                        )}
                        onClick={() => handleModelChange(model.value)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{model.label}</span>
                          {model.description && (
                            <span className="text-xs text-muted-foreground">
                              {model.description}
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Selected elements toggle - only show when elements are selected */}
              {hasSelectedElements && onSendSelectedOnlyChange && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 ml-1">
                  <Switch
                    checked={sendSelectedOnly}
                    onCheckedChange={onSendSelectedOnlyChange}
                    className="h-4 w-7"
                  />
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
                    Apply to selected only
                  </span>
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap sm:hidden">
                    Selected
                  </span>
                </div>
              )}
            </div>

            {/* Right side - annotation button */}
            {onAnnotationSubmit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-md gap-1.5 px-3 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                disabled={isLoading}
                title="Interpret drawings and annotations as edit instructions"
                onClick={() => {
                  onAnnotationSubmit("", currentModel);
                }}
              >
                <IconWand className="size-3.5" />
                <span className="text-xs font-medium">Apply Annotations</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
