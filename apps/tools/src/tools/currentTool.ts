import { createContext, useContext } from 'react'
import type { ToolId } from './registry'

/** The tool whose page this is — set by ToolLayout, read by the parts every tool shares. */
export const CurrentToolContext = createContext<ToolId | null>(null)

/** Null outside a tool's page (the home grid, the visit page). */
export function useCurrentTool(): ToolId | null {
  return useContext(CurrentToolContext)
}
