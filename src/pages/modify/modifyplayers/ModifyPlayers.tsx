import { Card, CardContent } from "@/shared/ui";
import { Button } from "@/shared/ui";
import { Input } from "@/shared/ui";
import { Label } from "@/shared/ui";
import { AlertCircle, XCircle, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/shared/ui";
import { Switch } from "@/shared/ui";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui";
import { useTeamStore, useTeamsByName } from "@/entities/team/model/team.store";
import { useChangesStore } from "@/entities/change/model/change.store";
import type { StructureStoredChange } from "@/entities/change/types";
import SelectGameSeason from "@widgets/select-game/SelectGameSeason";

import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import {Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/Command";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { adminkaApi } from "@/shared/api/adminkaApi";
import {
  getAddPlayerStatusMessage,
  getRemovePlayerStatusMessage,
  getApiErrorDetails,
} from "@/shared/api/statusMessages";
import styles from "./ModifyPlayers.module.css";
import Combobox from "react-widgets/Combobox";

/** Бэкенд отдаёт status, OpenAPI/типы — player_status. Читаем оба. */
function getPlayerStatus(p: { status?: string; player_status?: string } | undefined): string | undefined {
  return p ? (p as { status?: string }).status ?? p.player_status : undefined;
}

function logSubmitError(context: string, error: unknown): void {
  console.error(`[ModifyPlayers] ${context}:`, error);
  if (error instanceof Error) {
    console.error(`[ModifyPlayers] ${context} message:`, error.message);
    if (error.stack) console.error(`[ModifyPlayers] ${context} stack:`, error.stack);
  }
  if (error && typeof error === "object" && "data" in error) {
    console.error(`[ModifyPlayers] ${context} response data:`, (error as { data: unknown }).data);
  }
  if (error && typeof error === "object" && "status" in error) {
    console.error(
      `[ModifyPlayers] ${context} HTTP status:`,
      (error as { status: number }).status,
    );
  }
}
import { NumberInputWithControls } from "./NumericInput";
import { generateSearchVariants } from "@features/searchUtils";
import { useMemo } from "react";

type Action = "add" | "replace" | "delete";

import {
  type Player,
  type ReplacePlayer,
} from "@/types/api";

interface ChangeBlock {
  id: string;
  teamName: string;
  action: Action;
  playerName: string;
  playerNameToRemove?: string;
  orderPass?: boolean;
  status?: "pending" | "success" | "error";
  errorMessage?: string;
  isSubmitting?: boolean;
  storedChangeId?: string;
}
const defaultChangeBlock = (id: string): ChangeBlock => ({
  id,
  teamName: "",
  action: "add",
  playerName: "",
  orderPass: false,
  status: "pending",
  isSubmitting: false,
});

interface ModifyPlayersProps {
  onFormChange?: (hasChanges: boolean) => void;
}

export default function ModifyPlayers({ onFormChange }: ModifyPlayersProps) {
  const [numberOfChanges, setNumberOfChanges] = useState(0);
  const [changeBlocks, setChangeBlocks] = useState<ChangeBlock[]>([]);

  const teamsMap = useTeamStore((state) => state.teams);
  const teamsByName = useTeamsByName();
  const status = useTeamStore((state) => state.status);
  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);

  const [season, setSeason] = useState<number>(0);
  const [gameNumber, setGameNumber] = useState<number>(0);

  // Берём из стора сам Map, без лишних обёрток, чтобы избежать
  // предупреждения React про getSnapshot и лишние перерендеры.
  const changesMap = useChangesStore((state) => state.changes);

  const teams = Array.from(teamsMap.values()).map((team) => ({
    value: team.name,
    label: team.name,
  }));

  useEffect(() => {
    if (season === 0 && storeSeason != 0) {
      setSeason(storeSeason);
    }
  }, [storeSeason]);

  useEffect(() => {
    if (gameNumber === 0 && storeGameNumber != 0) {
      setGameNumber(storeGameNumber);
    }
  }, [storeGameNumber]);

  const prevHasChangesRef = useRef<boolean>(false);

  const generateId = () =>
    `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const isLoadingTeams = status === "idle" || status === "connecting";



  const syncBlockToStore = (block: ChangeBlock) => {
    if (!season || !gameNumber || !block.teamName) return;

    const isEmpty =
      !block.playerName.trim() &&
      !(block.playerNameToRemove && block.playerNameToRemove.trim());

    const baseId = block.storedChangeId ?? block.id;
    const existing = changesMap.get(baseId) as
      | StructureStoredChange
      | undefined;

    if (isEmpty) {
      if (existing) {
        useChangesStore.getState().removeChange(baseId);
      }
      return;
    }

    let type: "add" | "remove" | "replace";
    let add_player: Player | undefined;
    let remove_player: Player | undefined;
    let replace_player: ReplacePlayer | undefined;

    switch (block.action) {
      case "add":
        type = "add";
        add_player = {
          name: block.playerName,
          is_pass_needed: !!block.orderPass,
        };
        break;
      case "delete":
        type = "remove";
        remove_player = {
          name: block.playerName,
          is_pass_needed: false,
        };
        break;
      case "replace":
        type = "replace";
        replace_player = {
          old_player: block.playerNameToRemove ?? "",
          new_player: {
            name: block.playerName,
            is_pass_needed: !!block.orderPass,
          },
        };
        break;
    }

    const stored: StructureStoredChange = {
      id: baseId,
      kind: "structure",
      source: existing?.source ?? "manual",
      season,
      gameNumber,
      createdAt: existing?.createdAt ?? Date.now(),
      unresolvedId: existing?.unresolvedId,
      teamName: block.teamName,
      details: {
        change_id: baseId,
        type,
        team_name: block.teamName,
        add_player,
        remove_player,
        replace_player,
      },
    };

    useChangesStore.getState().upsertChange(stored);
  };

  useEffect(() => {
    const hasChanges =
      numberOfChanges > 0 ||
      changeBlocks.some(
        (block) =>
          block.teamName !== "" ||
          block.playerName !== "" ||
          (block.playerNameToRemove !== undefined &&
            block.playerNameToRemove !== ""),
      );

    if (hasChanges !== prevHasChangesRef.current) {
      prevHasChangesRef.current = hasChanges;
      if (onFormChange) {
        onFormChange(hasChanges);
      }
    }
  }, [numberOfChanges, changeBlocks, onFormChange]);

  useEffect(() => {
    return () => {
      prevHasChangesRef.current = false;
    };
  }, []);

  // Подтягиваем все сохранённые structure-изменения из стора для выбранной игры
  // (в т.ч. из таблички Resolve) — пользователь видит все изменения по всем командам.
  useEffect(() => {
    if (!season || !gameNumber) {
      setChangeBlocks([defaultChangeBlock(generateId())]);
      setNumberOfChanges(1);
      return;
    }

    const storedStructureChanges = Array.from(changesMap.values()).filter(
      (change): change is StructureStoredChange =>
        change.kind === "structure" &&
        change.season === season &&
        change.gameNumber === gameNumber,
    );

    if (storedStructureChanges.length > 0) {
      const mappedBlocks = storedStructureChanges.map<ChangeBlock>((ch) => {
        const { details } = ch;

        let action: Action = "add";
        let playerName = "";
        let playerNameToRemove: string | undefined;
        let orderPass = false;

        if (details.type === "add" && details.add_player) {
          action = "add";
          playerName = details.add_player.name;
          orderPass = !!details.add_player.is_pass_needed;
        } else if (details.type === "remove" && details.remove_player) {
          action = "delete";
          playerName = details.remove_player.name;
        } else if (details.type === "replace" && details.replace_player) {
          action = "replace";
          playerNameToRemove = details.replace_player.old_player;
          playerName = details.replace_player.new_player.name;
          orderPass = !!details.replace_player.new_player.is_pass_needed;
        }

        return {
          id: ch.id,
          teamName: ch.teamName,
          storedChangeId: ch.source === "unresolved" ? ch.id : undefined,
          action,
          playerName,
          playerNameToRemove,
          orderPass,
          status: "pending",
          isSubmitting: false,
        };
      });

      setChangeBlocks(mappedBlocks);
      setNumberOfChanges(mappedBlocks.length);
    } else {
      setChangeBlocks([defaultChangeBlock(generateId())]);
      setNumberOfChanges(1);
    }
  }, [season, gameNumber, changesMap]);

  const handleNumberOfChangesChange = (count: number) => {
    const next = Math.max(0, count);
    setNumberOfChanges(next);

    if (next < changeBlocks.length) {
      changeBlocks.slice(next).forEach((block) => {
        useChangesStore.getState().removeChange(block.storedChangeId ?? block.id);
      });
      setChangeBlocks(changeBlocks.slice(0, next));
      return;
    }

    if (next > changeBlocks.length) {
      const added = [...changeBlocks];
      for (let i = changeBlocks.length; i < next; i++) {
        added.push(defaultChangeBlock(generateId()));
      }
      setChangeBlocks(added);
    }
  };

  const handleActionChange = (index: number, action: Action) => {
    setChangeBlocks((prev) => {
      const newBlocks = [...prev];
      const updated: ChangeBlock = {
        ...newBlocks[index],
        action,
        status: "pending",
        errorMessage: undefined,
      };
      if (action === "add" || action === "delete") {
        updated.playerNameToRemove = undefined;
      } else if (action === "replace") {
        updated.playerNameToRemove = updated.playerNameToRemove || "";
      }
      newBlocks[index] = updated;

      syncBlockToStore(updated);
      return newBlocks;
    });
  };

  // const handlePlayerNameKeyDown = (
  //   e: React.KeyboardEvent<HTMLInputElement>,
  // ) => {
  //   if (e.key === " ") {
	// 		e.preventDefault();
  //     e.stopPropagation();
  //   }
  // };

  const handlePlayerNameChange = (index: number, value: string) => {
    setChangeBlocks((prev) => {
      const newBlocks = [...prev];
      const updated: ChangeBlock = {
        ...newBlocks[index],
        playerName: value,
        status: "pending",
        errorMessage: undefined,
      };
      newBlocks[index] = updated;
      syncBlockToStore(updated);
      return newBlocks;
    });
  };

  const handlePlayerNameToRemoveChange = (index: number, value: string) => {
    setChangeBlocks((prev) => {
      const newBlocks = [...prev];
      const updated: ChangeBlock = {
        ...newBlocks[index],
        playerNameToRemove: value,
        status: "pending",
        errorMessage: undefined,
      };
      newBlocks[index] = updated;
      syncBlockToStore(updated);
      return newBlocks;
    });
  };

  const handleOrderPassChange = (index: number, checked: boolean) => {
    setChangeBlocks((prev) => {
      const newBlocks = [...prev];
      const updated: ChangeBlock = {
        ...newBlocks[index],
        orderPass: checked,
        status: "pending",
        errorMessage: undefined,
      };
      newBlocks[index] = updated;
      syncBlockToStore(updated);
      return newBlocks;
    });
  };

  const handleTeamChange = (index: number, teamName: string) => {
    setChangeBlocks((prev) => {
      const newBlocks = [...prev];
      const updated: ChangeBlock = {
        ...newBlocks[index],
        teamName,
        status: "pending",
        errorMessage: undefined,
      };
      newBlocks[index] = updated;
      syncBlockToStore(updated);
      return newBlocks;
    });
  };

  const handleRemoveBlock = (index: number) => {
    setChangeBlocks((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];

      if (removed) {
        const id = removed.storedChangeId ?? removed.id;
        useChangesStore.getState().removeChange(id);
      }

      setNumberOfChanges(next.length);
      return next;
    });
  };

  const teamIdByName = (teamName: string) => teamsByName.get(teamName)?.id;

  const submitSingleChange = async (index: number) => {
    const block = changeBlocks[index];

    if (!block.teamName) {
      toast.error("Выберите команду в изменении");
      return;
    }

    const teamId = teamIdByName(block.teamName);
    if (!teamId) {
      toast.error(`Команда "${block.teamName}" не найдена`);
      return;
    }

    if (block.action === "add" || block.action === "delete") {
      if (!block.playerName.trim()) {
        toast.error(`Заполните имя для изменения ${index + 1}`);
        return;
      }
    } else if (block.action === "replace") {
      if (!block.playerName.trim() || !block.playerNameToRemove?.trim()) {
        toast.error(`Заполните оба поля для замены ${index + 1}`);
        return;
      }
    }

    let unresolvedIdToMark: string | null = null;
    if (block.storedChangeId) {
      const stored = useChangesStore
        .getState()
        .changes.get(block.storedChangeId) as StructureStoredChange | undefined;
      if (stored?.unresolvedId) {
        unresolvedIdToMark = stored.unresolvedId;
      }
    }

    setChangeBlocks((prev) => {
      const newBlocks = [...prev];
      newBlocks[index] = {
        ...newBlocks[index],
        isSubmitting: true,
        errorMessage: undefined,
      };
      return newBlocks;
    });

    try {
      if (block.action === "add") {
        const addResp = await adminkaApi.addPlayers({
          season,
          game_number: gameNumber,
          players: [
            {
              team_id: teamId,
              name: block.playerName.trim(),
              is_pass_needed: !!block.orderPass,
            },
          ],
        });
        const playerStatus = getPlayerStatus(addResp.players?.[0]);
        const isAddSuccess =
          playerStatus === "added" ||
          playerStatus === "already_exists" ||
          playerStatus === "do_not_need_pass";
        if (!isAddSuccess) {
          console.error("[ModifyPlayers] addPlayers response:", addResp);
          console.error("[ModifyPlayers] addPlayers status:", playerStatus, "full player:", addResp.players?.[0]);
          const msg = getAddPlayerStatusMessage(playerStatus ?? "unknown");
          throw new Error(playerStatus ? `${msg} (status: ${playerStatus})` : msg);
        }
        if (playerStatus === "already_exists") {
          toast.success(`Изменение ${index + 1}: игрок уже в команде`);
        } else if (playerStatus === "do_not_need_pass") {
          toast.success(`Изменение ${index + 1} сохранено (пропуск не требуется)`);
        } else {
          toast.success(`Изменение ${index + 1} сохранено`);
        }
      } else if (block.action === "delete") {
        const removeResp = await adminkaApi.removePlayers({
          season,
          game_number: gameNumber,
          players: [{ team_id: teamId, name: block.playerName.trim() }],
        });
        const playerStatus = getPlayerStatus(removeResp.players?.[0]);
        const isRemoveSuccess = playerStatus === "removed";
        if (!isRemoveSuccess) {
          console.error("[ModifyPlayers] removePlayers response:", removeResp);
          console.error("[ModifyPlayers] removePlayers status:", playerStatus, "full player:", removeResp.players?.[0]);
          const msg = getRemovePlayerStatusMessage(playerStatus ?? "unknown");
          throw new Error(playerStatus ? `${msg} (status: ${playerStatus})` : msg);
        }
        toast.success(`Изменение ${index + 1} сохранено`);
      } else {
        // replace: сначала добавляем нового игрока, затем удаляем старого
        const newPlayerName = block.playerName.trim();
        const oldPlayerName = (block.playerNameToRemove ?? "").trim();

        const addResp = await adminkaApi.addPlayers({
          season,
          game_number: gameNumber,
          players: [
            {
              team_id: teamId,
              name: newPlayerName,
              is_pass_needed: !!block.orderPass,
            },
          ],
        });

        const addStatus = getPlayerStatus(addResp.players?.[0]);
        const addOk =
          addStatus === "added" ||
          addStatus === "already_exists" ||
          addStatus === "do_not_need_pass";
        if (!addOk) {
          console.error("[ModifyPlayers] addPlayers (replace) response:", addResp);
          const msg = getAddPlayerStatusMessage(addStatus ?? "unknown");
          throw new Error(
            addStatus ? `${msg} (status: ${addStatus})` : msg,
          );
        }

        const removeResp = await adminkaApi.removePlayers({
          season,
          game_number: gameNumber,
          players: [
            {
              team_id: teamId,
              name: oldPlayerName,
            },
          ],
        });

        const removeStatus = getPlayerStatus(removeResp.players?.[0]);
        const removeOk = removeStatus === "removed";
        if (!removeOk) {
          console.error("[ModifyPlayers] removePlayers (replace) response:", removeResp);
          const msg = getRemovePlayerStatusMessage(removeStatus ?? "unknown");
          throw new Error(
            removeStatus ? `${msg} (status: ${removeStatus})` : msg,
          );
        }

        toast.success(`Изменение ${index + 1} сохранено`);
      }

      setChangeBlocks((prev) => {
        const newBlocks = [...prev];
        const b = newBlocks[index];

        newBlocks[index] = {
          ...b,
          status: "success",
          isSubmitting: false,
        };

        if (b.storedChangeId) {
          useChangesStore.getState().removeChange(b.storedChangeId);
          newBlocks[index].storedChangeId = undefined;
        }
        return newBlocks;
      });

      if (unresolvedIdToMark) {
        try {
          await adminkaApi.markResolved({ change_id: unresolvedIdToMark });
        } catch (e) {

          console.error(
            `Не удалось пометить изменение ${unresolvedIdToMark} как разрешённое`,
            e,
          );
        }
      }
    } catch (error: unknown) {
      logSubmitError(`Ошибка при отправке изменения ${index + 1}`, error);

      const errorMessage = getApiErrorDetails(error);

      setChangeBlocks((prev) => {
        const newBlocks = [...prev];
        newBlocks[index] = {
          ...newBlocks[index],
          status: "error",
          errorMessage,
          isSubmitting: false,
        };
        return newBlocks;
      });

      toast.error(`Ошибка в изменении ${index + 1}: ${errorMessage}`);
    }
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();

    const validChanges = changeBlocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => {
        if (!block.teamName) return false;
        if (block.action === "add" || block.action === "delete") {
          return block.playerName.trim() !== "";
        }
        if (block.action === "replace") {
          return (
            block.playerName.trim() !== "" &&
            block.playerNameToRemove?.trim() !== ""
          );
        }
        return false;
      })
      .filter(({ block }) => block.status !== "success");

    if (validChanges.length === 0) {
      toast.error("Нет заполненных изменений для отправки или выберите команду в каждом.");
      return;
    }

    const unknownTeam = validChanges.find(({ block }) => !teamIdByName(block.teamName));
    if (unknownTeam) {
      toast.error(`Команда "${unknownTeam.block.teamName}" не найдена — выберите её из списка`);
      return;
    }

    setChangeBlocks((prev) => {
      const newBlocks = [...prev];
      validChanges.forEach(({ index }) => {
        newBlocks[index] = {
          ...newBlocks[index],
          isSubmitting: true,
          errorMessage: undefined,
        };
      });
      return newBlocks;
    });

    const unresolvedIdsToMark = new Set<string>();
    let successCount = 0;
    let errorCount = 0;

    try {
      const addItems = validChanges.filter(({ block }) => block.action === "add");
      const removeItems = validChanges.filter(({ block }) => block.action === "delete");
      const replaceItems = validChanges.filter(({ block }) => block.action === "replace");

      const addResults = new Map<number, { status: string }>();
      if (addItems.length > 0) {
        const addResp = await adminkaApi.addPlayers({
          season,
          game_number: gameNumber,
          players: addItems.map(({ block }) => ({
            team_id: teamIdByName(block.teamName) ?? "",
            name: block.playerName.trim(),
            is_pass_needed: !!block.orderPass,
          })),
        });
        addItems.forEach(({ block, index }, i) => {
          const st = getPlayerStatus(addResp.players?.[i]) ?? "unknown";
          addResults.set(index, { status: st });
          const isOk =
            st === "added" || st === "already_exists" || st === "do_not_need_pass";
          if (isOk) {
            successCount += 1;
            if (block.storedChangeId) {
              const stored = useChangesStore.getState().changes.get(block.storedChangeId) as StructureStoredChange | undefined;
              if (stored?.unresolvedId) unresolvedIdsToMark.add(stored.unresolvedId);
              useChangesStore.getState().removeChange(block.storedChangeId);
            }
          } else {
            errorCount += 1;
          }
        });
      }

      const removeResults = new Map<number, { status: string }>();
      if (removeItems.length > 0) {
        const removeResp = await adminkaApi.removePlayers({
          season,
          game_number: gameNumber,
          players: removeItems.map(({ block }) => ({
            team_id: teamIdByName(block.teamName) ?? "",
            name: block.playerName.trim(),
          })),
        });
        removeItems.forEach(({ block, index }, i) => {
          const st = getPlayerStatus(removeResp.players?.[i]) ?? "unknown";
          removeResults.set(index, { status: st });
          const isOk = st === "removed";
          if (isOk) {
            successCount += 1;
            if (block.storedChangeId) {
              const stored = useChangesStore.getState().changes.get(block.storedChangeId) as StructureStoredChange | undefined;
              if (stored?.unresolvedId) unresolvedIdsToMark.add(stored.unresolvedId);
              useChangesStore.getState().removeChange(block.storedChangeId);
            }
          } else {
            errorCount += 1;
          }
        });
      }

      const replaceStatusMap = new Map<
        string,
        { addStatus: string; removeStatus: string }
      >();
      if (replaceItems.length > 0) {
        // обрабатываем replace как addPlayers + removePlayers
        for (const { block } of replaceItems) {
          const newPlayerName = block.playerName.trim();
          const oldPlayerName = (block.playerNameToRemove ?? "").trim();
          const blockTeamId = teamIdByName(block.teamName) ?? "";

          const addResp = await adminkaApi.addPlayers({
            season,
            game_number: gameNumber,
            players: [
              {
                team_id: blockTeamId,
                name: newPlayerName,
                is_pass_needed: !!block.orderPass,
              },
            ],
          });
          const addStatus = getPlayerStatus(addResp.players?.[0]) ?? "unknown";

          const removeResp = await adminkaApi.removePlayers({
            season,
            game_number: gameNumber,
            players: [
              {
                team_id: blockTeamId,
                name: oldPlayerName,
              },
            ],
          });
          const removeStatus =
            getPlayerStatus(removeResp.players?.[0]) ?? "unknown";

          replaceStatusMap.set(block.id, {
            addStatus,
            removeStatus,
          });

          const addOk =
            addStatus === "added" ||
            addStatus === "already_exists" ||
            addStatus === "do_not_need_pass";
          const removeOk = removeStatus === "removed";

          if (addOk && removeOk) {
            successCount += 1;
            if (block.storedChangeId) {
              const stored =
                useChangesStore.getState().changes.get(
                  block.storedChangeId,
                ) as StructureStoredChange | undefined;
              if (stored?.unresolvedId)
                unresolvedIdsToMark.add(stored.unresolvedId);
              useChangesStore.getState().removeChange(block.storedChangeId);
            }
          } else {
            errorCount += 1;
          }
        }
      }

      setChangeBlocks((prev) => {
        const newBlocks = [...prev];
        validChanges.forEach(({ block, index }) => {
          let status: "success" | "error" = "success";
          let errorMessage: string | undefined;
          let clearStoredId = false;
          if (block.action === "add") {
            const r = addResults.get(index);
            const isOk =
              r &&
              (r.status === "added" ||
                r.status === "already_exists" ||
                r.status === "do_not_need_pass");
            if (isOk) clearStoredId = true;
            else if (r) {
              status = "error";
              errorMessage = getAddPlayerStatusMessage(r.status);
            }
          } else if (block.action === "delete") {
            const r = removeResults.get(index);
            const isOk = r && r.status === "removed";
            if (isOk) clearStoredId = true;
            else if (r) {
              status = "error";
              errorMessage = getRemovePlayerStatusMessage(r.status);
            }
          } else {
            const r = replaceStatusMap.get(block.id);
            if (r && r.addStatus && r.removeStatus) {
              const addOk =
                r.addStatus === "added" ||
                r.addStatus === "already_exists" ||
                r.addStatus === "do_not_need_pass";
              const removeOk = r.removeStatus === "removed";
              if (addOk && removeOk) {
                clearStoredId = true;
              } else {
                status = "error";
                const addMsg = getAddPlayerStatusMessage(r.addStatus);
                const removeMsg =
                  r.removeStatus === "unknown"
                    ? ""
                    : getRemovePlayerStatusMessage(r.removeStatus);
                errorMessage = [addMsg, removeMsg]
                  .filter(Boolean)
                  .join(". ");
              }
            }
          }
          newBlocks[index] = {
            ...newBlocks[index],
            status,
            errorMessage,
            isSubmitting: false,
            ...(clearStoredId && block.storedChangeId ? { storedChangeId: undefined } : {}),
          };
        });
        return newBlocks;
      });

      if (unresolvedIdsToMark.size > 0) {
        try {
          await Promise.all(
            Array.from(unresolvedIdsToMark).map((id) =>
              adminkaApi.markResolved({ change_id: id }),
            ),
          );
        } catch (e) {
          console.error("Не удалось пометить некоторые изменения как разрешённые", e);
        }
      }

      if (errorCount === 0) {
        toast.success(`Все ${successCount} изменений успешно отправлены!`);
      } else {
        toast.error(`Отправлено: ${successCount} успешно, ${errorCount} с ошибкой`, { duration: 5000 });
      }
    } catch (error: unknown) {
      logSubmitError("Ошибка при отправке всех изменений", error);

      const errorMessage = getApiErrorDetails(error);

      setChangeBlocks((prev) => {
        const newBlocks = [...prev];
        validChanges.forEach(({ index }) => {
          newBlocks[index] = {
            ...newBlocks[index],
            status: "error",
            errorMessage,
            isSubmitting: false,
          };
        });
        return newBlocks;
      });

      toast.error(`Ошибка при отправке: ${errorMessage}`);
    }
  };

  const allChangesSuccessful =
    changeBlocks.length > 0 &&
    changeBlocks.every((block) => {
      const isValidBlock =
        (block.action === "add" && block.playerName.trim()) ||
        (block.action === "delete" && block.playerName.trim()) ||
        (block.action === "replace" &&
          block.playerName.trim() &&
          block.playerNameToRemove?.trim());

      if (!isValidBlock) {
        return true;
      }

      return block.status === "success";
    });

  const errorCount = changeBlocks.filter((block) => {
    const isValidBlock =
      (block.action === "add" && block.playerName.trim()) ||
      (block.action === "delete" && block.playerName.trim()) ||
      (block.action === "replace" &&
        block.playerName.trim() &&
        block.playerNameToRemove?.trim());

    return isValidBlock && block.status === "error";
  }).length;

  const pendingCount = changeBlocks.filter((block) => {
    const isValidBlock =
      (block.action === "add" && block.playerName.trim()) ||
      (block.action === "delete" && block.playerName.trim()) ||
      (block.action === "replace" &&
        block.playerName.trim() &&
        block.playerNameToRemove?.trim());

    return isValidBlock && block.status === "pending" && !block.isSubmitting;
  }).length;

  const totalValidChanges = changeBlocks.filter((block) => {
    return (
      (block.action === "add" && block.playerName.trim()) ||
      (block.action === "delete" && block.playerName.trim()) ||
      (block.action === "replace" &&
        block.playerName.trim() &&
        block.playerNameToRemove?.trim())
    );
  }).length;

  return (
    <Card className={styles.wrapperCard}>
      <CardContent>
        <form onSubmit={handleSubmitAll} className={styles.form}>
          <div className={styles.meta}>
            <SelectGameSeason
              onSeasonChange={setSeason}
              onGameNumberChange={setGameNumber}
              initialSeason={storeSeason}
              initialGameNumber={storeGameNumber}
            />
          </div>
          {/* <div className={styles.field}>
            <h4 className={styles.cntHeader}>Количество изменений</h4>
            <NumberInputWithControls
              value={numberOfChanges}
              onChange={setNumberOfChanges}
              min={0}
              max={20}
            />
          </div> */}

          <div className={styles.changeBlocks}>
            {changeBlocks.map((block, index) => {
              const blockClasses = cn(styles.changeBlock, {
                [styles.successBlock]: block.status === "success",
                [styles.errorBlock]: block.status === "error",
                [styles.pendingBlock]: block.status === "pending",
              });

              return (
                <div key={block.id} className={blockClasses}>
                  <div className={styles.blockHeader}>
                    <div className={styles.blockTitle}>
                      <Label>Изменение {index + 1}</Label>
                      {block.storedChangeId && (
                        <span className={styles.fromStoreBadge}>
                          Изменение из таблички
                        </span>
                      )}
                      {changeBlocks.length > 0 && (
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => handleRemoveBlock(index)}
                          aria-label="Удалить изменение"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>


                    <div className={styles.field}>
                      <Label className={styles.cntHeader}>Команда</Label>
                      {isLoadingTeams ? (
                        <div className={styles.loadingCombobox}>
                          <div className={styles.spinner}></div>
                          <span>Загрузка...</span>
                        </div>
                      ) : (
                        <TeamCombobox
                          teams={teams}
                          value={block.teamName}
                          onChange={(value) => handleTeamChange(index, value)}
                        />
                      )}
                    </div>

                    <RadioGroup
                      value={block.action}
                      onValueChange={(value) =>
                        handleActionChange(index, value as Action)
                      }
                      className={styles.radioGroup}
                    >
                      <div className={styles.radioOption}>
                        <RadioGroupItem value="add" id={`add-${index}`} />
                        <Label htmlFor={`add-${index}`}>Добавить игрока</Label>
                      </div>
                      <div className={styles.radioOption}>
                        <RadioGroupItem
                          value="replace"
                          id={`replace-${index}`}
                        />
                        <Label htmlFor={`replace-${index}`}>
                          Заменить игрока
                        </Label>
                      </div>
                      <div className={styles.radioOption}>
                        <RadioGroupItem value="delete" id={`delete-${index}`} />
                        <Label htmlFor={`delete-${index}`}>
                          Удалить игрока
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {block.action === "add" && (
                    <div className={styles.actionFields}>
                      <div className={styles.field}>
                        <Label htmlFor={`playerName-${index}`}>
                          Фамилия и имя
                        </Label>
                        <div className={styles.inputWrapper}>
                          <Input
                            id={`playerName-${index}`}
														type="text"
                            value={block.playerName}
                            onChange={(e) =>
                              handlePlayerNameChange(index, e.target.value)
                            }
                            // onKeyDown={handlePlayerNameKeyDown}
                            placeholder="Введите имя"
                            className={styles.input}
                          />
                          <div className={styles.switchWrapper}>
                            <Label>Заказать пропуск</Label>
                            <Switch
                              checked={block.orderPass}
                              onCheckedChange={(checked) =>
                                handleOrderPassChange(index, checked)
                              }
                            />
                          </div>
                        </div>
                        <div className={styles.note}>
                          Фамилия и имя, разделитель "пробел"
                        </div>
                      </div>
                    </div>
                  )}

                  {block.action === "replace" && (
                    <div className={styles.actionFields}>
                      <div className={styles.field}>
                        <Label htmlFor={`playerNameToRemove-${index}`}>
                          Кого убрать?
                        </Label>
                        <PlayerDropdown
                          id={`playerNameToRemove-${index}`}
                          teamName={block.teamName}
                          value={block.playerNameToRemove || ""}
                          placeholder="Выберите пропуск"
                          onChange={(value) =>
                            handlePlayerNameToRemoveChange(index, value)
                          }
                        />
                        <Label
                          className={styles.replaceSecondInput}
                          htmlFor={`playerName-${index}`}
                        >
                          Кого добавить?
                        </Label>
                        <div className={styles.inputWrapper}>
                          <Input
                            id={`playerName-${index}`}
                            value={block.playerName}
                            onChange={(e) =>
                              handlePlayerNameChange(index, e.target.value)
                            }
                            // onKeyDown={handlePlayerNameKeyDown}
                            placeholder="Введите имя"
                            className={styles.input}
                          />
                          <div className={styles.switchWrapper}>
                            <Label>Заказать пропуск</Label>
                            <Switch
                              checked={block.orderPass}
                              onCheckedChange={(checked) =>
                                handleOrderPassChange(index, checked)
                              }
                            />
                          </div>
                        </div>
                        <div className={styles.note}>
                          Фамилия и имя, разделитель "пробел"
                        </div>
                      </div>
                    </div>
                  )}

                  {block.action === "delete" && (
                    <div className={styles.actionFields}>
                      <div className={cn(styles.field, styles.warningField)}>
                        <div className={styles.warningWrapper}>
                          <Label htmlFor={`playerName-${index}`}>
                            Фамилия и имя
                          </Label>
                          <PlayerDropdown
                            id={`playerName-${index}`}
                            teamName={block.teamName}
                            value={block.playerName}
                            placeholder="Выберите пропуск"
                            onChange={(value) =>
                              handlePlayerNameChange(index, value)
                            }
                          />
                          <div className={styles.note}>
                            Одно имя, разделитель "пробел"
                          </div>
                        </div>
                        <Alert variant="destructive" className={styles.warning}>
                          <AlertCircle color="red" />
                          <AlertTitle>Внимание!</AlertTitle>
                          <AlertDescription>
                            Это действие необратимо
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                  )}

                  {block.status === "error" && block.errorMessage && (
                    <div className={styles.errorMessage}>
                      <XCircle size={16} />
                      <span>{block.errorMessage}</span>
                    </div>
                  )}

                  {((block.action === "add" && block.playerName.trim()) ||
                    (block.action === "delete" && block.playerName.trim()) ||
                    (block.action === "replace" &&
                      block.playerName &&
                      block.playerNameToRemove)) && (
                    <div className={styles.singleSubmit}>
                      <Button
                        type="button"
                        size="sm"
                        // variant={
                        //   block.status === "success" ? "outline" : "default"
                        // }
												variant="outline"
                        disabled={
                          block.isSubmitting || block.status === "success"
                        }
                        onClick={() => submitSingleChange(index)}
                      >
                        {block.isSubmitting
                          ? "Отправка..."
                          : block.status === "success"
                            ? "Отправлено"
                            : `Отправить изменение`}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.controls}>
            <div className={styles.field}>
              <h4 className={styles.cntHeader}>Количество изменений</h4>
              <NumberInputWithControls
                value={numberOfChanges}
                onChange={handleNumberOfChangesChange}
                min={0}
                max={20}
              />
            </div>
            {numberOfChanges !== 0 ? (
              <>
                <Button
                  type="submit"
                  className={styles.submit}
                  disabled={totalValidChanges === 0 || pendingCount === 0}
                  variant={
                    allChangesSuccessful && totalValidChanges > 0
                      ? "outline"
                      : "default"
                  }
                >
                  {totalValidChanges === 0
                    ? "Нет заполненных"
                    : pendingCount === 0
                      ? errorCount > 0
                        ? "Есть ошибки"
                        : "Все изменения отправлены"
                      : `Отправить все (${pendingCount})`}
                </Button>
              </>
            ) : (
              <Button
                disabled
                type="submit"
                variant="ghost"
                className={styles.submit}
              >
                Сохранить изменения
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface TeamComboboxProps {
  teams: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

function TeamCombobox({ teams, value, onChange }: TeamComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredTeams = useMemo(() => {
    if (!searchValue.trim()) return teams;

    const searchVariants = generateSearchVariants(searchValue);

    return teams.filter((team) =>
      searchVariants.some(
        (variant) =>
          team.value.toLowerCase().includes(variant) ||
          team.label.toLowerCase().includes(variant),
      ),
    );
  }, [searchValue, teams]);

  const handleInputChange = (input: string) => {
    setSearchValue(input);
  };

  const handleSelect = (teamValue: string) => {
    onChange(teamValue === value ? "" : teamValue);
    setOpen(false);
    setSearchValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={styles.comboboxTrigger}
        >
          {value
            ? teams.find((team) => team.value === value)?.label
            : "Выберите команду..."}
          <ChevronsUpDown className={styles.chevronIcon} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={styles.comboboxContent} align="start">
        <Command>
          <CommandInput
            placeholder="Поиск команды..."
            value={searchValue}
            onValueChange={handleInputChange}
            className={styles.commandInput}
          />
          <CommandList className={styles.commandList}>
            <CommandEmpty>Команда не найдена.</CommandEmpty>
            <CommandGroup>
              {filteredTeams.length > 0 ? (
                filteredTeams.map((team) => (
                  <CommandItem
                    key={team.value}
                    value={team.value}
                    onSelect={() => handleSelect(team.value)}
                    className={styles.commandItem}
                  >
                    {team.label}
                    <Check
                      className={styles.checkIcon}
                      style={{
                        opacity: value === team.value ? 1 : 0,
                      }}
                    />
                  </CommandItem>
                ))
              ) : (
                <CommandItem disabled>Нет результатов</CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface PlayerDropdownProps {
  id: string;
  teamName: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function PlayerDropdown({
  id,
  teamName,
  value,
  onChange,
  placeholder,
}: PlayerDropdownProps) {
  const teamsByName = useTeamsByName();

  const options = useMemo(() => {
    const team = teamsByName.get(teamName);
    return team?.passes ?? [];
  }, [teamsByName, teamName]);

  return (
    <div className={styles.playerDropdown}>
      <Combobox
        id={id}
        data={options}
        value={value}
        messages={{
          emptyList: "Нет доступных участников",
          emptyFilter: "Нет доступных участников",
        }}
        onChange={(nextValue) => {
          if (typeof nextValue === "string") {
            onChange(nextValue);
          } else if (nextValue == null) {
            onChange("");
          } else {
            onChange(String(nextValue));
          }
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
