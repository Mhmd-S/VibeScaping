import { X } from "lucide-react";
import { Annotation } from "../../types/landscape";

interface AnnotationListProps {
    annotations: Annotation[];
    selectedLabelIds: string[];
    onSelectAnnotation: (id: string) => void;
    onDeleteAnnotation: (id: string) => void;
}

export const AnnotationList = ({
    annotations,
    selectedLabelIds,
    onSelectAnnotation,
    onDeleteAnnotation,
}: AnnotationListProps) => {
    if (annotations.length === 0) return null;

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {annotations.map((ann) => (
          <div
            key={ann.id}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm max-w-xs cursor-pointer transition-colors ${
              selectedLabelIds.includes(ann.id)
                ? "bg-primary ring-2 ring-ring"
                : "bg-secondary hover:bg-secondary/80"
            }`}
            onClick={() => onSelectAnnotation(ann.id)}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: ann.color }}
            />
            <span className={selectedLabelIds.includes(ann.id) ? "text-primary-foreground truncate" : "text-card-foreground truncate"}>
              {ann.text || `${ann.type} annotation`}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteAnnotation(ann.id);
              }}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

