import { type FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import type { GameID } from "@/types/api";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";
import { useTeamStore } from "@/entities/team/model/team.store";
import { adminkaApi } from "@shared/api/adminkaApi";
import { NotFoundError } from "@shared/api/errors";
import { getRegistrationLinkErrorMessage } from "@shared/api/statusMessages";
import { isHttpsUrl } from "@shared/lib/isHttpsUrl";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Label } from "@shared/ui/Label";
import Badge from "@shared/ui/Badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/ui/AlertDialog";
import styles from "./RegistrationLink.module.css";

type Published =
  | { state: "loading" }
  | { state: "error" }
  | { state: "loaded"; game: GameID | null; link: string | null };

type SavedLink =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "loaded"; link: string | null };

function gameLabel(game: GameID): string {
  return `игра №${game.game_number}, сезон ${game.season}`;
}

function gameLabelAccusative(game: GameID): string {
  return `игру №${game.game_number} сезона ${game.season}`;
}

function sameGame(a: GameID | null, b: GameID | null): boolean {
  return !!a && !!b && a.season === b.season && a.game_number === b.game_number;
}

function orNull<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
}

async function copyToClipboard(link: string) {
  try {
    await navigator.clipboard.writeText(link);
    toast.success("Ссылка скопирована");
  } catch {
    toast.error("Не удалось скопировать ссылку");
  }
}

function LinkActions({ link }: { link: string }) {
  return (
    <div className={styles.linkActions}>
      <a
        className={styles.actionLink}
        href={link}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink size={14} />
        Открыть
      </a>
      <Button variant="outline" size="sm" onClick={() => void copyToClipboard(link)}>
        <Copy size={14} />
        Копировать
      </Button>
    </div>
  );
}

