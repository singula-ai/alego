/** Durable file deliveries produced by the present tool. */
import type { ToolCallId } from '@singula-ai/alego-llm/brand'

/** A declared filesystem file whose current contents remain at its source path. */
export interface PresentedFile {
  /** Original absolute path or path relative to the Session working directory. */
  path: string
  /** Optional description supplied by the model. */
  description?: string
}

declare module '@singula-ai/alego-session/types' {
  interface SessionEventMap {
    /** Declared filesystem files from a successful final present result, including nested calls. */
    'deliverables/presented': { turn: number; callId: ToolCallId; files: PresentedFile[] }
  }
}
