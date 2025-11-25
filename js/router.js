import { fetchConfig } from './api.js';
import { createVersionSelector, createSidebar, loadContent } from './ui.js';
import { state } from './state.js';
import { createSlug } from './utils.js';

/**
 * Handles routing based on the URL hash.
 * Parses #/version/slug structure.
 */
export const handleRouteChange = async () => {
    if (!state.versionsConfig.versions?.length) return;

    const defaultSlug = createSlug(state.docPages[0]?.title || 'introduction');
    const hash = window.location.hash || `/${state.versionsConfig.latest}/${defaultSlug}`;

    // Remove leading # if present
    const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
    const parts = cleanHash.split('/').filter(p => p); // Filter removes empty strings

    // Parse version
    let version = parts[0];
    let slug = parts[1];

    // Validate version, fallback to latest if invalid
    const isVersionValid = state.versionsConfig.versions.includes(version);
    const newVersion = isVersionValid ? version : state.versionsConfig.latest;

    // If version changed, reload config and UI
    if (newVersion !== state.currentVersion) {
        state.currentVersion = newVersion;
        await fetchConfig(state.currentVersion);
        createVersionSelector();
        createSidebar();
    }

    // Determine target page
    const targetSlug = slug || createSlug(state.docPages[0]?.title || '');
    const page = state.docPages.find(p => createSlug(p.title) === targetSlug);

    if (page) {
        await loadContent(`docs/${state.currentVersion}/${page.file}`);

        // Update Active State in Sidebar
        document.querySelectorAll('#sidebar-nav a').forEach(link => {
            const isActive = link.dataset.slug === targetSlug;
            link.classList.toggle('active', isActive);
            // Apply text color highlighting for active state manually if needed,
            // though style.css handles .active class.
        });
    } else if (state.docPages.length > 0) {
        // Redirect to default if page not found
        window.location.hash = `/${state.currentVersion}/${createSlug(state.docPages[0].title)}`;
    }
};