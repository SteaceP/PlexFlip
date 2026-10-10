import { create } from "zustand";

export interface ConfirmModalState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  setModal: ({
    title,
    message,
    onConfirm,
    onCancel,
  }: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => void;
}

export const useConfirmModal = create<ConfirmModalState>((set) => ({
  open: false,
  title: "",
  message: "",
  onConfirm: () => {},
  onCancel: () => {},
  setModal: ({
    title,
    message,
    onConfirm,
    onCancel,
  }: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    set({
      open: true,
      title,
      message,
      onConfirm,
      onCancel,
    }),
}));
