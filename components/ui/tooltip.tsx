'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  delayDuration?: number
}

interface TooltipTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

interface TooltipContentProps {
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

const TooltipContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({ children, delayDuration = 200 }: TooltipProps) {
  const [open, setOpen] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div 
        className="relative w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({ asChild, children }: TooltipTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return <>{children}</>
  }
  return <>{children}</>
}

export function TooltipContent({ children, side = 'top', className }: TooltipContentProps) {
  const { open } = React.useContext(TooltipContext)

  if (!open) return null

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div
      className={cn(
        "absolute z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        sideClasses[side],
        className
      )}
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }}
    >
      {children}
    </div>
  )
}
