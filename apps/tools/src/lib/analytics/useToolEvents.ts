import { useMemo } from 'react'
import { useCurrentTool } from '@/tools/currentTool'
import { toolEvents, type ToolEvents } from './pulse'

/** The current tool's events, for the parts every tool shares; null outside a tool's page. */
export function useToolEvents(): ToolEvents | null {
  const tool = useCurrentTool()
  return useMemo(() => (tool ? toolEvents(tool) : null), [tool])
}
