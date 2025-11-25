import { fetchVersions } from './api.js';
import { handleRouteChange } from './router.js';
import { toggleSidebar, closeSidebar } from './ui.js';
import { DOM } from './state.js';

/**
 * Main initialization function.
 */
const init = async () => {
    // 1. Load data and resolve route
    await fetchVersions();
    await handleRouteChange();

    // 2. Event Listeners
    window.addEventListener('hashchange', handleRouteChange);

    // Hijack the mobile menu button if it exists
    if (DOM.mobileMenuBtn) {
        DOM.mobileMenuBtn.onclick = null; // Remove inline HTML handler if present
        DOM.mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Close sidebar when clicking the overlay
    if (DOM.mobileOverlay) {
        DOM.mobileOverlay.addEventListener('click', closeSidebar);
    }
};

// Start the application once the DOM is ready
document.addEventListener('DOMContentLoaded', init);