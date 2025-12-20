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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  IconMicrophone,
  IconPaperclip,
  IconPlus,
  IconSearch,
  IconSend,
  IconSparkles,
  IconWaveSine,
} from "@tabler/icons-react";
import { useRef, useState, useEffect } from "react";

export type GeminiImageModel = 
  | 'gemini-3-pro-image-preview'
  | 'gemini-2.5-flash-image'
  | 'gemini-2.0-flash-preview-image-generation';

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
  { 
    value: 'gemini-2.0-flash-preview-image-generation', 
    label: 'Gemini 2.0 Flash Preview',
    description: 'Preview model for image generation'
  },
];

interface Ai01Props {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string, model?: GeminiImageModel) => void;
  onFileSelect?: (files: File[]) => void;
  placeholder?: string;
  showTitle?: boolean;
  isLoading?: boolean;
  selectedModel?: GeminiImageModel;
  onModelChange?: (model: GeminiImageModel) => void;
}

export default function Ai01({
  value = "",
  onChange,
  onSubmit,
  onFileSelect,
  placeholder = "Ask anything",
  showTitle = false,
  isLoading = false,
  selectedModel = 'gemini-3-pro-image-preview',
  onModelChange,
}: Ai01Props) {
  const [message, setMessage] = useState(value);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentModel, setCurrentModel] = useState<GeminiImageModel>(selectedModel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessage(value);
  }, [value]);

  useEffect(() => {
    setCurrentModel(selectedModel);
  }, [selectedModel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() && !isLoading) {
      onSubmit?.(message.trim(), currentModel);
      if (!onChange) {
        setMessage("");
      }
      setIsExpanded(false);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleModelChange = (newModel: GeminiImageModel) => {
    setCurrentModel(newModel);
    onModelChange?.(newModel);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    onChange?.(newValue);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    setIsExpanded(newValue.length > 100 || newValue.includes("\n"));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
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

  return (
    <div className="absolute bottom-8 left-[30%] z-30">
      {showTitle && (
        <h1 className="mb-7 mx-auto max-w-2xl text-center text-2xl font-semibold leading-9 text-foreground px-1 text-pretty whitespace-pre-wrap">
          How can I help you today?
        </h1>
      )}

      <form onSubmit={handleSubmit} className="group/composer w-full">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={handleFileChange}
        />

        <div
          className={cn(
            "w-2xl mx-auto dark:bg-muted/50 cursor-text overflow-clip bg-clip-padding p-2.5 shadow-lg border border-border transition-all duration-200 bg-card",
            {
              "rounded-3xl grid grid-cols-1 grid-rows-[auto_1fr_auto]":
                isExpanded,
              "rounded-[28px] grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto]":
                !isExpanded,
            }
          )}
          style={{
            gridTemplateAreas: isExpanded
              ? "'header' 'primary' 'footer'"
              : "'header header header' 'leading primary trailing' '. footer .'",
          }}
        >
          <div
            className={cn(
              "flex min-h-14 items-center overflow-x-hidden px-1.5",
              {
                "px-2 py-1 mb-0": isExpanded,
                "-my-2.5": !isExpanded,
              }
            )}
            style={{ gridArea: "primary" }}
          >
            <div className="flex-1 overflow-auto max-h-30">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLoading}
                className="min-h-0 resize-none rounded-none border-0 p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin dark:bg-transparent"
                rows={1}
              />
            </div>
          </div>

          <div
            className={cn("flex", { hidden: isExpanded })}
            style={{ gridArea: "leading" }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full hover:bg-accent outline-none ring-0"
                >
                  <IconPlus className="size-6 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="start"
                className="max-w-xs rounded-2xl p-1.5"
              >
                <DropdownMenuGroup className="space-y-1">
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconPaperclip size={20} className="opacity-60" />
                    Add photos & files
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div
            className="flex items-center gap-2"
            style={{ gridArea: isExpanded ? "footer" : "trailing" }}
          >
            <div className="ms-auto flex items-center gap-1.5">
              {isExpanded && (
                <Select value={currentModel} onValueChange={handleModelChange}>
                  <SelectTrigger className="h-9 w-fit min-w-[180px] text-xs">
                    <IconSparkles className="size-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEMINI_IMAGE_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!isExpanded && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 rounded-full hover:bg-accent outline-none ring-0 gap-2"
                      title="Change model"
                    >
                      <IconSparkles className="size-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {GEMINI_IMAGE_MODELS.find((m) => m.value === currentModel)?.label || currentModel}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
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
              )}
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 rounded-full"
                disabled={isLoading}
              >
                <IconSend className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
