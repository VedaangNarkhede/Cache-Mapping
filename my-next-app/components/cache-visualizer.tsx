"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { CacheMemory } from "@/components/cache-memory"
import { MainMemory } from "@/components/main-memory"
import { CacheStats } from "@/components/cache-stats"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, RefreshCw, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CacheInfoModal } from "@/components/cache-info-modal"

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

// Cache configuration
const CACHE_SIZE = 8 // Number of cache blocks
const MAIN_MEMORY_SIZE = 32 // Number of main memory blocks
const SET_SIZE = 2 // Number of blocks per set for set-associative mapping

export function CacheVisualizer() {
  const { toast } = useToast()
  const [mappingType, setMappingType] = useState(MAPPING_TYPES.DIRECT)
  const [replacementPolicy, setReplacementPolicy] = useState(REPLACEMENT_POLICIES.FIFO)
  const [addressInput, setAddressInput] = useState("")
  const [cache, setCache] = useState<Array<{ address: number | null; timestamp: number; frequency: number }>>([])
  const [mainMemory, setMainMemory] = useState<Array<number | null>>([])
  const [stats, setStats] = useState({ hits: 0, compulsoryMisses: 0, conflictMisses: 0 })
  const [animatingAddress, setAnimatingAddress] = useState<number | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)

  // Initialize cache and main memory
  useEffect(() => {
    resetCache()
  }, [mappingType])

  const resetCache = () => {
    setCache(
      Array(CACHE_SIZE)
        .fill(null)
        .map(() => ({
          address: null,
          timestamp: 0,
          frequency: 0,
        })),
    )
    setMainMemory(Array(MAIN_MEMORY_SIZE).fill(null))
    setStats({ hits: 0, compulsoryMisses: 0, conflictMisses: 0 })
  }

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const address = Number.parseInt(addressInput)

    if (isNaN(address) || address < 0) {
      toast({
        title: "Invalid address",
        description: "Please enter a positive number",
        variant: "destructive",
      })
      return
    }

    processAddress(address)
    setAddressInput("")
  }

  // Update the processAddress function to handle dynamic addresses
  const processAddress = (address: number) => {
    // Set the animating address for visual feedback
    setAnimatingAddress(address)

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

    // Check if address is already in cache (cache hit)
    const cacheIndex = findAddressInCache(address)

    if (cacheIndex !== -1) {
      // Cache hit
      handleCacheHit(cacheIndex)

      // Clear animation after a delay
      setTimeout(() => {
        setAnimatingAddress(null)
      }, 1000)

      return
    }

    // Cache miss - handle according to mapping type
    handleCacheMiss(address)

    // Clear animation after a delay
    setTimeout(() => {
      setAnimatingAddress(null)
    }, 1500)
  }

  const findAddressInCache = (address: number): number => {
    if (mappingType === MAPPING_TYPES.DIRECT) {
      // For direct mapping, check only the specific index
      const index = address % CACHE_SIZE
      return cache[index].address === address ? index : -1
    } else if (mappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE) {
      // For fully associative, check all cache blocks
      return cache.findIndex((block) => block.address === address)
    } else {
      // For set-associative, check only within the specific set
      const setIndex = address % (CACHE_SIZE / SET_SIZE)
      const startIdx = setIndex * SET_SIZE

      for (let i = 0; i < SET_SIZE; i++) {
        if (cache[startIdx + i].address === address) {
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
  const handleCacheMiss = (address: number) => {
    let cacheIndex: number
    let isConflictMiss = false

    if (mappingType === MAPPING_TYPES.DIRECT) {
      // Direct mapping - fixed location based on address
      cacheIndex = address % CACHE_SIZE
      isConflictMiss = cache[cacheIndex].address !== null
    } else if (mappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE) {
      // Fully associative - can go anywhere, find using replacement policy
      cacheIndex = findReplacementIndex(0, CACHE_SIZE)
      isConflictMiss = cache.every((block) => block.address !== null)
    } else {
      // Set associative - find the set first, then use replacement policy within that set
      const setIndex = address % (CACHE_SIZE / SET_SIZE)
      const startIdx = setIndex * SET_SIZE

      // Check if there's an empty spot in the set
      let emptyIndex = -1
      for (let i = 0; i < SET_SIZE; i++) {
        if (cache[startIdx + i].address === null) {
          emptyIndex = startIdx + i
          break
        }
      }

      if (emptyIndex !== -1) {
        cacheIndex = emptyIndex
        isConflictMiss = false
      } else {
        // No empty spot, use replacement policy within the set
        cacheIndex = findReplacementIndex(startIdx, startIdx + SET_SIZE)
        isConflictMiss = true
      }
    }

    // Update stats
    setStats((prev) => ({
      ...prev,
      compulsoryMisses: isConflictMiss ? prev.compulsoryMisses : prev.compulsoryMisses + 1,
      conflictMisses: isConflictMiss ? prev.conflictMisses + 1 : prev.conflictMisses,
    }))

    // Update cache
    const newCache = [...cache]

    // If we're replacing an existing address, we don't need to remove it from main memory
    // since we're now showing all addresses that have been entered
    newCache[cacheIndex] = {
      address,
      timestamp: Date.now(),
      frequency: 1,
    }

    setCache(newCache)

    // Show toast notification
    toast({
      title: isConflictMiss ? "Conflict Miss!" : "Compulsory Miss!",
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

  // Update the visualization section to place cache stats below the visualization
  // and improve the animation between main memory and cache
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
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={mappingType === MAPPING_TYPES.DIRECT ? "default" : "outline"}
                onClick={() => setMappingType(MAPPING_TYPES.DIRECT)}
                className="flex-1"
              >
                Direct Mapping
              </Button>
              <Button
                variant={mappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE ? "default" : "outline"}
                onClick={() => setMappingType(MAPPING_TYPES.FULLY_ASSOCIATIVE)}
                className="flex-1"
              >
                Fully Associative
              </Button>
              <Button
                variant={mappingType === MAPPING_TYPES.SET_ASSOCIATIVE ? "default" : "outline"}
                onClick={() => setMappingType(MAPPING_TYPES.SET_ASSOCIATIVE)}
                className="flex-1"
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
                disabled={mappingType === MAPPING_TYPES.DIRECT}
              >
                FIFO
              </Button>
              <Button
                variant={replacementPolicy === REPLACEMENT_POLICIES.LRU ? "default" : "outline"}
                onClick={() => setReplacementPolicy(REPLACEMENT_POLICIES.LRU)}
                className="flex-1"
                disabled={mappingType === MAPPING_TYPES.DIRECT}
              >
                LRU
              </Button>
              <Button
                variant={replacementPolicy === REPLACEMENT_POLICIES.LFU ? "default" : "outline"}
                onClick={() => setReplacementPolicy(REPLACEMENT_POLICIES.LFU)}
                className="flex-1"
                disabled={mappingType === MAPPING_TYPES.DIRECT}
              >
                LFU
              </Button>
              <Button
                variant={replacementPolicy === REPLACEMENT_POLICIES.RANDOM ? "default" : "outline"}
                onClick={() => setReplacementPolicy(REPLACEMENT_POLICIES.RANDOM)}
                className="flex-1"
                disabled={mappingType === MAPPING_TYPES.DIRECT}
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
                Memory Address (any positive number)
              </Label>
              <Input
                id="address"
                type="number"
                min="0"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Enter address"
                className="w-full"
              />
            </div>
            <Button type="submit" className="flex items-center gap-1">
              Add Address <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={resetCache}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </form>
        </div>
      </div>

      {/* Visualization - Now side by side */}
      <div className="flex flex-col md:flex-row gap-6 relative">
        {/* Main Memory - Now on the right */}
        <div className="md:order-2 md:w-1/2">
          <h3 className="text-xl font-semibold mb-4 text-center">Main Memory</h3>
          <MainMemory memory={mainMemory} animatingAddress={animatingAddress} />
        </div>

        {/* Cache Memory - Now on the left */}
        <div className="md:order-0 md:w-1/2">
          <h3 className="text-xl font-semibold mb-4 text-center">Cache Memory</h3>
          <CacheMemory cache={cache} mappingType={mappingType} setSize={SET_SIZE} animatingAddress={animatingAddress} />
        </div>

        {/* Sliding Animation */}
        <AnimatePresence>
          {animatingAddress !== null && (
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10 bg-yellow-400 dark:bg-yellow-500 text-black font-bold rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
              initial={{
                x: "50%", // Start from the right (main memory)
                opacity: 0,
                scale: 0.5,
              }}
              animate={{
                x: "-50%", // Move to the left (cache)
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.5,
              }}
              transition={{
                duration: 1,
                ease: "easeInOut",
              }}
            >
              {animatingAddress}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cache Stats - Now below the visualization */}
      <CacheStats stats={stats} />

      {/* Info Modal */}
      <CacheInfoModal open={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  )
}
