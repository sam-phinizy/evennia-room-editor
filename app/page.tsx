"use client"

import FlowDiagram from "@/components/flow-diagram"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4">
      <div className="w-full h-[calc(100vh-2rem)]">
        <FlowDiagram />
      </div>
    </main>
  )
}

