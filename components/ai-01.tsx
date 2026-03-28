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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  IconSend,
  IconSparkles,
  IconPhoto,
  IconChevronDown,
  IconHistory,
  IconWand,
} from "@tabler/icons-react";
import { useRef, useState, useEffect } from "react";
import { getPromptHistory } from "@/app/utils/promptHistory";

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
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string, model?: GeminiImageModel) => void;
  onFileSelect?: (files: File[]) => void;
  placeholder?: string;
  showTitle?: boolean;
  isLoading?: boolean;
  selectedModel?: GeminiImageModel;
  onModelChange?: (model: GeminiImageModel) => void;
  hasSelectedElements?: boolean;
  sendSelectedOnly?: boolean;
  onSendSelectedOnlyChange?: (value: boolean) => void;
  onAnnotationSubmit?: (value: string, model?: GeminiImageModel) => void;
  isVisible?: boolean;
  onClose?: () => void;
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
  hasSelectedElements = false,
  sendSelectedOnly = false,
  onSendSelectedOnlyChange,
  onAnnotationSubmit,
  isVisible = true,
  onClose,
}: Ai01Props) {
  const [message, setMessage] = useState(value);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentModel, setCurrentModel] = useState<GeminiImageModel>(selectedModel);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHistoryOpen = (open: boolean) => {
    setHistoryOpen(open);
    if (open) {
      setPromptHistory(getPromptHistory());
    }
  };

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

      <form onSubmit={handleSubmit} className="group/composer w-full">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={handleFileChange}
        />

        {/* Main input container */}
        <div className="w-full mx-auto dark:bg-muted/50 cursor-text overflow-clip bg-clip-padding shadow-lg border border-border transition-all duration-200 bg-card rounded-2xl">
          {/* Text input area */}
          <div className="flex min-h-14 items-center overflow-x-hidden px-4 py-3">
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

          {/* Bottom controls row - v0 style */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-border/50">
            {/* Left side controls */}
            <div className="flex items-center gap-1">
              {/* <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-accent outline-none ring-0"
                  >
                    <IconPlus className="size-4 text-muted-foreground" />
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
              </DropdownMenu> */}

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

              {/* Prompt history */}
              <Popover open={historyOpen} onOpenChange={handleHistoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-accent outline-none ring-0"
                    title="Prompt history"
                  >
                    <IconHistory className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  className="w-80 max-h-64 overflow-y-auto p-2"
                >
                  {promptHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">No prompt history yet</p>
                  ) : (
                    <div className="space-y-1">
                      {promptHistory.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent truncate"
                          onClick={() => {
                            setMessage(p);
                            onChange?.(p);
                            setHistoryOpen(false);
                            textareaRef.current?.focus();
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>

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

            {/* Right side - submit buttons */}
            <div className="flex items-center gap-1.5">
              {onAnnotationSubmit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md gap-1.5 px-3 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                  disabled={isLoading}
                  title="Interpret drawings and annotations as edit instructions"
                  onClick={() => {
                    onAnnotationSubmit(message.trim(), currentModel);
                    if (!onChange) setMessage("");
                    setIsExpanded(false);
                  }}
                >
                  <IconWand className="size-3.5" />
                  <span className="text-xs font-medium hidden sm:inline">Apply Annotations</span>
                </Button>
              )}

              <Button
                type="submit"
                size="icon"
                className="h-8 w-8 rounded-md"
                disabled={isLoading}
                title="Generate"
              >
                <IconSend className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
