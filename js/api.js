import { DOM, state } from './state.js';

/**
 * Fetches the versions configuration file.
 */
export const fetchVersions = async () => {
    try {
        const response = await fetch('versions.json');
        if (!response.ok) throw new Error('versions.json not found');
        state.versionsConfig = await response.json();
    } catch (error) {
        DOM.contentWrapper.innerHTML = `
            <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
                <i class="fas fa-exclamation-triangle mb-2"></i>
                <p class="font-bold">System Error</p>
                <p class="text-sm">Could not load versions configuration.</p>
            </div>
        `;
        console.error(error);
    }
};

/**
 * Fetches the configuration file for a specific version.
 * @param {string} version - The documentation version.
 */
export const fetchConfig = async (version) => {
    try {
        const response = await fetch(`docs/${version}/config.json`);
        if (!response.ok) throw new Error(`config.json for version ${version} not found`);
        state.docPages = await response.json();
    } catch (error) {
        state.docPages = [];
        DOM.contentWrapper.innerHTML = `
            <div class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-center">
                <i class="fas fa-unlink mb-2"></i>
                <p class="font-bold">Navigation Error</p>
                <p class="text-sm">Could not load navigation for version ${version}.</p>
            </div>
        `;
        console.error(error);
    }
};