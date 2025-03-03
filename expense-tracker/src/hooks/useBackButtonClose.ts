import { useEffect } from "react";

interface UseBackButtonCloseParams {
  onClose: () => void;
}

export const useBackButtonClose = ({ onClose }: UseBackButtonCloseParams) => {
  useEffect(() => {
    // Create a function to handle the popstate event
    const handlePopState = (event: PopStateEvent) => {
      // Call the onClose function when back button is pressed
      onClose();
    };

    // Push a new state to the history before setting up the listener
    // This ensures we have a state to go "back" to
    window.history.pushState({ page: "analytics" }, "");

    // Add event listener for the popstate event (triggered by back button)
    window.addEventListener("popstate", handlePopState);

    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [onClose]);
};