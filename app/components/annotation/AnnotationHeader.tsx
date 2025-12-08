import { Loader2, Send } from "lucide-react";

interface AnnotationHeaderProps {
  annotationCount: number;
  isRevising: boolean;
  isInitialImage: boolean;
  onSendForNewInitialImage: () => void;
  onSendForRevision: () => void;
}

export const AnnotationHeader = ({
  annotationCount,
  isRevising,
  onSendForRevision,
  isInitialImage,
  onSendForNewInitialImage,
}: AnnotationHeaderProps) => {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-700 bg-zinc-800 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Creative Mode
          </h2>
          <p className="text-xs text-zinc-400">
            Draw shapes and add annotations, then send for AI revision.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {isInitialImage && (
          <button
            onClick={onSendForNewInitialImage}
            disabled={annotationCount > 1 || isRevising}
            className="w-full rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isRevising ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Revising...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Regenerate initial image
              </span>
            )}
          </button>
        )}
        <button
          onClick={onSendForRevision}
          disabled={annotationCount === 0 || isRevising}
          className="w-full rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isRevising ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Revising...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send for Revision
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
