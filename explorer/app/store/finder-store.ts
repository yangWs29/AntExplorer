import { create } from "zustand";
import { FileItem } from "./explorer-modal-store";

export type { FileItem } from "./explorer-modal-store";

export type FinderViewMode = "icon" | "list" | "column";
export type ClipboardMode = "copy" | "move" | null;

export interface FileStats {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
  createdTime: Date;
  permissions: string;
  linkCount: number;
}

interface FinderStore {
  // 导航
  currentPath: string;
  history: string[];
  historyIndex: number;
  // 文件数据
  fileList: FileItem[];
  loading: boolean;
  // 视图
  viewMode: FinderViewMode;
  // 选中
  selectedFiles: string[];
  lastSelectedIndex: number;
  // 剪贴板
  clipboardFiles: string[];
  clipboardMode: ClipboardMode;
  // 分栏视图专用
  columnPaths: string[];
  columnSelections: Record<number, string>;
  // 详情弹窗
  detailFile: FileStats | null;
  // 重命名
  renamingFile: { path: string; name: string } | null;

  // Actions - 导航
  navigateTo: (path: string, title?: string) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  goUp: () => string | null;

  // Actions - 文件数据
  setFileList: (files: FileItem[]) => void;
  setLoading: (loading: boolean) => void;

  // Actions - 视图
  setViewMode: (mode: FinderViewMode) => void;

  // Actions - 选中
  selectFile: (path: string, index: number, multi?: boolean, range?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Actions - 剪贴板
  copyFiles: (paths: string[]) => void;
  cutFiles: (paths: string[]) => void;
  clearClipboard: () => void;

  // Actions - 分栏
  setColumnPath: (level: number, path: string) => void;
  setColumnSelection: (level: number, path: string) => void;
  resetColumnView: () => void;

  // Actions - 详情
  setDetailFile: (file: FileStats | null) => void;

  // Actions - 重命名
  setRenamingFile: (file: { path: string; name: string } | null) => void;
}

const DEFAULT_ROOT = process.env.NEXT_PUBLIC_DIR || "/";

export const useFinderStore = create<FinderStore>((set, get) => ({
  currentPath: DEFAULT_ROOT,
  history: [DEFAULT_ROOT],
  historyIndex: 0,
  fileList: [],
  loading: false,
  viewMode: "icon",
  selectedFiles: [],
  lastSelectedIndex: -1,
  clipboardFiles: [],
  clipboardMode: null,
  columnPaths: [DEFAULT_ROOT],
  columnSelections: {},
  detailFile: null,
  renamingFile: null,

  navigateTo: (path) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(path);
      return {
        currentPath: path,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        fileList: [],
        loading: true,
        selectedFiles: [],
        lastSelectedIndex: -1,
      };
    }),

  goBack: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        currentPath: state.history[newIndex],
        historyIndex: newIndex,
        fileList: [],
        loading: true,
        selectedFiles: [],
        lastSelectedIndex: -1,
      };
    }),

  goForward: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        currentPath: state.history[newIndex],
        historyIndex: newIndex,
        fileList: [],
        loading: true,
        selectedFiles: [],
        lastSelectedIndex: -1,
      };
    }),

  canGoBack: () => get().historyIndex > 0,
  canGoForward: () => get().historyIndex < get().history.length - 1,

  goUp: () => {
    const { currentPath } = get();
    const parent = currentPath.substring(0, currentPath.lastIndexOf("/"));
    if (!parent || parent === currentPath) return null;
    const upPath = parent || "/";
    get().navigateTo(upPath);
    return upPath;
  },

  setFileList: (files) => set({ fileList: files, loading: false }),
  setLoading: (loading) => set({ loading }),

  setViewMode: (mode) => {
    if (mode === "column") {
      const { currentPath } = get();
      set({ viewMode: mode, columnPaths: [currentPath], columnSelections: {} });
    } else {
      set({ viewMode: mode });
    }
  },

  selectFile: (path, index, multi, range) =>
    set((state) => {
      if (range && state.lastSelectedIndex >= 0) {
        // Shift 范围选中
        const start = Math.min(state.lastSelectedIndex, index);
        const end = Math.max(state.lastSelectedIndex, index);
        const paths = state.fileList
          .slice(start, end + 1)
          .map((f) => f.path);
        return {
          selectedFiles: [...new Set([...state.selectedFiles, ...paths])],
          lastSelectedIndex: index,
        };
      }
      if (multi) {
        // Ctrl/Cmd 多选
        const exists = state.selectedFiles.includes(path);
        return {
          selectedFiles: exists
            ? state.selectedFiles.filter((p) => p !== path)
            : [...state.selectedFiles, path],
          lastSelectedIndex: index,
        };
      }
      // 单选
      return { selectedFiles: [path], lastSelectedIndex: index };
    }),

  clearSelection: () => set({ selectedFiles: [], lastSelectedIndex: -1 }),

  selectAll: () =>
    set((state) => ({
      selectedFiles: state.fileList.map((f) => f.path),
      lastSelectedIndex: state.fileList.length - 1,
    })),

  copyFiles: (paths) => set({ clipboardFiles: paths, clipboardMode: "copy" }),
  cutFiles: (paths) => set({ clipboardFiles: paths, clipboardMode: "move" }),
  clearClipboard: () => set({ clipboardFiles: [], clipboardMode: null }),

  setColumnPath: (level, path) =>
    set((state) => {
      // 保留当前栏及之前的所有路径，在下一栏显示点击的文件夹内容
      const newPaths = state.columnPaths.slice(0, level + 1);
      newPaths.push(path);
      const newSelections = { ...state.columnSelections };
      // 清除 level 及之后的选中
      Object.keys(newSelections).forEach((key) => {
        if (parseInt(key) >= level) delete newSelections[parseInt(key)];
      });
      return { columnPaths: newPaths, columnSelections: newSelections };
    }),

  setColumnSelection: (level, path) =>
    set((state) => {
      const newSelections = { ...state.columnSelections, [level]: path };
      // 清除更低层级的选中
      Object.keys(newSelections).forEach((key) => {
        if (parseInt(key) > level) delete newSelections[parseInt(key)];
      });
      return { columnSelections: newSelections };
    }),

  resetColumnView: () =>
    set((state) => ({
      columnPaths: [state.currentPath],
      columnSelections: {},
    })),

  setDetailFile: (file) => set({ detailFile: file }),
  setRenamingFile: (file) => set({ renamingFile: file }),
}));
