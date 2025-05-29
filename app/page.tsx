import { Suspense } from "react"
import LandingPage from "../components/landing-page"

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LandingPage />
    </Suspense>
  )
}
