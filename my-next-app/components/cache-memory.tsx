"use client"

import type React from "react"

import { motion } from "framer-motion"
import { useEffect } from "react"

interface CacheMemoryProps {
  cache: Array<{ address: number | null; timestamp: number; frequency: number; tag: number | null }>
  mappingType: string
  setSize: number
  animatingAddress: number | null
  cacheBlockRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
}

export function CacheMemory({ cache, mappingType, setSize, animatingAddress, cacheBlockRefs }: CacheMemoryProps) {
  // Initialize refs array when cache size changes
  useEffect(() => {
    cacheBlockRefs.current = cacheBlockRefs.current.slice(0, cache.length)
  }, [cache.length, cacheBlockRefs])

  // Render cache blocks in a 4x2 grid
  const renderCacheBlocks = () => {
    if (mappingType === "set-associative") {
      // For set-associative, we group by sets
      const numSets = cache.length / setSize
      const sets = []

      for (let i = 0; i < numSets; i++) {
        const setBlocks = cache.slice(i * setSize, (i + 1) * setSize)
        const isSetContainingAnimatingAddress =
          animatingAddress !== null && setBlocks.some((block) => block.address === animatingAddress)

        sets.push(
          <div
            key={`set-${i}`}
            className={`col-span-1 p-2 rounded-lg ${
              isSetContainingAnimatingAddress ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-gray-100 dark:bg-gray-800"
            } border border-gray-200 dark:border-gray-700`}
          >
            <div className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400 text-center">Set {i}</div>
            <div className="space-y-2">
              {Array.from({ length: setSize }).map((_, j) => {
                const index = i * setSize + j
                return renderCacheBlock(index)
              })}
            </div>
          </div>,
        )
      }

      return sets
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
    const isAnimating = animatingAddress !== null && block.address === animatingAddress

    return (
      <motion.div
        key={`cache-${index}`}
        ref={(el) => (cacheBlockRefs.current[index] = el)}
        className={`
          p-4 rounded-lg border-2 flex flex-col justify-between
          ${block.address !== null ? "bg-white dark:bg-gray-800" : "bg-gray-100 dark:bg-gray-700"}
          ${isAnimating ? "border-green-500" : "border-gray-200 dark:border-gray-600"}
          min-h-[120px]
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
        <div className="flex justify-between items-start">
          <span className="text-xs text-gray-500 font-semibold">Index {index}</span>
          {block.tag !== null && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
              Tag: {block.tag}
            </span>
          )}
        </div>

        <div className="mt-2">
          {block.address !== null ? (
            <span className="font-mono font-bold text-lg">Addr: {block.address}</span>
          ) : (
            <span className="text-gray-400 text-lg">Empty</span>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-2">
          {block.address !== null && <div>Frequency: {block.frequency}</div>}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-inner">
      <div
        className={`grid ${mappingType === "set-associative" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-4"} gap-3`}
      >
        {renderCacheBlocks()}
      </div>
    </div>
  )
}
