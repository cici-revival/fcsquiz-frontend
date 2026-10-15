import { type FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, Loader2, TriangleAlert } from "lucide-react";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";
import { useTeamStore } from "@/entities/team/model/team.store";
import { adminkaApi } from "@shared/api/adminkaApi";
import { NotFoundError } from "@shared/api/errors";
import { getRegistrationLinkErrorMessage } from "@shared/api/statusMessages";
import { isHttpsUrl } from "@shared/lib/isHttpsUrl";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Label } from "@shared/ui/Label";
import { Alert, AlertDescription, AlertTitle } from "@shared/ui/Alert";
import styles from "./RegistrationLink.module.css";

type CurrentLink =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "missing" }
  | { state: "loaded"; link: string }
  | { state: "error"; message: string };

export default function RegistrationLinkPage() {
  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);
  const setGameMeta = useTeamStore((s) => s.setGameMeta);

  const [season, setSeason] = useState(0);
  const [gameNumber, setGameNumber] = useState(0);
  const [current, setCurrent] = useState<CurrentLink>({ state: "idle" });
  const [link, setLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const isGameValid = season > 0 && gameNumber > 0;

  useEffect(() => {
    if (!isGameValid) {
      setCurrent({ state: "idle" });
      return;
    }

    let isActive = true;
    setCurrent({ state: "loading" });

    adminkaApi
      .getRegistrationLink({ season, game_number: gameNumber })
      .then(({ link }) => {
        if (!isActive) return;
        setCurrent({ state: "loaded", link });
        setLink(link);
      })
      .catch((error) => {
        if (!isActive) return;
        if (error instanceof NotFoundError) {
          setCurrent({ state: "missing" });
          setLink("");
          return;
        }
        setCurrent({
          state: "error",
          message: getRegistrationLinkErrorMessage(error),
        });
      });

    return () => {
      isActive = false;
    };
  }, [season, gameNumber, isGameValid, reloadKey]);

  const trimmedLink = link.trim();
  const linkError =
    trimmedLink && !isHttpsUrl(trimmedLink)
      ? "Ссылка должна начинаться с https://"
      : null;
  const canSave = isGameValid && !!trimmedLink && !linkError && !isSaving;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await adminkaApi.setRegistrationLink({
        season,
        game_number: gameNumber,
        link: trimmedLink,
      });
      setCurrent({ state: "loaded", link: trimmedLink });
      setGameMeta(season, gameNumber);
      toast.success(
        `Ссылка сохранена, игра №${gameNumber} сезона ${season} теперь текущая`,
      );
    } catch (error) {
      setSaveError(getRegistrationLinkErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Ссылка на регистрацию</h1>

      <SelectGameSeason
        onSeasonChange={setSeason}
        onGameNumberChange={setGameNumber}
        initialSeason={storeSeason}
        initialGameNumber={storeGameNumber}
      />

      {isGameValid && (
        <section className={styles.current} aria-label="Текущая ссылка">
          <span className={styles.currentLabel}>Сейчас у этой игры</span>
          {current.state === "loading" && <span>Загрузка...</span>}
          {current.state === "missing" && <span>Ссылка не задана</span>}
          {current.state === "loaded" && (
            <a
              className={styles.currentLink}
              href={current.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {current.link}
            </a>
          )}
          {current.state === "error" && (
            <Alert variant="destructive">
              <AlertCircle />
              <div>
                <AlertTitle>Не удалось загрузить ссылку</AlertTitle>
                <AlertDescription>{current.message}</AlertDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Повторить
              </Button>
            </Alert>
          )}
        </section>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <Label htmlFor="registration-link">Новая ссылка</Label>
          <Input
            id="registration-link"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            aria-invalid={!!linkError}
          />
          {linkError && <span className={styles.fieldError}>{linkError}</span>}
        </div>

        <Alert>
          <TriangleAlert />
          <div>
            <AlertTitle>Игра станет текущей</AlertTitle>
            <AlertDescription>
              Сохранение не только запишет ссылку, но и назначит
              {isGameValid
                ? ` игру №${gameNumber} сезона ${season} `
                : " выбранную игру "}
              текущей — на неё переключатся главная страница и админка.
            </AlertDescription>
          </div>
        </Alert>

        {saveError && (
          <Alert variant="destructive">
            <AlertCircle />
            <div>
              <AlertTitle>Не удалось сохранить</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </div>
          </Alert>
        )}

        <div className={styles.actions}>
          <Button type="submit" disabled={!canSave}>
            {isSaving ? (
              <>
                <Loader2 className={styles.spinner} size={16} />
                Сохранение...
              </>
            ) : (
              "Сохранить и сделать текущей"
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}
