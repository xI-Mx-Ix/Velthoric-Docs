/**
 * Centralized DOM element references.
 * Matches the IDs defined in the new Tailwind HTML structure.
 */
export const DOM = {
    // The sidebar navigation container
    sidebarNav: document.getElementById('sidebar-nav'),

    // The main content area where Markdown is injected (<article id="content">)
    contentWrapper: document.getElementById('content'),

    // The container for the version dropdown
    versionSelectorContainer: document.getElementById('version-selector-container'),

    // Mobile specific elements
    sidebar: document.getElementById('sidebar'),
    mobileOverlay: document.getElementById('mobile-overlay'),

    // Targets the mobile menu button (font awesome icon wrapper)
    mobileMenuBtn: document.querySelector('.fa-bars')?.parentElement || document.querySelector('button[onclick="toggleMobileMenu()"]'),
};

/**
 * Centralized application state.
 */
export const state = {
    versionsConfig: {},
    currentVersion: '',
    docPages: [],
};