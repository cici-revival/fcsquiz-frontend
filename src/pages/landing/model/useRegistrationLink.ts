import { useEffect, useState } from "react";
import { adminkaApi } from "@shared/api/adminkaApi";
import { NotFoundError } from "@shared/api/errors";
import { isHttpsUrl } from "@shared/lib/isHttpsUrl";

export function useRegistrationLink(): string | null {
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    adminkaApi
      .getRegistrationLink()
      .then(({ link }) => {
        if (isActive && isHttpsUrl(link)) setLink(link);
      })
      .catch((error) => {
        if (!(error instanceof NotFoundError)) {
          console.error("Не удалось получить ссылку регистрации:", error);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return link;
}