export default function RegistrationLinkPage() {
  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);
  const setGameMeta = useTeamStore((s) => s.setGameMeta);

  const [published, setPublished] = useState<Published>({ state: "loading" });
  const [publishedKey, setPublishedKey] = useState(0);

  const [season, setSeason] = useState(0);
  const [gameNumber, setGameNumber] = useState(0);
  const [saved, setSaved] = useState<SavedLink>({ state: "idle" });
  const [savedKey, setSavedKey] = useState(0);

  const [link, setLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    setPublished({ state: "loading" });

    Promise.all([
      orNull(adminkaApi.getCurrentGame()),
      orNull(adminkaApi.getRegistrationLink()),
    ])
      .then(([game, current]) => {
        if (!isActive) return;
        setPublished({ state: "loaded", game, link: current?.link ?? null });
      })
      .catch(() => {
        if (isActive) setPublished({ state: "error" });
      });

    return () => {
      isActive = false;
    };
  }, [publishedKey]);

  const selected: GameID | null =
    season > 0 && gameNumber > 0 ? { season, game_number: gameNumber } : null;

  useEffect(() => {
    if (season <= 0 || gameNumber <= 0) {
      setSaved({ state: "idle" });
      return;
    }

    let isActive = true;
    setSaved({ state: "loading" });
    setSaveError(null);

    orNull(adminkaApi.getRegistrationLink({ season, game_number: gameNumber }))
      .then((response) => {
        if (!isActive) return;
        const value = response?.link ?? null;
        setSaved({ state: "loaded", link: value });
        setLink(value ?? "");
      })
      .catch((error) => {
        if (!isActive) return;
        setSaved({ state: "error", message: getRegistrationLinkErrorMessage(error) });
      });

    return () => {
      isActive = false;
    };
  }, [season, gameNumber, savedKey]);

  const currentGame = published.state === "loaded" ? published.game : null;
  const isSelectedCurrent = sameGame(selected, currentGame);
  const savedLink = saved.state === "loaded" ? saved.link : null;

  const trimmedLink = link.trim();
  const linkError =
    trimmedLink && !isHttpsUrl(trimmedLink)
      ? "Нужна полная ссылка, начинающаяся с https://"
      : null;
  const isUnchanged = saved.state === "loaded" && trimmedLink === (savedLink ?? "");
  const canSave =
    !!selected &&
    saved.state === "loaded" &&
    !!trimmedLink &&
    !linkError &&
    !isUnchanged &&
    !isSaving;

  const save = async () => {
    if (!selected || !canSave) return;

    setIsConfirmOpen(false);
    setIsSaving(true);
    setSaveError(null);

    try {
      await adminkaApi.setRegistrationLink({ ...selected, link: trimmedLink });
      setSaved({ state: "loaded", link: trimmedLink });
      setGameMeta(selected.season, selected.game_number);
      setPublished({ state: "loaded", game: selected, link: trimmedLink });
      toast.success(
        isSelectedCurrent
          ? "Ссылка обновлена"
          : `Ссылка сохранена, текущей стала ${gameLabel(selected)}`,
      );
    } catch (error) {
      setSaveError(getRegistrationLinkErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;

    if (isSelectedCurrent) {
      void save();
    } else {
      setIsConfirmOpen(true);
    }
  };

  const initialSeason = currentGame?.season ?? storeSeason;
  const initialGameNumber = currentGame?.game_number ?? storeGameNumber;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ссылка на регистрацию</h1>
        <p className={styles.subtitle}>
          Кнопка «Регистрация на игру» на главной ведёт на анкету текущей игры.
        </p>
      </header>

      <section className={styles.card} aria-label="Сейчас на главной">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Сейчас на главной</h2>
          {published.state === "loaded" && published.game && (
            <Badge variant="secondary">Текущая: {gameLabel(published.game)}</Badge>
          )}
        </div>

        {published.state === "loading" && (
          <p className={styles.muted}>Загрузка...</p>
        )}

        {published.state === "error" && (
          <div className={styles.inlineError}>
            <span>Не удалось узнать текущую игру</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPublishedKey((key) => key + 1)}
            >
              <RefreshCw size={14} />
              Повторить
            </Button>
          </div>
        )}

        {published.state === "loaded" &&
          (published.link ? (
            <div className={styles.linkRow}>
              <a
                className={styles.link}
                href={published.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {published.link}
              </a>
              <LinkActions link={published.link} />
            </div>
          ) : (
            <p className={styles.muted}>
              {published.game
                ? "Ссылка для текущей игры не задана — кнопки регистрации на главной нет."
                : "Текущая игра не назначена — кнопки регистрации на главной нет."}
            </p>
          ))}
      </section>

      <section className={styles.card} aria-label="Изменить ссылку">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Изменить ссылку</h2>
          {selected && published.state === "loaded" && (
            <Badge variant={isSelectedCurrent ? "secondary" : "outline"}>
              {isSelectedCurrent ? "Текущая игра" : "Не текущая игра"}
            </Badge>
          )}
        </div>

        {published.state !== "loading" && (
          <SelectGameSeason
            key={`${initialSeason}-${initialGameNumber}`}
            onSeasonChange={setSeason}
            onGameNumberChange={setGameNumber}
            initialSeason={initialSeason}
            initialGameNumber={initialGameNumber}
          />
        )}

        {selected && (
          <div className={styles.savedRow}>
            <span className={styles.label}>Сохранено для этой игры</span>
            {saved.state === "loading" && <span className={styles.muted}>Загрузка...</span>}
            {saved.state === "loaded" &&
              (saved.link ? (
                <div className={styles.linkRow}>
                  <a
                    className={styles.link}
                    href={saved.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {saved.link}
                  </a>
                  <LinkActions link={saved.link} />
                </div>
              ) : (
                <span className={styles.muted}>Ссылка не задана</span>
              ))}
            {saved.state === "error" && (
              <div className={styles.inlineError}>
                <span>{saved.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSavedKey((key) => key + 1)}
                >
                  <RefreshCw size={14} />
                  Повторить
                </Button>
              </div>
            )}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <Label htmlFor="registration-link">Новая ссылка</Label>
            <div className={styles.inputRow}>
              <Input
                id="registration-link"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://forms.example.ru/..."
                value={link}
                onChange={(event) => {
                  setLink(event.target.value);
                  setSaveError(null);
                }}
                aria-invalid={!!linkError}
                aria-describedby="registration-link-hint"
                disabled={!selected || saved.state !== "loaded" || isSaving}
              />
              <Button type="submit" disabled={!canSave}>
                {isSaving ? (
                  <>
                    <Loader2 className={styles.spinner} size={16} />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            </div>
            <span
              id="registration-link-hint"
              className={linkError ? styles.fieldError : styles.hint}
            >
              {linkError ??
                (isUnchanged && savedLink
                  ? "Эта ссылка уже сохранена"
                  : "Вставьте ссылку на анкету, например на Яндекс Форму")}
            </span>
          </div>

          {selected && published.state === "loaded" && !isSelectedCurrent && (
            <p className={styles.warning}>
              <TriangleAlert size={16} />
              Сохранение сделает текущей {gameLabelAccusative(selected)}: на неё
              переключатся главная страница и админка.
            </p>
          )}

          {saveError && (
            <p className={styles.fieldError} role="alert">
              <AlertCircle size={16} />
              {saveError}
            </p>
          )}
        </form>
      </section>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сменить текущую игру?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected && (
                <>
                  Ссылка сохранится, и текущей станет {gameLabel(selected)}.
                  {currentGame
                    ? ` Сейчас текущая — ${gameLabel(currentGame)}.`
                    : ""}{" "}
                  Главная и админка переключатся на неё.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => void save()}>
              Сохранить и сделать текущей
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
