"use client"

import { motion, AnimatePresence, type Transition } from "framer-motion"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"

interface ChamberTransitionProps {
  children: ReactNode
}

const chamberVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

const chamberTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.1, 0.25, 1], // easeOut as cubic bezier
}

export function ChamberTransition({ children }: ChamberTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={chamberVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={chamberTransition}
        className="flex-1 min-h-0 overflow-hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Stagger animation for grids
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}
