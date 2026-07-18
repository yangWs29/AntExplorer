"use client";

import { memo } from "react";
import { useModalStore } from "@/app/store/explorer-modal-store";
import DraggableModal from "./DraggableModal";

const ModalContainer = memo(() => {
  // 只订阅 modals 数组，避免不必要的重渲染
  const modals = useModalStore((state) => state.modals);

  if (modals.length === 0) return null;

  return (
    <>
      {modals.map((modal) => (
        <DraggableModal key={modal.id} modal={modal} />
      ))}
    </>
  );
});

export default ModalContainer;
