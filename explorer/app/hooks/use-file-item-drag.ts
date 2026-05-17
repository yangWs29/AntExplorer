"use client";

import React, { useCallback } from "react";

interface UseFileItemDragProps {
  draggingFiles: string[];
  onDragStart: (paths: string[]) => void;
}

export const useFileItemDrag = ({
  draggingFiles,
  onDragStart,
}: UseFileItemDragProps) => {
  const handleItemDragStart = useCallback(
    (e: React.DragEvent, path: string) => {
      onDragStart([path]);
      e.dataTransfer.setData(
        "application/x-explorer-paths",
        JSON.stringify([path]),
      );
      e.dataTransfer.effectAllowed = "move";
    },
    [onDragStart],
  );

  const isSelected = useCallback(
    (path: string) => draggingFiles.includes(path),
    [draggingFiles],
  );

  return { handleItemDragStart, isSelected };
};
