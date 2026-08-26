import { Button } from "@shared/ui/Button";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";
import {
  FileText,
  TriangleAlert,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { type FormEvent, useState, useRef } from "react";
import toast from "react-hot-toast";
import styles from "./Upload.module.css";

import { parseExcelFile } from "./parseExcelFile";
import { uploadGameStateTable } from "@/pages/upload/api/loader";
import { useTeamStore } from "@/entities/team/model/team.store";
import { useUploadResultStore } from "../model/uploadResult.store";
import RegistrationAccordion from "./RegistrationAccordion";

const VALID_EXTENSIONS = [".xlsx", ".xls"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isHeadersValid, setIsHeadersValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadResult = useUploadResultStore((s) => s.result);
  const setUploadResult = useUploadResultStore((s) => s.setResult);

  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);

  const [season, setSeason] = useState<number>(0);
  const [gameNumber, setGameNumber] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Пожалуйста, выберите файл");
      return;
    }

    const seasonNum = season;
    const gameNum = gameNumber;

    if (seasonNum < 0 || seasonNum > 100) {
      setError("Пожалуйста, введите корректный номер сезона (0-100)");
      return;
    }

    if (gameNum < 1 || gameNum > 100) {
      setError("Пожалуйста, введите корректный номер игры (1-100)");
      return;
    }

    setIsParsing(true);
    setError(null);
    setUploadResult(null);

    try {
      await parseExcelFile(selectedFile);
      setIsHeadersValid(true);

      const response = await uploadGameStateTable(
        selectedFile,
        seasonNum,
        gameNum,
      );

      setUploadResult(response);

      toast.success(
        `Данные сезона ${seasonNum}, игра №${gameNum} успешно загружены`,
      );

      handleRemoveFile();
    } catch (error) {
      console.error("Ошибка при обработке файла:", error);
      setError(error instanceof Error ? error.message : "Неизвестная ошибка");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > MAX_FILE_SIZE) {
      setError("Файл слишком большой. Максимальный размер: 10MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const fileExtension = file.name
      .toLowerCase()
      .slice(file.name.lastIndexOf("."));

    if (!VALID_EXTENSIONS.includes(fileExtension)) {
      setError(
        `Пожалуйста, выберите файл в формате: ${VALID_EXTENSIONS.join(", ")}`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setIsHeadersValid(false);
    setError(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setIsHeadersValid(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];

      if (file.size > MAX_FILE_SIZE) {
        setError("Файл слишком большой. Максимальный размер: 10MB");
        return;
      }

      const fileExtension = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf("."));

      if (!VALID_EXTENSIONS.includes(fileExtension)) {
        setError(
          `Пожалуйста, используйте файл в формате: ${VALID_EXTENSIONS.join(", ")}`,
        );
        return;
      }

      setSelectedFile(file);
      setIsHeadersValid(false);
      setError(null);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Загрузить таблицу участников</h1>
      </header>

      {uploadResult && (
        <RegistrationAccordion
          newRecords={uploadResult.new_registration_records}
          oldRecords={uploadResult.old_registration_records}
        />
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <SelectGameSeason
          onSeasonChange={setSeason}
          onGameNumberChange={setGameNumber}
          initialSeason={storeSeason}
          initialGameNumber={storeGameNumber}
        />

        <div
          className={`
            ${styles.dropzone}
            ${isDragging ? styles.dragging : ""}
            ${selectedFile ? styles.collapsed : ""}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className={styles.uploadInput}
            onChange={handleFileSelect}
            disabled={isParsing}
          />

          <div className={styles.dropzoneContent}>
            {selectedFile ? (
              <>
                <div className={styles.fileInfo}>
                  {isParsing ? (
                    <Loader2 className={styles.loaderIcon} strokeWidth={1.5} />
                  ) : error ? (
                    <TriangleAlert strokeWidth={1.5} />
                  ) : (
                    <Check className={styles.successIcon} strokeWidth={1.5} />
                  )}

                  <div>
                    <p className={styles.fileName}>{selectedFile.name}</p>
                    <p className={styles.fileSize}>
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    {isHeadersValid && (
                      <p className={styles.parseInfo}>
                        Заголовки проверены
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className={styles.removeButton}
                  disabled={isParsing}
                >
                  <X size={16} />
                  Удалить файл
                </Button>
              </>
            ) : (
              <>
                <FileText strokeWidth={1.5} />
                <p className={styles.dropText}>
                  Поддерживаемые форматы данных:
                </p>
                <span className={styles.format}>XLSX, XLS</span>
                <p className={styles.dropHint}>
                  Нажмите на область или перетащите файл сюда
                </p>
              </>
            )}
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <Button type="submit" disabled={!selectedFile || isParsing}>
            {isParsing ? (
              <>
                <Loader2 className={styles.buttonLoader} size={16} />
                Обработка...
              </>
            ) : (
              "Отправить файл"
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}
