import _ReactPlayer from "react-player";

/**
 * ReactPlayer wrapper to handle CommonJS / ESM interop across bundlers (Vite/Rollup).
 * In Vite, react-player's CJS bundle exports `{ default: ReactPlayer, __esModule: true }`,
 * which causes default imports to resolve to an object instead of the component function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayerComponent: any =
  typeof (_ReactPlayer as any)?.default === "function"
    ? (_ReactPlayer as any).default
    : _ReactPlayer;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReactPlayerConstructor = typeof _ReactPlayer & (new (...args: any[]) => _ReactPlayer);

const ReactPlayer = ReactPlayerComponent as ReactPlayerConstructor;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ReactPlayer extends _ReactPlayer {}

export default ReactPlayer;
