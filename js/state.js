// Centralized DOM element references
export const DOM = {
    sidebarNav: document.getElementById('sidebar-nav'),
    contentWrapper: document.querySelector('.content-wrapper'),
    versionSelectorContainer: document.getElementById('version-selector-container'),
};

// Centralized application state
export const state = {
    versionsConfig: {},
    currentVersion: '',
    docPages: [],
};