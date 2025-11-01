import { fetchVersions } from './api.js';
import { handleRouteChange } from './router.js';
import { toggleSidebar } from './ui.js';

// Get DOM elements
const menuToggle = document.getElementById('menu-toggle');

/**
 * Main initialization function.
 */
const init = async () => {
    // Fetch version info and then handle the initial route
    await fetchVersions();
    await handleRouteChange();

    // Setup event listeners
    window.addEventListener('hashchange', handleRouteChange);
    menuToggle.addEventListener('click', toggleSidebar);

    // Initial icon rendering
    lucide.createIcons();
};

// Start the application once the DOM is ready
document.addEventListener('DOMContentLoaded', init);