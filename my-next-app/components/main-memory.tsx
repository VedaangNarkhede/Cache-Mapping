"use client"

import { motion } from "framer-motion"

interface MainMemoryProps {
  memory: Array<number | null>
  animatingAddress: number | null
}

export function MainMemory({ memory, animatingAddress }: MainMemoryProps) {
  // Filter out null values and sort by address
  const activeAddresses = memory.filter((addr): addr is number => addr !== null)

  return (
    <div className="bg-[#f5e6d8] dark:bg-gray-900 p-4 rounded-lg shadow-inner">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {activeAddresses.length === 0 ? (
          <div className="col-span-4 text-center p-8 text-muted-foreground">
            No addresses added yet. Enter an address to begin.
          </div>
        ) : (
          activeAddresses.map((address) => (
            <motion.div
              key={`memory-${address}`}
              className={`
                p-3 rounded-lg border-2 flex items-center justify-between
                bg-white dark:bg-gray-800
                border-[#e0d0c1] dark:border-gray-600
                ${animatingAddress === address ? "border-[#d4a373]" : ""}
              `}
              animate={
                animatingAddress === address
                  ? {
                      scale: [1, 1.05, 1],
                      borderColor: ["#d4a373", "#d4a373", "#d4a373"],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
            >
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Addr {address}</span>
                <span className="font-mono font-bold text-sm">Data</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
