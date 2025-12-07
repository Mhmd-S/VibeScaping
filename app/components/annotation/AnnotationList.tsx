import { X } from "lucide-react";
import { Annotation } from "../../types/landscape";

interface AnnotationListProps {
  annotations: Annotation[];
  selectedLabelId: string | null;
  onSelectAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
}

export const AnnotationList = ({
  annotations,
  selectedLabelId,
  onSelectAnnotation,
  onDeleteAnnotation,
}: AnnotationListProps) => {
  if (annotations.length === 0) return null;

  return (
    <div className="border-t border-zinc-700 bg-zinc-800 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {annotations.map((ann) => (
          <div
            key={ann.id}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm max-w-xs cursor-pointer transition-colors ${
              selectedLabelId === ann.id
                ? "bg-blue-600 ring-2 ring-blue-400"
                : "bg-zinc-700 hover:bg-zinc-600"
            }`}
            onClick={() => onSelectAnnotation(ann.id)}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: ann.color }}
            />
            <span className="text-white truncate">
              {ann.text || `${ann.type} annotation`}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteAnnotation(ann.id);
              }}
              className="shrink-0 text-zinc-400 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

