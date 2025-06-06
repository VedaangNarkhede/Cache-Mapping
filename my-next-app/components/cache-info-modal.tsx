"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CacheInfoModalProps {
  open: boolean
  onClose: () => void
}

export function CacheInfoModal({ open, onClose }: CacheInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cache Mapping and Replacement Policies</DialogTitle>
          <DialogDescription>Learn about different cache mapping techniques and replacement policies</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="mapping">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mapping">Cache Mapping</TabsTrigger>
            <TabsTrigger value="replacement">Replacement Policies</TabsTrigger>
            <TabsTrigger value="misses">Miss Types</TabsTrigger>
          </TabsList>

          <TabsContent value="mapping" className="space-y-4 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Direct Mapping</h3>
              <p className="text-gray-700 dark:text-gray-300">
                In direct mapping, each memory address can only go to one specific cache location. The cache location is
                determined by: <code>index = (address / block_size) % cache_size</code>. This is the simplest mapping
                technique but can lead to many capacity misses when different addresses map to the same cache location.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Fully Associative</h3>
              <p className="text-gray-700 dark:text-gray-300">
                In fully associative mapping, any memory address can be stored in any cache location. This provides
                maximum flexibility but requires searching the entire cache to find an address. When the cache is full,
                a replacement policy is used to decide which cache block to evict.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Set Associative</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Set associative mapping is a compromise between direct and fully associative mapping. The cache is
                divided into sets, and each memory address maps to a specific set. Within that set, the address can be
                stored in any block. This provides better flexibility than direct mapping while being more efficient
                than fully associative. The set is determined by:{" "}
                <code>set_index = (address / block_size) % (cache_size / set_size)</code>.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="replacement" className="space-y-4 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">FIFO (First In First Out)</h3>
              <p className="text-gray-700 dark:text-gray-300">
                FIFO replaces the oldest cache block first. It's simple to implement but doesn't consider how frequently
                or recently a block has been accessed. It keeps track of the order in which blocks were loaded into the
                cache.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">LRU (Least Recently Used)</h3>
              <p className="text-gray-700 dark:text-gray-300">
                LRU replaces the cache block that hasn't been accessed for the longest time. This policy works on the
                principle of temporal locality - if a block has been accessed recently, it's likely to be accessed again
                soon. LRU typically performs better than FIFO but requires tracking when each block was last accessed.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">LFU (Least Frequently Used)</h3>
              <p className="text-gray-700 dark:text-gray-300">
                LFU replaces the cache block that has been accessed the least number of times. This policy works on the
                principle that frequently accessed blocks are more important to keep in the cache. LFU requires counting
                the number of accesses for each block.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Random</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Random replacement simply chooses a random block to replace. While this might seem inefficient, it can
                perform surprisingly well in practice and is very simple to implement. It doesn't require any tracking
                of block usage.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="misses" className="space-y-4 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Compulsory Miss</h3>
              <p className="text-gray-700 dark:text-gray-300">
                A compulsory miss occurs when an address is accessed for the first time and is not found in the cache.
                These misses are unavoidable as the first access to any address will always result in a miss. They are
                also known as "cold start misses" because they happen when the cache is "cold" or empty.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Capacity Miss</h3>
              <p className="text-gray-700 dark:text-gray-300">
                A capacity miss occurs when the cache is full and a block needs to be replaced to make room for a new
                address. This happens when the working set of the program is larger than the cache size. In this
                simulation, a capacity miss is counted when a replacement occurs, regardless of whether the address has
                been seen before.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Combined Misses</h3>
              <p className="text-gray-700 dark:text-gray-300">
                In some cases, a miss can be both a compulsory miss and a capacity miss. This happens when an address is
                accessed for the first time (compulsory) and the cache is full, requiring a replacement (capacity). In
                this simulation, we track both types separately for educational purposes.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogClose asChild>
          <Button className="mt-4">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
