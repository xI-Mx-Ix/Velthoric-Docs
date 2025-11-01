import { fetchConfig } from './api.js';
import { createVersionSelector, createSidebar, loadContent } from './ui.js';
import { state } from './state.js';
import { createSlug } from './utils.js';

/**
 * Handles routing based on the URL hash.
 */
export const handleRouteChange = async () => {
    if (!state.versionsConfig.versions?.length) return;

    const defaultSlug = createSlug(state.docPages[0]?.title || 'introduction');
    const hash = window.location.hash || `/${state.versionsConfig.latest}/${defaultSlug}`;
    const [_, version, slug] = hash.split('/');

    const newVersion = state.versionsConfig.versions.includes(version) ? version : state.versionsConfig.latest;

    if (newVersion !== state.currentVersion) {
        state.currentVersion = newVersion;
        await fetchConfig(state.currentVersion);
        createVersionSelector();
        createSidebar();
    }

    const targetSlug = slug || createSlug(state.docPages[0]?.title || '');
    const page = state.docPages.find(p => createSlug(p.title) === targetSlug);

    if (page) {
        await loadContent(`docs/${state.currentVersion}/${page.file}`);
        document.querySelectorAll('#sidebar-nav a').forEach(link => {
            link.classList.toggle('active', link.dataset.slug === targetSlug);
        });
    } else if (state.docPages.length > 0) {
        // Redirect to the first page of the current version if the slug is invalid
        window.location.hash = `/${state.currentVersion}/${createSlug(state.docPages[0].title)}`;
    }
};