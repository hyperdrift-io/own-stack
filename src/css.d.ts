// Its own file on purpose: global.d.ts imports React to extend it, which makes
// it a module — and a wildcard declaration only works from a script file.
declare module '*.css';
