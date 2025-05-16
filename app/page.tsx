import { Suspense } from "react"

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">Welcome to OakTree</h1>
        <p className="mt-2">Your AI-powered learning companion</p>
      </div>
    </Suspense>
  )
}
