import { LandingPage } from "@/features/landing/LandingPage";

// `/` renders the landing page. Dashboard + onboarding will live as their own
// routes (e.g. app/dashboard, app/onboarding) backed by src/features/*.
export default function Home() {
  return <LandingPage />;
}
