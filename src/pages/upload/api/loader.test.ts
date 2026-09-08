import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminkaApi } from "@/shared/api/adminkaApi";
import { uploadGameStateTable } from "./loader";

vi.mock("@/shared/api/adminkaApi", () => ({
  adminkaApi: {
    createFileUploadURL: vi.fn(),
    submitFile: vi.fn(),
    startRegistrationImport: vi.fn(),
    getRegistrationImport: vi.fn(),
  },
}));

const file = new File(["content"], "registrations.xlsx");
const result = {
  total_registration_records: 3,
  new_registration_records_count: 2,
  unique_new_teams_count: 1,
  old_changes_count: 0,
  new_changes_count: 1,
  new_lost_players_count: 0,
};

describe("uploadGameStateTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    vi.mocked(adminkaApi.createFileUploadURL).mockResolvedValue({
      file_id: "file-id",
      upload_url: "https://storage.example/upload",
      required_headers: { "If-None-Match": "*" },
    });
    vi.mocked(adminkaApi.submitFile).mockResolvedValue(undefined);
    vi.mocked(adminkaApi.startRegistrationImport).mockResolvedValue({ status: "queued" });
  });

  it("uploads, submits and processes the file", async () => {
    vi.mocked(adminkaApi.getRegistrationImport).mockResolvedValue({
      status: "succeeded",
      result,
    });

    await expect(uploadGameStateTable(file, 10, 2)).resolves.toEqual(result);
    expect(adminkaApi.createFileUploadURL).toHaveBeenCalledWith({
      filename: "registrations.xlsx",
      size: file.size,
    });
    expect(fetch).toHaveBeenCalledWith("https://storage.example/upload", {
      method: "PUT",
      headers: { "If-None-Match": "*" },
      body: file,
    });
    expect(adminkaApi.submitFile).toHaveBeenCalledWith("file-id");
    expect(adminkaApi.startRegistrationImport).toHaveBeenCalledWith({
      file_id: "file-id",
      game_id: { season: 10, game_number: 2 },
    });
  });

  it("stops when direct upload fails", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403 } as Response);

    await expect(uploadGameStateTable(file, 10, 2)).rejects.toThrow(
      "Не удалось загрузить файл в хранилище (403)",
    );
    expect(adminkaApi.submitFile).not.toHaveBeenCalled();
  });

  it("shows processing errors returned by backend", async () => {
    vi.mocked(adminkaApi.getRegistrationImport).mockResolvedValue({
      status: "failed",
      errors: ["строка 4: неверное значение"],
    });

    await expect(uploadGameStateTable(file, 10, 2)).rejects.toThrow(
      "строка 4: неверное значение",
    );
  });
});
