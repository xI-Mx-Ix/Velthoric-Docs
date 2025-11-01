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
        DOM.contentWrapper.innerHTML = `<p>Error: Could not load versions configuration.</p>`;
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
        DOM.contentWrapper.innerHTML = `<p>Error: Could not load navigation for version ${version}.</p>`;
        console.error(error);
    }
};