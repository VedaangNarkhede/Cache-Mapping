"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface HistoryEntry {
  address: number
  tag: number
  index: number
  offset: number
  result: "hit" | "miss"
  missType?: "compulsory" | "capacity" | "both"
  timestamp: number
}

interface CacheHistoryProps {
  history: HistoryEntry[]
}

export function CacheHistory({ history }: CacheHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium mb-4">Access History</h3>
        <p className="text-muted-foreground dark:text-gray-400 text-center py-4">No cache accesses yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium mb-4">Access History</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Address</TableHead>
              <TableHead className="w-[80px]">Tag</TableHead>
              <TableHead className="w-[80px]">Index</TableHead>
              <TableHead className="w-[80px]">Offset</TableHead>
              <TableHead className="w-[100px]">Result</TableHead>
              <TableHead className="w-[120px]">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry, i) => (
              <TableRow key={`history-${i}`}>
                <TableCell className="font-mono">{entry.address}</TableCell>
                <TableCell className="font-mono">{entry.tag}</TableCell>
                <TableCell className="font-mono">{entry.index}</TableCell>
                <TableCell className="font-mono">{entry.offset}</TableCell>
                <TableCell>
                  {entry.result === "hit" ? (
                    <Badge
                      variant="outline"
                      className="bg-[#e9edc9] text-[#606c38] dark:bg-green-900 dark:text-green-200 border-[#ccd5ae] dark:border-green-800"
                    >
                      Hit
                    </Badge>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className="bg-[#f8edeb] text-[#9d6b53] dark:bg-red-900 dark:text-red-200 border-[#f5cac3] dark:border-red-800"
                      >
                        Miss
                      </Badge>
                      {entry.missType === "compulsory" && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-[#fefae0] text-[#bc6c25] dark:bg-yellow-900 dark:text-yellow-200 border-[#faedcd] dark:border-yellow-800"
                        >
                          Compulsory
                        </Badge>
                      )}
                      {entry.missType === "capacity" && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-[#e0e4e8] text-[#4a5568] dark:bg-blue-900 dark:text-blue-200 border-[#cbd5e0] dark:border-blue-800"
                        >
                          Capacity
                        </Badge>
                      )}
                      {entry.missType === "both" && (
                        <>
                          <Badge
                            variant="outline"
                            className="text-xs bg-[#fefae0] text-[#bc6c25] dark:bg-yellow-900 dark:text-yellow-200 border-[#faedcd] dark:border-yellow-800"
                          >
                            Compulsory
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs bg-[#e0e4e8] text-[#4a5568] dark:bg-blue-900 dark:text-blue-200 border-[#cbd5e0] dark:border-blue-800"
                          >
                            Capacity
                          </Badge>
                        </>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
