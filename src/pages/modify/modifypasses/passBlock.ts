export interface PassBlock {
  id: string;
  playerName: string;
  team: string;
  mode: "add" | "remove";
  hasError?: boolean;
  errorMessage?: string;
  fromUnresolved?: boolean;
}

export function createEmptyPassBlock(
  id: string,
  mode: PassBlock["mode"] = "add",
): PassBlock {
  return {
    id,
    playerName: "",
    team: "",
    mode,
  };
}
