"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { CacheMemory } from "@/components/cache-memory"
import { MainMemory } from "@/components/main-memory"
import { CacheStats } from "@/components/cache-stats"
import { CacheHistory } from "@/components/cache-history"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, RefreshCw, HelpCircle, Split } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CacheInfoModal } from "@/components/cache-info-modal"
import Link from "next/link"

// Cache mapping types
const MAPPING_TYPES = {
  DIRECT: "direct",
  FULLY_ASSOCIATIVE: "fully-associative",
  SET_ASSOCIATIVE: "set-associative",
}

// Replacement policies
const REPLACEMENT_POLICIES = {
  FIFO: "fifo",
  LRU: "lru",
  LFU: "lfu",
  RANDOM: "random",
}

// Miss types
const MISS_TYPES = {
  COMPULSORY: "compulsory",
  CAPACITY: "capacity",
}

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

export function CacheVisualizer() {
  const { toast } = useToast()
  const [mappingType, setMappingType] = useState(MAPPING_TYPES.DIRECT)
  const [replacementPolicy, setReplacementPolicy] = useState(REPLACEMENT_POLICIES.FIFO)
  const [addressInput, setAddressInput] = useState("")
  const [cache, setCache] = useState<
    Array<{ address: number | null; timestamp: number; frequency: number; tag: number | null }>
  >([])
  const [mainMemory, setMainMemory] = useState<Array<number | null>>([])
  const [stats, setStats] = useState({ hits: 0, compulsoryMisses: 0, capacityMisses: 0 })
  const [animatingAddress, setAnimatingAddress] = useState<number | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationType, setAnimationType] = useState<"hit" | "miss" | null>(null)
  const [targetCacheIndex, setTargetCacheIndex] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [addressesEverSeen, setAddressesEverSeen] = useState<Set<number>>(new Set())

  // Refs for animation positioning
  const cacheBlockRefs = useRef<(HTMLDivElement | null)[]>([])
  const mainMemoryRef = useRef<HTMLDivElement>(null)
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 })

  // Calculate index and tag bits based on mapping type
  const getIndexBits = () => {
    if (mappingType === MAPPING_TYPES.DIRECT) {
      return Math.log2(CACHE_SIZE)
    } else if (mappingType === MAPPING_TYPES.SET_ASSOCIATIVE) {
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
    if (mappingType === MAPPING_TYPES.DIRECT) {
      index = address % 8
    } else if (mappingType === MAPPING_TYPES.SET_ASSOCIATIVE) {
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

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isAnimating) return // Prevent submitting during animation

    const address = Number.parseInt(addressInput)

    if (isNaN(address) || address < 0 || address > 1048575) {
      toast({
        title: "Invalid address",
        description: "Please enter a positive number up to 1048575 (20 bits)",
        variant: "destructive",
      })
      return
    }

    processAddress(address)
    setAddressInput("")
  }

  // Calculate cache index for an address based on mapping type
  const getCacheIndex = (address: number) => {
    const { index } = getAddressComponents(address)

    if (mappingType === MAPPING_TYPES.DIRECT) {
      return index
    } else if (mappingType === MAPPING_TYPES.SET_ASSOCIATIVE) {
      return index * SET_SIZE
    }
    return -1 // For fully associative
  }

  // Update the processAddress function to handle dynamic addresses
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

        if (mappingType === MAPPING_TYPES.DIRECT) {
          // Direct mapping - fixed location based on address
          finalIndex = index
        } else if (mappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE) {
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

    if (mappingType === MAPPING_TYPES.DIRECT) {
      // Direct mapping - fixed location based on address
      finalIndex = index
      willReplace = cache[finalIndex].address !== null
    } else if (mappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE) {
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

    if (mappingType === MAPPING_TYPES.DIRECT) {
      // For direct mapping, check only the specific index
      const blockIndex = index
      return cache[blockIndex]?.address === address ? blockIndex : -1
    } else if (mappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE) {
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

    // Show toast notification
    toast({
      title: "Cache Hit!",
      description: `Address ${cache[cacheIndex].address} found in cache at index ${cacheIndex}`,
      variant: "default",
    })
  }

  // Update the handleCacheMiss function to handle dynamic addresses
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

    // Show toast notification
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

  const findReplacementIndex = (startIdx: number, endIdx: number): number => {
    const candidateBlocks = cache.slice(startIdx, endIdx)

    // If there's an empty block, use that first
    const emptyIndex = candidateBlocks.findIndex((block) => block.address === null)
    if (emptyIndex !== -1) {
      return startIdx + emptyIndex
    }

    // Otherwise, use the selected replacement policy
    switch (replacementPolicy) {
      case REPLACEMENT_POLICIES.FIFO:
        // Find the oldest block (lowest timestamp)
        return (
          startIdx +
          candidateBlocks.reduce(
            (minIdx, block, idx, arr) => (block.timestamp < arr[minIdx].timestamp ? idx : minIdx),
            0,
          )
        )

      case REPLACEMENT_POLICIES.LRU:
        // Find the least recently used block (lowest timestamp)
        return (
          startIdx +
          candidateBlocks.reduce(
            (minIdx, block, idx, arr) => (block.timestamp < arr[minIdx].timestamp ? idx : minIdx),
            0,
          )
        )

      case REPLACEMENT_POLICIES.LFU:
        // Find the least frequently used block (lowest frequency)
        return (
          startIdx +
          candidateBlocks.reduce(
            (minIdx, block, idx, arr) => (block.frequency < arr[minIdx].frequency ? idx : minIdx),
            0,
          )
        )

      case REPLACEMENT_POLICIES.RANDOM:
        // Choose a random block
        return startIdx + Math.floor(Math.random() * (endIdx - startIdx))

      default:
        return startIdx
    }
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="space-y-4">
          {/* Mapping Type Selection */}
          <div>
            <div className="flex items-center mb-2">
              <h3 className="text-lg font-medium">Cache Mapping Type</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-2" onClick={() => setShowInfoModal(true)}>
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Learn more about cache mapping types</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Link href="/compare" passHref>
                <Button variant="outline" size="sm" className="ml-2">
                  <Split className="h-4 w-4 mr-1" /> Compare Mappings
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={mappingType === MAPPING_TYPES.DIRECT ? "default" : "outline"}
                onClick={() => setMappingType(MAPPING_TYPES.DIRECT)}
                className="flex-1"
                disabled={isAnimating}
              >
                Direct Mapping
              </Button>
              <Button
                variant={mappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE ? "default" : "outline"}
                onClick={() => setMappingType(MAPPING_TYPES.FULLY_ASSOCIATIVE)}
                className="flex-1"
                disabled={isAnimating}
              >
                Fully Associative
              </Button>
              <Button
                variant={mappingType === MAPPING_TYPES.SET_ASSOCIATIVE ? "default" : "outline"}
                onClick={() => setMappingType(MAPPING_TYPES.SET_ASSOCIATIVE)}
                className="flex-1"
                disabled={isAnimating}
              >
                Set Associative
              </Button>
            </div>
          </div>

          {/* Replacement Policy Selection */}
          <div>
            <h3 className="text-lg font-medium mb-2">Replacement Policy</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={replacementPolicy === REPLACEMENT_POLICIES.FIFO ? "default" : "outline"}
                onClick={() => setReplacementPolicy(REPLACEMENT_POLICIES.FIFO)}
                className="flex-1"
                disabled={mappingType === MAPPING_TYPES.DIRECT || isAnimating}
              >
                FIFO
              </Button>
              <Button
                variant={replacementPolicy === REPLACEMENT_POLICIES.LRU ? "default" : "outline"}
                onClick={() => setReplacementPolicy(REPLACEMENT_POLICIES.LRU)}
                className="flex-1"
                disabled={mappingType === MAPPING_TYPES.DIRECT || isAnimating}
              >
                LRU
              </Button>
              <Button
                variant={replacementPolicy === REPLACEMENT_POLICIES.LFU ? "default" : "outline"}
                onClick={() => setReplacementPolicy(REPLACEMENT_POLICIES.LFU)}
                className="flex-1"
                disabled={mappingType === MAPPING_TYPES.DIRECT || isAnimating}
              >
                LFU
              </Button>
              <Button
                variant={replacementPolicy === REPLACEMENT_POLICIES.RANDOM ? "default" : "outline"}
                onClick={() => setReplacementPolicy(REPLACEMENT_POLICIES.RANDOM)}
                className="flex-1"
                disabled={mappingType === MAPPING_TYPES.DIRECT || isAnimating}
              >
                Random
              </Button>
            </div>
            {mappingType === MAPPING_TYPES.DIRECT && (
              <p className="text-sm text-gray-500 mt-2">
                Note: Replacement policy is not applicable for Direct Mapping
              </p>
            )}
          </div>

          {/* Address Input */}
          <form onSubmit={handleAddressSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="address" className="mb-2 block">
                Memory Address (0 to 1048575)
              </Label>
              <Input
                id="address"
                type="number"
                min="0"
                max="1048575"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Enter address"
                className="w-full"
                disabled={isAnimating}
              />
            </div>
            <Button type="submit" className="flex items-center gap-1" disabled={isAnimating}>
              Add Address <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={resetCache} disabled={isAnimating}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </form>
        </div>
      </div>

      {/* Visualization - Now side by side */}
      <div className="flex flex-col md:flex-row gap-6 relative" ref={mainMemoryRef}>
        {/* Main Memory - Now on the right */}
        <div className="md:order-2 md:w-1/2">
          <h3 className="text-xl font-semibold mb-4 text-center">Main Memory</h3>
          <MainMemory memory={mainMemory} animatingAddress={animatingAddress} />
        </div>

        {/* Cache Memory - Now on the left */}
        <div className="md:order-0 md:w-1/2">
          <h3 className="text-xl font-semibold mb-4 text-center">Cache Memory</h3>
          <CacheMemory
            cache={cache}
            mappingType={mappingType}
            setSize={SET_SIZE}
            animatingAddress={animatingAddress}
            cacheBlockRefs={cacheBlockRefs}
          />
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
      </div>

      {/* Cache Stats - Now below the visualization */}
      <CacheStats stats={stats} />

      {/* Cache History */}
      <CacheHistory history={history} />

      {/* Info Modal */}
      <CacheInfoModal open={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  )
}
