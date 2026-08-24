import { useCallback, useMemo } from "react";
import {
  useFinderStore,
  type FinderModalState,
  type FinderViewMode,
  type FileStats,
  type FileItem,
} from "@/app/store/finder-store";

export type { FinderModalState, FinderViewMode, FileStats, FileItem };

/**
 * 返回指定 modalId 的 finder 状态和绑定好 modalId 的 actions。
 * 所有 Finder 子组件统一使用此 hook 替代 useFinderStore()。
 */
export function useFinderScope(modalId: string) {
  const store = useFinderStore();
  const m = store.modals[modalId];

  // 如果该 modalId 尚未初始化，返回默认值（initModal 会很快补上）
  const state: FinderModalState = m ?? {
    currentPath: "/",
    history: ["/"],
    historyIndex: 0,
    fileList: [],
    loading: false,
    viewMode: "icon",
    selectedFiles: [],
    lastSelectedIndex: -1,
    clipboardFiles: [],
    clipboardMode: null,
    columnPaths: ["/"],
    columnSelections: {},
    detailFile: null,
    renamingFile: null,
  };

  const navigateTo = useCallback(
    (path: string, title?: string) => store.navigateTo(modalId, path, title),
    [modalId, store.navigateTo],
  );
  const goBack = useCallback(() => store.goBack(modalId), [modalId, store.goBack]);
  const goForward = useCallback(
    () => store.goForward(modalId),
    [modalId, store.goForward],
  );
  const canGoBack = useCallback(
    () => store.canGoBack(modalId),
    [modalId, store.canGoBack],
  );
  const canGoForward = useCallback(
    () => store.canGoForward(modalId),
    [modalId, store.canGoForward],
  );
  const goUp = useCallback(() => store.goUp(modalId), [modalId, store.goUp]);
  const setFileList = useCallback(
    (files: FileItem[]) => store.setFileList(modalId, files),
    [modalId, store.setFileList],
  );
  const setLoading = useCallback(
    (loading: boolean) => store.setLoading(modalId, loading),
    [modalId, store.setLoading],
  );
  const setViewMode = useCallback(
    (mode: FinderViewMode) => store.setViewMode(modalId, mode),
    [modalId, store.setViewMode],
  );
  const selectFile = useCallback(
    (path: string, index: number, multi?: boolean, range?: boolean) =>
      store.selectFile(modalId, path, index, multi, range),
    [modalId, store.selectFile],
  );
  const clearSelection = useCallback(
    () => store.clearSelection(modalId),
    [modalId, store.clearSelection],
  );
  const selectAll = useCallback(
    () => store.selectAll(modalId),
    [modalId, store.selectAll],
  );
  const copyFiles = useCallback(
    (paths: string[]) => store.copyFiles(modalId, paths),
    [modalId, store.copyFiles],
  );
  const cutFiles = useCallback(
    (paths: string[]) => store.cutFiles(modalId, paths),
    [modalId, store.cutFiles],
  );
  const clearClipboard = useCallback(
    () => store.clearClipboard(modalId),
    [modalId, store.clearClipboard],
  );
  const setColumnPath = useCallback(
    (level: number, path: string) => store.setColumnPath(modalId, level, path),
    [modalId, store.setColumnPath],
  );
  const setColumnSelection = useCallback(
    (level: number, path: string) => store.setColumnSelection(modalId, level, path),
    [modalId, store.setColumnSelection],
  );
  const resetColumnView = useCallback(
    () => store.resetColumnView(modalId),
    [modalId, store.resetColumnView],
  );
  const setDetailFile = useCallback(
    (file: FileStats | null) => store.setDetailFile(modalId, file),
    [modalId, store.setDetailFile],
  );
  const setRenamingFile = useCallback(
    (file: { path: string; name: string } | null) =>
      store.setRenamingFile(modalId, file),
    [modalId, store.setRenamingFile],
  );

  return useMemo(
    () => ({
      ...state,
      navigateTo,
      goBack,
      goForward,
      canGoBack,
      canGoForward,
      goUp,
      setFileList,
      setLoading,
      setViewMode,
      selectFile,
      clearSelection,
      selectAll,
      copyFiles,
      cutFiles,
      clearClipboard,
      setColumnPath,
      setColumnSelection,
      resetColumnView,
      setDetailFile,
      setRenamingFile,
    }),
    [
      state,
      navigateTo,
      goBack,
      goForward,
      canGoBack,
      canGoForward,
      goUp,
      setFileList,
      setLoading,
      setViewMode,
      selectFile,
      clearSelection,
      selectAll,
      copyFiles,
      cutFiles,
      clearClipboard,
      setColumnPath,
      setColumnSelection,
      resetColumnView,
      setDetailFile,
      setRenamingFile,
    ],
  );
}
