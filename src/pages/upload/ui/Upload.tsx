import { Button } from "@shared/ui/Button";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { FileDropzone } from "@shared/ui/FileDropzone";
import toast from "react-hot-toast";
import styles from "./Upload.module.css";

import { parseExcelFile } from "./parseExcelFile";
import { uploadGameStateTable } from "@/pages/upload/api/loader";
import { useTeamStore } from "@/entities/team/model/team.store";
import { useUploadResultStore } from "../model/uploadResult.store";
import { ImportRecords } from "./ImportRecords";

const VALID_EXTENSIONS = [".xlsx", ".xls"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isHeadersValid, setIsHeadersValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadResult = useUploadResultStore((s) => s.result);
  const setUploadResult = useUploadResultStore((s) => s.setResult);

  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);

  const [season, setSeason] = useState<number>(0);
  const [gameNumber, setGameNumber] = useState<number>(0);

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

  const handleFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError("Файл слишком большой. Максимальный размер: 10MB");
      return;
    }

    const fileExtension = file.name
      .toLowerCase()
      .slice(file.name.lastIndexOf("."));

    if (!VALID_EXTENSIONS.includes(fileExtension)) {
      setError(
        `Пожалуйста, выберите файл в формате: ${VALID_EXTENSIONS.join(", ")}`,
      );
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
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Загрузить таблицу участников</h1>
      </header>

      {uploadResult && (
        <section className={styles.result} aria-label="Результат импорта">
          <h2>Импорт завершён</h2>
          <dl className={styles.resultGrid}>
            <div><dt>Всего регистраций</dt><dd>{uploadResult.total_registration_records}</dd></div>
            <div><dt>Новых регистраций</dt><dd>{uploadResult.new_registration_records_count}</dd></div>
            <div><dt>Новых команд</dt><dd>{uploadResult.unique_new_teams_count}</dd></div>
            <div><dt>Новых изменений</dt><dd>{uploadResult.new_changes_count}</dd></div>
            <div><dt>Старых изменений</dt><dd>{uploadResult.old_changes_count}</dd></div>
            <div><dt>Игроков без команды</dt><dd>{uploadResult.new_lost_players_count}</dd></div>
          </dl>
          <ImportRecords records={uploadResult.records} />
        </section>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <SelectGameSeason
          onSeasonChange={setSeason}
          onGameNumberChange={setGameNumber}
          initialSeason={storeSeason}
          initialGameNumber={storeGameNumber}
        />

        <FileDropzone
          file={selectedFile}
          accept=".xlsx,.xls"
          formats="XLSX, XLS"
          label="Файл участников"
          onFile={handleFile}
          onRemove={handleRemoveFile}
          disabled={isParsing}
          status={isParsing ? "loading" : error ? "error" : "ok"}
          details={isHeadersValid ? "Заголовки проверены" : undefined}
        />

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
