// Minimal typing for the WebMCP imperative API (https://webmachinelearning.github.io/webmcp/).
// Kept local so the page has no runtime dependency on the standard's type package.
interface ModelContextTool<I = Record<string, unknown>> {
  name: string
  description: string
  inputSchema?: Record<string, unknown>
  annotations?: Record<string, unknown>
  execute: (input: I, options?: { signal?: AbortSignal }) => unknown | Promise<unknown>
}

interface RegisteredTool {
  name: string
  description: string
  inputSchema?: Record<string, unknown>
  origin: string
}

interface ModelContext extends EventTarget {
  registerTool(tool: ModelContextTool<any>, options?: { signal?: AbortSignal }): Promise<void>
  getTools(): Promise<RegisteredTool[]>
  executeTool(tool: RegisteredTool, input: unknown): Promise<unknown>
  ontoolchange: ((ev: Event) => void) | null
}

interface Document {
  modelContext?: ModelContext
}
