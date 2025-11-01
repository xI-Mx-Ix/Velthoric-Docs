import { fetchVersions } from './api.js';
import { handleRouteChange } from './router.js';
import { toggleSidebar, closeSidebar } from './ui.js';

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

    // Close sidebar when clicking on overlay (mobile)
    document.body.addEventListener('click', (e) => {
        if (e.target === document.body && document.body.classList.contains('sidebar-is-open')) {
            closeSidebar();
        }
    });

    // Close sidebar when clicking on the overlay pseudo-element
    window.addEventListener('click', (e) => {
        if (document.body.classList.contains('sidebar-is-open') &&
            !document.getElementById('sidebar').contains(e.target) &&
            !menuToggle.contains(e.target)) {
            closeSidebar();
        }
    });

    // Initial icon rendering
    lucide.createIcons();
};

// Start the application once the DOM is ready
document.addEventListener('DOMContentLoaded', init);