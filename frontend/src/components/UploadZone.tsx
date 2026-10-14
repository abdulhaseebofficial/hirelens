import { useCallback, useId, useState } from "react";

import { IconAlert, IconFile, IconUpload, IconX } from "@/components/icons";

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
    <div className="flex h-full flex-col gap-3">
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
        className={`group relative flex min-h-[13rem] flex-1 cursor-pointer flex-col items-center
          justify-center gap-2.5 overflow-hidden rounded-card border-[1.5px] border-dashed px-6 py-10
          text-center transition-all duration-200
          ${
            dragging
              ? "scale-[1.01] border-coral bg-coral/10"
              : "border-line-strong bg-paper-raised hover:border-coral/60 hover:bg-paper-hover"
          }
          ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`grid h-12 w-12 place-items-center rounded-2xl border border-coral/25
            bg-coral/12 text-coral-light transition-transform duration-200
            ${dragging ? "scale-110" : "group-hover:scale-105"}`}
        >
          <IconUpload className="h-5 w-5" />
        </span>
        <span className="font-semibold text-ink">
          {dragging ? "Release to add these CVs" : "Drop CVs here, or browse"}
        </span>
        <span className="text-xs text-ink-muted">
          PDF only · up to {maxFiles} files · max {maxFileSizeMb} MB each
        </span>
        <input
          id={inputId}
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
        <ul className="space-y-1.5 rounded-xl border border-fit-low/30 bg-fit-low/10 p-3 text-xs text-fit-low-light">
          {rejected.map((problem) => (
            <li key={problem} className="flex items-start gap-2">
              <IconAlert className="mt-px h-3.5 w-3.5 shrink-0" />
              {problem}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}`}
              className="animate-fade flex items-center gap-3 rounded-xl border border-line
                bg-paper-sunken px-3 py-2.5 text-sm"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-paper-raised text-ink-faint">
                <IconFile className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate" title={file.name}>
                {file.name}
              </span>
              <span className="shrink-0 text-xs text-ink-faint tabular-nums">
                {formatSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={disabled}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-muted
                  transition-colors hover:bg-fit-low/15 hover:text-fit-low-light"
                aria-label={`Remove ${file.name}`}
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
