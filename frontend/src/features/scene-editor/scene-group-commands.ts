import type { SaraswatiCommand, SaraswatiScene } from "@/lib/saraswati";

export function buildGroupSelectionCommands(
  scene: SaraswatiScene,
  selectedIds: readonly string[],
  groupId: string,
): SaraswatiCommand[] {
  if (selectedIds.length < 2) return [];
  const nodes = selectedIds.map((id) => scene.nodes[id]).filter(Boolean);
  if (nodes.length !== selectedIds.length) return [];
  const parentId = nodes[0]?.parentId;
  if (!parentId || nodes.some((node) => node?.parentId !== parentId)) return [];
  return [
    {
      type: "GROUP_NODES",
      id: groupId,
      parentId,
      children: [...selectedIds],
    },
  ];
}
