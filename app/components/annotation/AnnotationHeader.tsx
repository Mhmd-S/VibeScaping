import {
    Download,
    Loader2,
    RefreshCcw,
    Send,
} from "lucide-react";
import { Button } from "../ui/button";

interface AnnotationHeaderProps {
  annotationCount: number;
  isRevising: boolean;
  isInitialImage: boolean;
  onSendForNewInitialImage: () => void;
  onSendForRevision: () => void;
  onDownloadImage: () => void;
}

export const AnnotationHeader = ({
  annotationCount,
  isRevising,
  onSendForRevision,
  isInitialImage,
  onSendForNewInitialImage,
  onDownloadImage,
}: AnnotationHeaderProps) => {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">
            Creative Mode
          </h2>
          <p className="text-xs text-muted-foreground">
            Draw shapes and add annotations, then send for AI revision.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onDownloadImage}
          disabled={isRevising}
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Download image
        </Button>
        {isInitialImage && (
          <Button
            onClick={onSendForNewInitialImage}
            disabled={annotationCount > 1 || isRevising}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            {isRevising ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Revising...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4" />
                Regenerate initial image
              </>
            )}
          </Button>
        )}
        <Button
          onClick={onSendForRevision}
          disabled={annotationCount === 0 || isRevising}
          size="sm"
          className="w-full sm:w-auto"
        >
          {isRevising ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Revising...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send for Revision
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
