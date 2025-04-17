"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Database, BarChart3 } from "lucide-react"

interface CacheStatsProps {
  stats: {
    hits: number
    compulsoryMisses: number
    capacityMisses: number
  }
}

export function CacheStats({ stats }: CacheStatsProps) {
  // Calculate total accesses - count "both" type misses only once
  const totalAccesses = stats.hits + stats.compulsoryMisses
  const hitRate = totalAccesses > 0 ? (stats.hits / totalAccesses) * 100 : 0
  const missRate = 100 - hitRate

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
          <BarChart3 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{hitRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">{totalAccesses} total accesses</div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium">Cache Hits</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{stats.hits}</div>
          <div className="text-xs text-gray-500">Address found in cache</div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium">Compulsory Misses</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{stats.compulsoryMisses}</div>
          <div className="text-xs text-gray-500">First time accessing address</div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium">Capacity Misses</CardTitle>
          <Database className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{stats.capacityMisses}</div>
          <div className="text-xs text-gray-500">Cache full, replacement needed</div>
        </CardContent>
      </Card>
    </div>
  )
}
