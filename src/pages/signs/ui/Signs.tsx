import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useTeamStore } from "@entities/team/model/team.store";
import { useSignStore, bootstrapSigns, shutdownSigns } from "@entities/sign";
import { adminkaApi } from "@shared/api/adminkaApi";
import Checkbox from "@shared/ui/Checkbox";
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

import { Search } from "lucide-react";

import styles from "./Signs.module.css";
import { useTypeahead } from "./useTypeahead";

const collator = new Intl.Collator("ru");

function progressColor(ratio: number): string {
  if (ratio >= 1) return "#22c55e";
  if (ratio >= 0.66) return "#84cc16";
  if (ratio >= 0.33) return "#eab308";
  return "#ef4444";
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{ backgroundColor: "yellow" }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function SignsPage() {
  const teamsMap = useTeamStore((s) => s.teams);
  const signedTeamIds = useSignStore((s) => s.signedTeamIds);
  const applyEvent = useSignStore((s) => s.applyEvent);

  const allTeams = useMemo(
    () =>
      Array.from(teamsMap.values()).sort((a, b) =>
        collator.compare(a.name, b.name),
      ),
    [teamsMap],
  );

  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { query, flashChar, flashKey } = useTypeahead(pendingRemoval === null);

  const teams = useMemo(() => {
    if (!query) return allTeams;
    const needle = query.toLocaleLowerCase("ru");
    return allTeams.filter((t) =>
      t.name.toLocaleLowerCase("ru").includes(needle),
    );
  }, [allTeams, query]);

  useEffect(() => {
    bootstrapSigns();

    adminkaApi.getSigns().then((data) => {
      useSignStore.getState().setInitial(data.team_ids);
    });

    return () => shutdownSigns();
  }, []);

  const addSign = useCallback(
    async (teamId: string) => {
      applyEvent({ type: "sign_added", team_id: teamId });
      try {
        await adminkaApi.addSigns({ team_ids: [teamId] });
      } catch {
        applyEvent({ type: "sign_removed", team_id: teamId });
        toast.error("Не удалось обновить табличку");
      }
    },
    [applyEvent],
  );

  const removeSign = useCallback(
    async (teamId: string) => {
      applyEvent({ type: "sign_removed", team_id: teamId });
      try {
        await adminkaApi.deleteSigns({ team_ids: [teamId] });
      } catch {
        applyEvent({ type: "sign_added", team_id: teamId });
        toast.error("Не удалось обновить табличку");
      }
    },
    [applyEvent],
  );

  const handleToggle = useCallback(
    (team: { id: string; name: string }, checked: boolean) => {
      if (checked) {
        void addSign(team.id);
      } else {
        setPendingRemoval(team);
      }
    },
    [addSign],
  );

  const confirmRemoval = useCallback(() => {
    if (!pendingRemoval) return;
    void removeSign(pendingRemoval.id);
    setPendingRemoval(null);
  }, [pendingRemoval, removeSign]);

  const signedCount = useMemo(
    () =>
      allTeams.reduce(
        (acc, t) => (t.id && signedTeamIds.has(t.id) ? acc + 1 : acc),
        0,
      ),
    [allTeams, signedTeamIds],
  );

  const ratio = allTeams.length === 0 ? 0 : signedCount / allTeams.length;
  const color = progressColor(ratio);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Таблички</h1>
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${ratio * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className={styles.counter} style={{ color }}>
            {signedCount} / {allTeams.length}
          </span>
        </div>
      </div>

      {query && (
        <div className={styles.searchHint}>
          <span className={styles.searchLabel}><Search /></span>
          <span className={styles.searchQuery}>{query}</span>
          <span className={styles.searchMeta}>
            (Esc — сбросить, Backspace — стереть)
          </span>
        </div>
      )}

      {flashChar && (
        <div key={flashKey} className={styles.flashOverlay}>
          {flashChar}
        </div>
      )}

      <div className={styles.grid}>
        {teams.map((team) => {
          const id = team.id ?? "";
          const checked = id ? signedTeamIds.has(id) : false;

          return (
            <label
              key={team.name}
              className={`${styles.row} ${checked ? styles.rowChecked : ""}`}
            >
              <Checkbox
                className={styles.checkbox}
                checked={checked}
                disabled={!id}
                onCheckedChange={(value) =>
                  handleToggle({ id, name: team.name }, value === true)
                }
              />
              <span className={styles.teamName}>
                <HighlightText text={team.name} query={query} />
              </span>
            </label>
          );
        })}
      </div>

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Снять отметку?</AlertDialogTitle>
            <AlertDialogDescription>
              Команда «{pendingRemoval?.name}» снова окажется без таблички.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoval}>
              Снять
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
