import { CacheVisualizer } from "@/components/cache-visualizer"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800 dark:text-white">
          Cache Mapping Visualization
        </h1>
        <p className="text-center mb-8 text-gray-600 dark:text-gray-300">
          Explore direct, fully associative, and set-associative cache mapping with different replacement policies
        </p>

        <CacheVisualizer />
      </div>
    </main>
  )
}
