import { adminkaApi } from "./adminkaApi";

export async function uploadFile(file: File): Promise<string> {
  const upload = await adminkaApi.createFileUploadURL({
    filename: file.name,
    size: file.size,
  });

  const response = await fetch(upload.upload_url, {
    method: "PUT",
    headers: upload.required_headers,
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить файл в хранилище (${response.status})`);
  }

  await adminkaApi.submitFile(upload.file_id);

  return upload.file_id;
}
