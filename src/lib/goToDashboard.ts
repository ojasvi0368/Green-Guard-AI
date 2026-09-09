import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Reusable function to navigate to dashboard with overlay
 * Shows overlay immediately, then navigates
 * 
 * @param router - Next.js router instance from useRouter()
 * @param setShowOverlay - State setter to show overlay
 */
export function goToDashboard(
    router: AppRouterInstance,
    setShowOverlay: (show: boolean) => void
) {
    setShowOverlay(true);
    router.push("/dashboard");
}
