import { type ChangeEvent, type DragEvent, type ReactNode, useState } from "react";
import { Check, FileText, Loader2, TriangleAlert, X } from "lucide-react";
import { Button } from "../Button";
import styles from "./FileDropzone.module.css";

export type FileDropzoneStatus = "idle" | "loading" | "error" | "ok";

type FileDropzoneProps = {
  file: File | null;
  accept: string;
  formats: string;
  onFile: (file: File) => void;
  onRemove: () => void;
  status?: FileDropzoneStatus;
  details?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileDropzone({
  file,
  accept,
  formats,
  onFile,
  onRemove,
  status = "idle",
  details,
  disabled = false,
  compact = false,
  label = "Файл",
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (selected) onFile(selected);
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  };

  const className = [
    styles.dropzone,
    compact && styles.compact,
    isDragging && styles.dragging,
    file && styles.collapsed,
    disabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        aria-label={label}
        className={styles.input}
        onChange={handleChange}
        disabled={disabled}
      />

      {file ? (
        <div className={styles.selected}>
          <div className={styles.fileInfo}>
            {status === "loading" ? (
              <Loader2 className={styles.spinner} strokeWidth={1.5} />
            ) : status === "error" ? (
              <TriangleAlert className={styles.errorIcon} strokeWidth={1.5} />
            ) : (
              <Check className={styles.okIcon} strokeWidth={1.5} />
            )}

            <div>
              <p className={styles.fileName}>{file.name}</p>
              <p className={styles.fileSize}>{formatSize(file.size)}</p>
              {details && <div className={styles.details}>{details}</div>}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className={styles.removeButton}
            onClick={onRemove}
            disabled={disabled}
          >
            <X size={16} />
            Удалить файл
          </Button>
        </div>
      ) : (
        <div className={styles.empty}>
          <FileText strokeWidth={1.5} />
          <p className={styles.dropText}>Поддерживаемые форматы данных:</p>
          <span className={styles.format}>{formats}</span>
          <p className={styles.dropHint}>Нажмите на область или перетащите файл сюда</p>
        </div>
      )}
    </div>
  );
}
