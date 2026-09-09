"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Hook to automatically hide navigation overlay when route changes
 * @param setShow - State setter function to control overlay visibility
 */
export default function useNavigationOverlay(setShow: (show: boolean) => void) {
    const pathname = usePathname();

    useEffect(() => {
        // Whenever route changes, hide overlay
        setShow(false);
    }, [pathname, setShow]);
}
