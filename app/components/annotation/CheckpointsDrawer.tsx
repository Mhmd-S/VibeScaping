import { X } from "lucide-react";
import { RevisionNode } from "../../types/landscape";

const publicImageBaseUrl =
  process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;

const toPublicImageUrl = (originalUrl?: string | null) => {
  if (!originalUrl) return undefined;
  if (!publicImageBaseUrl) return originalUrl;

  try {
    const parsed = new URL(originalUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return originalUrl;

    const keyPath =
      segments[0] === "projects" ? segments.join("/") : segments.slice(1).join("/") || segments[0];
    const normalizedBase = publicImageBaseUrl.replace(/\/$/, "");
    return `${normalizedBase}/${keyPath}`;
  } catch {
    return originalUrl;
  }
};

const resolveRevisionImage = (image?: string, mimeType?: string) => {
  if (!image) return "";

  const safeMime = mimeType || "image/png";

  if (image.startsWith("data:")) {
    return image;
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return toPublicImageUrl(image) || image;
  }

  return `data:${safeMime};base64,${image}`;
};

interface CheckpointsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  revisionHistory: RevisionNode[];
  onRestoreCheckpoint: (revisionId: string) => void;
}

export const CheckpointsDrawer = ({
  isOpen,
  onClose,
  revisionHistory,
  onRestoreCheckpoint,
}: CheckpointsDrawerProps) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/40"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-61 w-80 transform border-l border-zinc-800 bg-zinc-900 shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Checkpoints</p>
              <p className="text-xs text-zinc-400">
                Restore any saved revision with its snapshot.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-3">
            {revisionHistory.length === 0 ? (
              <p className="text-sm text-zinc-500">No checkpoints yet.</p>
            ) : (
              revisionHistory
                .slice()
                .reverse()
                .map((rev) => (
                  <div
                    key={rev.id}
                    className="mb-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow"
                  >
                    <div className="aspect-video bg-zinc-900">
                      <img
                        src={resolveRevisionImage(rev.image, rev.mimeType)}
                        alt={rev.label || "Revision"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-2 px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {rev.label || "Revision"}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {new Date(rev.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => onRestoreCheckpoint(rev.id)}
                        className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-white transition-colors hover:bg-zinc-700"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

