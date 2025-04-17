"use client"

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CacheMemory } from "@/components/cache-memory"
import { MainMemory } from "@/components/main-memory"
import { CacheStats } from "@/components/cache-stats"
import { CacheHistory } from "@/components/cache-history"
import { useToast } from "@/hooks/use-toast"

// Cache configuration
const CACHE_SIZE = 8 // Number of cache blocks
const MAIN_MEMORY_SIZE = 32 // Number of main memory blocks
const SET_SIZE = 2 // Number of blocks per set for set-associative mapping
const ADDRESS_BITS = 20 // Number of bits in the address (up to 1048575)
const BLOCK_SIZE = 32 // Cache block size in bytes
const OFFSET_BITS = 5 // log2(32) = 5 bits for offset

// History entry type
interface HistoryEntry {
  address: number
  tag: number
  index: number
  offset: number
  result: "hit" | "miss"
  missType?: "compulsory" | "capacity" | "both"
  timestamp: number
}

interface CacheVisualizerProps {
  mappingType: string
  replacementPolicy: string
  isComparisonMode: boolean
}

export const CacheVisualizer = forwardRef<any, CacheVisualizerProps>(
  ({ mappingType, replacementPolicy, isComparisonMode }, ref) => {
    const { toast } = useToast()
    const [cache, setCache] = useState<
      Array<{ address: number | null; timestamp: number; frequency: number; tag: number | null }>
    >([])
    const [mainMemory, setMainMemory] = useState<Array<number | null>>([])
    const [stats, setStats] = useState({ hits: 0, compulsoryMisses: 0, capacityMisses: 0 })
    const [animatingAddress, setAnimatingAddress] = useState<number | null>(null)
    const [isAnimating, setIsAnimating] = useState(false)
    const [animationType, setAnimationType] = useState<"hit" | "miss" | null>(null)
    const [targetCacheIndex, setTargetCacheIndex] = useState<number | null>(null)
    const [history, setHistory] = useState<HistoryEntry[]>([])
    const [addressesEverSeen, setAddressesEverSeen] = useState<Set<number>>(new Set())

    // Refs for animation positioning
    const cacheBlockRefs = useRef<(HTMLDivElement | null)[]>([])
    const mainMemoryRef = useRef<HTMLDivElement>(null)
    const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 })

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      processAddress: (address: number) => processAddress(address),
      resetCache: () => resetCache(),
    }))

    // Calculate index and tag bits based on mapping type
    const getIndexBits = () => {
      if (mappingType === "direct") {
        return Math.log2(CACHE_SIZE)
      } else if (mappingType === "set-associative") {
        return Math.log2(CACHE_SIZE / SET_SIZE)
      }
      return 0 // Fully associative has no index bits
    }

    const getTagBits = () => {
      return ADDRESS_BITS - getIndexBits() - OFFSET_BITS
    }

    // Calculate tag and index for an address
    const getAddressComponents = (address: number) => {
      const indexBits = getIndexBits()
      const offsetBits = OFFSET_BITS

      const offset = address & ((1 << offsetBits) - 1)

      // For direct mapping, index is address % 8
      // For set associative, index is address % 4 (set number)
      let index = 0
      if (mappingType === "direct") {
        index = address % 8
      } else if (mappingType === "set-associative") {
        index = address % 4
      }

      // Tag is the remaining bits after offset and index
      const tag = address >> (indexBits + offsetBits)

      return { tag, index, offset }
    }

    // Initialize cache and main memory
    useEffect(() => {
      resetCache()
    }, [mappingType, replacementPolicy])

    const resetCache = () => {
      setCache(
        Array(CACHE_SIZE)
          .fill(null)
          .map(() => ({
            address: null,
            timestamp: 0,
            frequency: 0,
            tag: null,
          })),
      )
      setMainMemory(Array(MAIN_MEMORY_SIZE).fill(null))
      setStats({ hits: 0, compulsoryMisses: 0, capacityMisses: 0 })
      setHistory([])
      setAddressesEverSeen(new Set())
    }

    // Calculate cache index for an address based on mapping type
    const getCacheIndex = (address: number) => {
      const { index } = getAddressComponents(address)

      if (mappingType === "direct") {
        return index
      } else if (mappingType === "set-associative") {
        return index * SET_SIZE
      }
      return -1 // For fully associative
    }

    // Process an address
    const processAddress = (address: number) => {
      setIsAnimating(true)

      // Update main memory to include this address if it's not already there
      const newMainMemory = [...mainMemory]
      if (!newMainMemory.includes(address)) {
        // If we've reached the limit, remove the oldest entry
        if (newMainMemory.filter((addr) => addr !== null).length >= MAIN_MEMORY_SIZE) {
          // Find the first non-null entry that's not in cache
          const indexToRemove = newMainMemory.findIndex(
            (addr) => addr !== null && !cache.some((block) => block.address === addr),
          )

          if (indexToRemove !== -1) {
            newMainMemory[indexToRemove] = null
          } else {
            // If all addresses are in cache, just remove the first one
            const firstNonNullIndex = newMainMemory.findIndex((addr) => addr !== null)
            if (firstNonNullIndex !== -1) {
              newMainMemory[firstNonNullIndex] = null
            }
          }
        }

        // Find an empty slot
        const emptyIndex = newMainMemory.findIndex((addr) => addr === null)
        if (emptyIndex !== -1) {
          newMainMemory[emptyIndex] = address
        } else {
          // If no empty slot, add to the end
          newMainMemory.push(address)
        }
      }
      setMainMemory(newMainMemory)

      // Set the animating address for visual feedback
      setAnimatingAddress(address)

      // Check if address is already in cache (cache hit)
      const cacheIndex = findAddressInCache(address)
      const { tag, index, offset } = getAddressComponents(address)

      // Calculate target position for animation
      setTimeout(() => {
        if (cacheIndex !== -1) {
          // For cache hit, target the existing block
          const targetElement = cacheBlockRefs.current[cacheIndex]
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect()
            setTargetPosition({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            })
          }
          setTargetCacheIndex(cacheIndex)
        } else {
          // For cache miss, calculate where it will go
          let finalIndex: number

          if (mappingType === "direct") {
            // Direct mapping - fixed location based on address
            finalIndex = index
          } else if (mappingType === "fully-associative") {
            // Fully associative - can go anywhere, find using replacement policy
            finalIndex = findReplacementIndex(0, CACHE_SIZE)
          } else {
            // Set associative - find the set first, then use replacement policy within that set
            const setIndex = index
            const startIdx = setIndex * SET_SIZE

            // Check if there's an empty spot in the set
            let emptyIndex = -1
            for (let i = 0; i < SET_SIZE; i++) {
              if (cache[startIdx + i].address === null) {
                emptyIndex = startIdx + i
                break
              }
            }

            finalIndex = emptyIndex !== -1 ? emptyIndex : findReplacementIndex(startIdx, startIdx + SET_SIZE)
          }

          const targetElement = cacheBlockRefs.current[finalIndex]
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect()
            setTargetPosition({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            })
          }

          setTargetCacheIndex(finalIndex)
        }
      }, 100)

      if (cacheIndex !== -1) {
        // Cache hit
        setAnimationType("hit")
        setTargetCacheIndex(cacheIndex)

        // Add to history
        const historyEntry: HistoryEntry = {
          address,
          tag,
          index,
          offset,
          result: "hit",
          timestamp: Date.now(),
        }
        setHistory((prev) => [historyEntry, ...prev])

        // Delay the actual cache update to allow for animation
        setTimeout(() => {
          handleCacheHit(cacheIndex)

          // Clear animation after a delay
          setTimeout(() => {
            setAnimatingAddress(null)
            setAnimationType(null)
            setTargetCacheIndex(null)
            setIsAnimating(false)
          }, 500)
        }, 1000)

        return
      }

      // Cache miss - handle according to mapping type
      setAnimationType("miss")

      // Determine miss type
      let missType: "compulsory" | "capacity" | "both" = "compulsory"
      const isAddressFirstTime = !addressesEverSeen.has(address)

      // Check if all cache blocks are full or if we need to replace in direct/set-associative
      let willReplace = false
      let finalIndex: number

      if (mappingType === "direct") {
        // Direct mapping - fixed location based on address
        finalIndex = index
        willReplace = cache[finalIndex].address !== null
      } else if (mappingType === "fully-associative") {
        // For fully associative, check if the entire cache is full
        willReplace = cache.every((block) => block.address !== null)
        finalIndex = findReplacementIndex(0, CACHE_SIZE)
      } else {
        // For set associative, check if the specific set is full
        const setIndex = index
        const startIdx = setIndex * SET_SIZE

        // Check if there's an empty spot in the set
        let emptyIndex = -1
        for (let i = 0; i < SET_SIZE; i++) {
          if (cache[startIdx + i].address === null) {
            emptyIndex = startIdx + i
            break
          }
        }

        willReplace = emptyIndex === -1
        finalIndex = emptyIndex !== -1 ? emptyIndex : findReplacementIndex(startIdx, startIdx + SET_SIZE)
      }

      setTargetCacheIndex(finalIndex)

      if (isAddressFirstTime) {
        // First time seeing this address
        missType = willReplace ? "both" : "compulsory"
      } else {
        // We've seen this address before
        missType = willReplace ? "capacity" : "compulsory"
      }

      // Add to history
      const historyEntry: HistoryEntry = {
        address,
        tag,
        index,
        offset,
        result: "miss",
        missType,
        timestamp: Date.now(),
      }
      setHistory((prev) => [historyEntry, ...prev])

      // Update addresses ever seen
      setAddressesEverSeen((prev) => new Set([...prev, address]))

      // Delay the actual cache update to allow for animation
      setTimeout(() => {
        handleCacheMiss(address, missType, finalIndex)

        // Clear animation after a delay
        setTimeout(() => {
          setAnimatingAddress(null)
          setAnimationType(null)
          setTargetCacheIndex(null)
          setIsAnimating(false)
        }, 500)
      }, 1500)
    }

    const findAddressInCache = (address: number): number => {
      const { tag, index } = getAddressComponents(address)

      if (mappingType === "direct") {
        // For direct mapping, check only the specific index
        const blockIndex = index
        return cache[blockIndex]?.address === address ? blockIndex : -1
      } else if (mappingType === "fully-associative") {
        // For fully associative, check all cache blocks
        return cache.findIndex((block) => block.address === address)
      } else {
        // For set-associative, check only within the specific set
        const setIndex = index
        const startIdx = setIndex * SET_SIZE

        for (let i = 0; i < SET_SIZE; i++) {
          if (cache[startIdx + i]?.address === address) {
            return startIdx + i
          }
        }

        return -1
      }
    }

    const handleCacheHit = (cacheIndex: number) => {
      // Update stats
      setStats((prev) => ({ ...prev, hits: prev.hits + 1 }))

      // Update LRU/LFU information
      const newCache = [...cache]

      // Update timestamp for LRU
      newCache[cacheIndex].timestamp = Date.now()

      // Update frequency for LFU
      newCache[cacheIndex].frequency += 1

      setCache(newCache)

      // Show toast notification only if not in comparison mode
      if (!isComparisonMode) {
        toast({
          title: "Cache Hit!",
          description: `Address ${cache[cacheIndex].address} found in cache at index ${cacheIndex}`,
          variant: "default",
        })
      }
    }

    const handleCacheMiss = (address: number, missType: "compulsory" | "capacity" | "both", cacheIndex: number) => {
      const { tag } = getAddressComponents(address)

      // Update stats based on miss type
      setStats((prev) => {
        if (missType === "compulsory") {
          return { ...prev, compulsoryMisses: prev.compulsoryMisses + 1 }
        } else if (missType === "capacity") {
          return { ...prev, capacityMisses: prev.capacityMisses + 1 }
        } else {
          // "both"
          return {
            ...prev,
            compulsoryMisses: prev.compulsoryMisses + 1,
            capacityMisses: prev.capacityMisses + 1,
          }
        }
      })

      // Update cache
      const newCache = [...cache]

      // If we're replacing an existing address, we don't need to remove it from main memory
      // since we're now showing all addresses that have been entered
      newCache[cacheIndex] = {
        address,
        timestamp: Date.now(),
        frequency: 1,
        tag,
      }

      setCache(newCache)

      // Show toast notification only if not in comparison mode
      if (!isComparisonMode) {
        let missTitle = ""
        if (missType === "compulsory") {
          missTitle = "Compulsory Miss!"
        } else if (missType === "capacity") {
          missTitle = "Capacity Miss!"
        } else {
          missTitle = "Compulsory & Capacity Miss!"
        }

        toast({
          title: missTitle,
          description: `Address ${address} placed in cache at index ${cacheIndex}`,
          variant: "default",
        })
      }
    }

    const findReplacementIndex = (startIdx: number, endIdx: number): number => {
      const candidateBlocks = cache.slice(startIdx, endIdx)

      // If there's an empty block, use that first
      const emptyIndex = candidateBlocks.findIndex((block) => block.address === null)
      if (emptyIndex !== -1) {
        return startIdx + emptyIndex
      }

      // Otherwise, use the selected replacement policy
      switch (replacementPolicy) {
        case "fifo":
          // Find the oldest block (lowest timestamp)
          return (
            startIdx +
            candidateBlocks.reduce(
              (minIdx, block, idx, arr) => (block.timestamp < arr[minIdx].timestamp ? idx : minIdx),
              0,
            )
          )

        case "lru":
          // Find the least recently used block (lowest timestamp)
          return (
            startIdx +
            candidateBlocks.reduce(
              (minIdx, block, idx, arr) => (block.timestamp < arr[minIdx].timestamp ? idx : minIdx),
              0,
            )
          )

        case "lfu":
          // Find the least frequently used block (lowest frequency)
          return (
            startIdx +
            candidateBlocks.reduce(
              (minIdx, block, idx, arr) => (block.frequency < arr[minIdx].frequency ? idx : minIdx),
              0,
            )
          )

        case "random":
          // Choose a random block
          return startIdx + Math.floor(Math.random() * (endIdx - startIdx))

        default:
          return startIdx
      }
    }

    return (
      <div className="space-y-4">
        {/* Cache Memory */}
        <div>
          <h4 className="text-lg font-medium mb-2 text-center">Cache Memory</h4>
          <CacheMemory
            cache={cache}
            mappingType={mappingType}
            setSize={SET_SIZE}
            animatingAddress={animatingAddress}
            cacheBlockRefs={cacheBlockRefs}
          />
        </div>

        {/* Main Memory */}
        <div>
          <h4 className="text-lg font-medium mb-2 text-center">Main Memory</h4>
          <MainMemory memory={mainMemory} animatingAddress={animatingAddress} />
        </div>

        {/* Sliding Animation for Address Block */}
        <AnimatePresence>
          {animatingAddress !== null && animationType === "miss" && (
            <motion.div
              className="absolute z-10 p-3 rounded-lg border-2 bg-white dark:bg-gray-800 border-yellow-400 shadow-lg flex items-center justify-between"
              style={{
                width: "120px",
                height: "70px",
                position: "fixed",
              }}
              initial={{
                top: "50%",
                right: "25%",
                x: "50%",
                y: "-50%",
                opacity: 0,
              }}
              animate={{
                top: targetPosition.y,
                left: targetPosition.x,
                x: "-50%",
                y: "-50%",
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 1.5,
                ease: "easeInOut",
              }}
            >
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Addr {animatingAddress}</span>
                <span className="font-mono font-bold text-sm">Data</span>
                <span className="text-xs text-gray-500">Tag: {getAddressComponents(animatingAddress).tag}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Highlight Animation for Cache Hit */}
        <AnimatePresence>
          {animatingAddress !== null && animationType === "hit" && targetPosition.x !== 0 && (
            <motion.div
              className="absolute z-10 bg-green-400 dark:bg-green-500 rounded-full opacity-50"
              style={{
                width: "40px",
                height: "40px",
                position: "fixed",
                top: targetPosition.y,
                left: targetPosition.x,
                x: "-50%",
                y: "-50%",
              }}
              initial={{
                scale: 0.5,
                opacity: 0,
              }}
              animate={{
                scale: 2,
                opacity: 0.6,
              }}
              exit={{
                scale: 0.5,
                opacity: 0,
              }}
              transition={{
                duration: 0.8,
                ease: "easeInOut",
              }}
            />
          )}
        </AnimatePresence>

        {/* Cache Stats */}
        <CacheStats stats={stats} />

        {/* Cache History - Only show in non-comparison mode */}
        {!isComparisonMode && <CacheHistory history={history} />}
      </div>
    )
  },
)

CacheVisualizer.displayName = "CacheVisualizer"
