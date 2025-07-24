import * as React from "react";
const MOBILE_BREAKPOINT = 768;
export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        // This function will only run on the client side
        const checkDevice = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        // Check on mount
        checkDevice();
        // Add event listener to check on resize
        window.addEventListener('resize', checkDevice);
        // Cleanup event listener on unmount
        return () => {
            window.removeEventListener('resize', checkDevice);
        };
    }, []);
    return isMobile;
}
