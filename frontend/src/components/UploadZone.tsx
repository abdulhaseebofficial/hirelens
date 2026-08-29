import { useCallback, useId, useRef, useState } from "react";

interface UploadZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles: number;
  maxFileSizeMb: number;
  disabled?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadZone({
  files,
  onChange,
  maxFiles,
  maxFileSizeMb,
  disabled = false,
}: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;

      const problems: string[] = [];
      const accepted: File[] = [];

      for (const file of Array.from(incoming)) {
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          problems.push(`${file.name} — only PDF files are supported.`);
          continue;
        }
        if (file.size > maxFileSizeMb * 1024 * 1024) {
          problems.push(`${file.name} — larger than ${maxFileSizeMb} MB.`);
          continue;
        }
        // Same name and size twice is a re-drop of the same CV, not a second candidate.
        if (files.some((f) => f.name === file.name && f.size === file.size)) {
          continue;
        }
        accepted.push(file);
      }

      const merged = [...files, ...accepted];
      if (merged.length > maxFiles) {
        problems.push(`Only the first ${maxFiles} CVs were kept — that is the batch limit.`);
      }

      setRejected(problems);
      onChange(merged.slice(0, maxFiles));
    },
    [files, maxFileSizeMb, maxFiles, onChange],
  );

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setRejected([]);
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl
          border-[1.5px] border-dashed px-6 py-10 text-center transition-colors
          ${dragging ? "border-coral bg-coral/10" : "border-line bg-paper-raised"}
          ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-coral/60"}`}
      >
        <svg
          className="h-8 w-8 text-coral"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
        <span className="font-semibold text-ink">Drop CVs here, or browse</span>
        <span className="text-xs text-ink-muted">
          PDF only · up to {maxFiles} files · max {maxFileSizeMb} MB each
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            // Reset so re-selecting the same file still fires a change event.
            event.target.value = "";
          }}
        />
      </label>

      {rejected.length > 0 && (
        <ul className="space-y-1 text-xs text-fit-low-light">
          {rejected.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-line
                bg-paper-sunken px-3.5 py-2.5 text-sm"
            >
              <span className="truncate" title={file.name}>
                {file.name}
              </span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-ink-muted">{formatSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  className="text-ink-muted transition-colors hover:text-fit-low-light"
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
