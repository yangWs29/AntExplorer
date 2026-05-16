"use client";

import { useModalStore } from "@/app/store/explorer-modal-store";
import DraggableModal from "./draggable-modal";

const ModalContainer = () => {
  const { modals } = useModalStore();

  if (modals.length === 0) return null;

  return (
    <>
      {modals.map((modal) => (
        <DraggableModal key={modal.id} modal={modal} />
      ))}
    </>
  );
};

export default ModalContainer;
