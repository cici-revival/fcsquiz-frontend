import type {
  RegistrationImportResult,
  RegistrationImportStatus,
} from "@/types/api";
import { adminkaApi } from "@/shared/api/adminkaApi";
import { uploadFile } from "@/shared/api/uploadFile";

const POLL_INTERVAL_MS = 1_000;
const MAX_POLL_ATTEMPTS = 120;

function waitForNextPoll(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
}

function importError(status: RegistrationImportStatus): Error {
  const message = status.errors?.filter(Boolean).join("\n");
  return new Error(message || "Не удалось обработать файл регистраций");
}

async function waitForImport(fileID: string): Promise<RegistrationImportResult> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const status = await adminkaApi.getRegistrationImport(fileID);

    if (status.status === "succeeded") {
      if (!status.result) {
        throw new Error("Backend не вернул результат обработки файла");
      }
      return status.result;
    }

    if (status.status === "failed") {
      throw importError(status);
    }

    await waitForNextPoll();
  }

  throw new Error("Обработка файла не завершилась за две минуты");
}

export function uploadGameStateTable(
  file: File,
  season: number,
  game_number: number,
): Promise<RegistrationImportResult> {
  return uploadRegistrationFile(file, season, game_number);
}

async function uploadRegistrationFile(
  file: File,
  season: number,
  gameNumber: number,
): Promise<RegistrationImportResult> {
  const fileID = await uploadFile(file);

  await adminkaApi.startRegistrationImport({
    file_id: fileID,
    game_id: { season, game_number: gameNumber },
  });

  return waitForImport(fileID);
}
