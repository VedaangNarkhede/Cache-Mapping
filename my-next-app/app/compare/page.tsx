import { CacheComparison } from "@/components/cache-comparison"

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5ebe0] to-[#e3d5ca] dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-2 text-[#6b4f4f] dark:text-white">Cache Mapping Comparison</h1>
        <p className="text-center mb-8 text-[#7d6e83] dark:text-gray-300">
          Compare different cache mapping techniques side by side
        </p>

        <CacheComparison />
      </div>
    </main>
  )
}
