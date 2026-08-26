import readXlsxFile from "read-excel-file";
import { type CellValue } from "read-excel-file";

const EXPECTED_HEADERS = [
  "Фамилия, имя",
  "Ваша группа или подразделение (для сотрудников)",
  "В каком качестве Вы хотите прийти на игру?",
  "Контакт для связи (ник в Telegram через @)",
  "Название команды",
  "Количество участников",
  "Если участникам Вашей команды нужен пропуск, укажите их ФИО полностью",
  "Готова ли ваша команда взять в свой состав легионера (если будут ищущие команду люди)",
  "Какие изменения вы хотите внести?",
  "IP-адрес пользователя",
  "Дата отправки формы",
];

const normalizeHeader = (header: string) =>
  header.replace(/\.\d+$/, "").trim();

export async function parseExcelFile(file: File): Promise<void> {
  try {
    const rows = await readXlsxFile(file);

    if (!rows.length) {
      throw new Error("Файл пустой");
    }

    const headers = rows[0].map(
      (cell: CellValue | null | undefined) => cell?.toString()?.trim() || ""
    );

    const normalizedHeaders = headers.map(normalizeHeader);

    const missingHeaders = EXPECTED_HEADERS.filter(
      (expected) => !normalizedHeaders.includes(expected)
    );

    if (missingHeaders.length > 0) {
      throw new Error(
        `В файле отсутствуют обязательные колонки:\n${missingHeaders.join("\n")}`
      );
    }

    return;
  } catch (error) {
    throw new Error(
      `Ошибка парсинга Excel: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
