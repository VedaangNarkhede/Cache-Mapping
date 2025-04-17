"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, RefreshCw, HelpCircle, ArrowLeft } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CacheInfoModal } from "@/components/cache-info-modal"
import Link from "next/link"
import { CacheVisualizer } from "./cache-visualizer-comparison"

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

export function CacheComparison() {
  const { toast } = useToast()
  const [leftMappingType, setLeftMappingType] = useState(MAPPING_TYPES.DIRECT)
  const [rightMappingType, setRightMappingType] = useState(MAPPING_TYPES.FULLY_ASSOCIATIVE)
  const [leftReplacementPolicy, setLeftReplacementPolicy] = useState(REPLACEMENT_POLICIES.FIFO)
  const [rightReplacementPolicy, setRightReplacementPolicy] = useState(REPLACEMENT_POLICIES.LRU)
  const [addressInput, setAddressInput] = useState("")
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // References to child components
  const leftVisualizerRef = useRef<any>(null)
  const rightVisualizerRef = useRef<any>(null)

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

    // Set animating state to prevent multiple submissions
    setIsAnimating(true)

    // Process the address in both visualizers
    if (leftVisualizerRef.current) {
      leftVisualizerRef.current.processAddress(address)
    }

    if (rightVisualizerRef.current) {
      rightVisualizerRef.current.processAddress(address)
    }

    // Clear the input
    setAddressInput("")

    // Reset animating state after animations complete
    setTimeout(() => {
      setIsAnimating(false)
    }, 2500) // Allow enough time for both animations to complete
  }

  const resetCache = () => {
    if (leftVisualizerRef.current) {
      leftVisualizerRef.current.resetCache()
    }

    if (rightVisualizerRef.current) {
      rightVisualizerRef.current.resetCache()
    }
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Link href="/" passHref>
            <Button variant="outline" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">Cache Mapping Comparison</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">Left Side</h3>

            {/* Mapping Type Selection */}
            <div>
              <h4 className="text-md font-medium mb-2">Cache Mapping Type</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={leftMappingType === MAPPING_TYPES.DIRECT ? "default" : "outline"}
                  onClick={() => setLeftMappingType(MAPPING_TYPES.DIRECT)}
                  className="flex-1"
                  disabled={isAnimating}
                >
                  Direct Mapping
                </Button>
                <Button
                  variant={leftMappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE ? "default" : "outline"}
                  onClick={() => setLeftMappingType(MAPPING_TYPES.FULLY_ASSOCIATIVE)}
                  className="flex-1"
                  disabled={isAnimating}
                >
                  Fully Associative
                </Button>
                <Button
                  variant={leftMappingType === MAPPING_TYPES.SET_ASSOCIATIVE ? "default" : "outline"}
                  onClick={() => setLeftMappingType(MAPPING_TYPES.SET_ASSOCIATIVE)}
                  className="flex-1"
                  disabled={isAnimating}
                >
                  Set Associative
                </Button>
              </div>
            </div>

            {/* Replacement Policy Selection */}
            <div>
              <h4 className="text-md font-medium mb-2">Replacement Policy</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={leftReplacementPolicy === REPLACEMENT_POLICIES.FIFO ? "default" : "outline"}
                  onClick={() => setLeftReplacementPolicy(REPLACEMENT_POLICIES.FIFO)}
                  className="flex-1"
                  disabled={leftMappingType === MAPPING_TYPES.DIRECT || isAnimating}
                >
                  FIFO
                </Button>
                <Button
                  variant={leftReplacementPolicy === REPLACEMENT_POLICIES.LRU ? "default" : "outline"}
                  onClick={() => setLeftReplacementPolicy(REPLACEMENT_POLICIES.LRU)}
                  className="flex-1"
                  disabled={leftMappingType === MAPPING_TYPES.DIRECT || isAnimating}
                >
                  LRU
                </Button>
                <Button
                  variant={leftReplacementPolicy === REPLACEMENT_POLICIES.LFU ? "default" : "outline"}
                  onClick={() => setLeftReplacementPolicy(REPLACEMENT_POLICIES.LFU)}
                  className="flex-1"
                  disabled={leftMappingType === MAPPING_TYPES.DIRECT || isAnimating}
                >
                  LFU
                </Button>
                <Button
                  variant={leftReplacementPolicy === REPLACEMENT_POLICIES.RANDOM ? "default" : "outline"}
                  onClick={() => setLeftReplacementPolicy(REPLACEMENT_POLICIES.RANDOM)}
                  className="flex-1"
                  disabled={leftMappingType === MAPPING_TYPES.DIRECT || isAnimating}
                >
                  Random
                </Button>
              </div>
              {leftMappingType === MAPPING_TYPES.DIRECT && (
                <p className="text-sm text-gray-500 mt-2">
                  Note: Replacement policy is not applicable for Direct Mapping
                </p>
              )}
            </div>
          </div>

          {/* Right Side Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">Right Side</h3>

            {/* Mapping Type Selection */}
            <div>
              <h4 className="text-md font-medium mb-2">Cache Mapping Type</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={rightMappingType === MAPPING_TYPES.DIRECT ? "default" : "outline"}
                  onClick={() => setRightMappingType(MAPPING_TYPES.DIRECT)}
                  className="flex-1"
                  disabled={isAnimating}
                >
                  Direct Mapping
                </Button>
                <Button
                  variant={rightMappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE ? "default" : "outline"}
                  onClick={() => setRightMappingType(MAPPING_TYPES.FULLY_ASSOCIATIVE)}
                  className="flex-1"
                  disabled={isAnimating}
                >
                  Fully Associative
                </Button>
                <Button
                  variant={rightMappingType === MAPPING_TYPES.SET_ASSOCIATIVE ? "default" : "outline"}
                  onClick={() => setRightMappingType(MAPPING_TYPES.SET_ASSOCIATIVE)}
                  className="flex-1"
                  disabled={isAnimating}
                >
                  Set Associative
                </Button>
              </div>
            </div>

            {/* Replacement Policy Selection */}
            <div>
              <h4 className="text-md font-medium mb-2">Replacement Policy</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={rightReplacementPolicy === REPLACEMENT_POLICIES.FIFO ? "default" : "outline"}
                  onClick={() => setRightReplacementPolicy(REPLACEMENT_POLICIES.FIFO)}
                  className="flex-1"
                  disabled={rightMappingType === MAPPING_TYPES.DIRECT || isAnimating}
                >
                  FIFO
                </Button>
                <Button
                  variant={rightReplacementPolicy === REPLACEMENT_POLICIES.LRU ? "default" : "outline"}
                  onClick={() => setRightReplacementPolicy(REPLACEMENT_POLICIES.LRU)}
                  className="flex-1"
                  disabled={rightMappingType === MAPPING_TYPES.DIRECT || isAnimating}
                >
                  LRU
                </Button>
                <Button
                  variant={rightReplacementPolicy === REPLACEMENT_POLICIES.LFU ? "default" : "outline"}
                  onClick={() => setRightReplacementPolicy(REPLACEMENT_POLICIES.LFU)}
                  className="flex-1"
                  disabled={rightMappingType === MAPPING_TYPES.DIRECT || isAnimating}
                >
                  LFU
                </Button>
                <Button
                  variant={rightReplacementPolicy === REPLACEMENT_POLICIES.RANDOM ? "default" : "outline"}
                  onClick={() => setRightReplacementPolicy(REPLACEMENT_POLICIES.RANDOM)}
                  className="flex-1"
                  disabled={rightMappingType === MAPPING_TYPES.DIRECT || isAnimating}
                >
                  Random
                </Button>
              </div>
              {rightMappingType === MAPPING_TYPES.DIRECT && (
                <p className="text-sm text-gray-500 mt-2">
                  Note: Replacement policy is not applicable for Direct Mapping
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Address Input - Common for both sides */}
        <div className="mt-6">
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

      {/* Visualizers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side Visualizer */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="text-xl font-semibold mb-4 text-center">
            {leftMappingType === MAPPING_TYPES.DIRECT
              ? "Direct Mapping"
              : leftMappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE
                ? "Fully Associative"
                : "Set Associative"}
          </h3>
          <CacheVisualizer
            ref={leftVisualizerRef}
            mappingType={leftMappingType}
            replacementPolicy={leftReplacementPolicy}
            isComparisonMode={true}
          />
        </div>

        {/* Right Side Visualizer */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="text-xl font-semibold mb-4 text-center">
            {rightMappingType === MAPPING_TYPES.DIRECT
              ? "Direct Mapping"
              : rightMappingType === MAPPING_TYPES.FULLY_ASSOCIATIVE
                ? "Fully Associative"
                : "Set Associative"}
          </h3>
          <CacheVisualizer
            ref={rightVisualizerRef}
            mappingType={rightMappingType}
            replacementPolicy={rightReplacementPolicy}
            isComparisonMode={true}
          />
        </div>
      </div>

      {/* Info Modal */}
      <CacheInfoModal open={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  )
}
