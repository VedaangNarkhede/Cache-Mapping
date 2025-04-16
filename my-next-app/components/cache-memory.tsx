"use client"

import { motion } from "framer-motion"

interface CacheMemoryProps {
  cache: Array<{ address: number | null; timestamp: number; frequency: number }>
  mappingType: string
  setSize: number
  animatingAddress: number | null
}

// Update the CacheMemory component to use a 4x2 grid layout without scrolling
export function CacheMemory({ cache, mappingType, setSize, animatingAddress }: CacheMemoryProps) {
  // Calculate which cache index would be used for the animating address
  const getTargetCacheIndex = (address: number | null) => {
    if (address === null) return -1

    if (mappingType === "direct") {
      return address % cache.length
    } else if (mappingType === "set-associative") {
      return Math.floor((address % (cache.length / setSize)) * setSize)
    }

    return -1 // For fully associative, we don't highlight a specific target
  }

  const targetIndex = getTargetCacheIndex(animatingAddress)

  // Render cache blocks in a 4x2 grid
  const renderCacheBlocks = () => {
    if (mappingType === "set-associative") {
      // For set-associative, we group by sets
      const blocks = []
      const numSets = cache.length / setSize

      for (let i = 0; i < numSets; i++) {
        for (let j = 0; j < setSize; j++) {
          const index = i * setSize + j
          blocks.push(
            <div key={`set-${i}-block-${j}`} className="col-span-1">
              {j === 0 && <div className="text-xs font-medium mb-1 text-gray-500">Set {i}</div>}
              {renderCacheBlock(index)}
            </div>,
          )
        }
      }

      return blocks
    } else {
      // For direct and fully associative, just render all blocks
      return cache.map((_, index) => (
        <div key={`cache-block-${index}`} className="col-span-1">
          {renderCacheBlock(index)}
        </div>
      ))
    }
  }

  const renderCacheBlock = (index: number) => {
    const block = cache[index]
    const isTarget =
      targetIndex === index ||
      (mappingType === "set-associative" && targetIndex <= index && index < targetIndex + setSize)
    const isAnimating = animatingAddress !== null && block.address === animatingAddress

    return (
      <motion.div
        key={`cache-${index}`}
        className={`
          p-3 rounded-lg border-2 flex items-center justify-between
          ${block.address !== null ? "bg-white dark:bg-gray-800" : "bg-gray-100 dark:bg-gray-700"}
          ${isTarget && animatingAddress !== null ? "border-yellow-400" : "border-gray-200 dark:border-gray-600"}
          ${isAnimating ? "border-green-500" : ""}
        `}
        animate={
          isAnimating
            ? {
                scale: [1, 1.05, 1],
                borderColor: ["#10b981", "#10b981", "#10b981"],
              }
            : {}
        }
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Index {index}</span>
          {block.address !== null ? (
            <span className="font-mono font-bold text-sm">Addr: {block.address}</span>
          ) : (
            <span className="text-gray-400 text-sm">Empty</span>
          )}
        </div>

        <div className="text-xs text-gray-500">
          {block.address !== null && (
            <>
              <div>Freq: {block.frequency}</div>
              <div>
                Time: {new Date(block.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-inner">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{renderCacheBlocks()}</div>
    </div>
  )
}
