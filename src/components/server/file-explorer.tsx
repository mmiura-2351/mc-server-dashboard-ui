// This file now exports the lazy-loaded FileExplorer component for performance optimization
// Original FileExplorer available as FileExplorer from "./file-explorer/FileExplorer"

export { LazyFileExplorer as FileExplorer } from "./LazyFileExplorer";
export { LazyFileExplorer } from "./LazyFileExplorer";

// For cases where the non-lazy version is explicitly needed
export { FileExplorer as DirectFileExplorer } from "./file-explorer/FileExplorer";
