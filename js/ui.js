import { DOM, state } from './state.js';
import { createSlug } from './utils.js';

/**
 * Toggles the sidebar visibility on mobile devices.
 */
export const toggleSidebar = () => {
    document.body.classList.toggle('sidebar-is-open');
};

/**
 * Closes the sidebar (for mobile).
 */
export const closeSidebar = () => {
    document.body.classList.remove('sidebar-is-open');
};

/**
 * Creates and populates the version selector dropdown.
 */
export const createVersionSelector = () => {
    const selected = document.createElement('div');
    selected.className = 'version-selected';
    selected.innerHTML = `
        <span>${state.currentVersion + (state.currentVersion === state.versionsConfig.latest ? ' (Latest)' : '')}</span>
        <i data-lucide="chevron-down"></i>
    `;

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'version-options';

    state.versionsConfig.versions.forEach(version => {
        const option = document.createElement('div');
        option.className = 'version-option';
        option.textContent = version + (version === state.versionsConfig.latest ? ' (Latest)' : '');
        option.dataset.value = version;
        option.addEventListener('click', () => {
            const firstPageSlug = createSlug(state.docPages[0]?.title || '');
            window.location.hash = `/${version}/${firstPageSlug}`;
            optionsContainer.classList.remove('is-open');
        });
        optionsContainer.appendChild(option);
    });

    DOM.versionSelectorContainer.innerHTML = '';
    DOM.versionSelectorContainer.appendChild(optionsContainer);
    DOM.versionSelectorContainer.appendChild(selected);

    lucide.createIcons();

    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        optionsContainer.classList.toggle('is-open');
    });

    document.addEventListener('click', () => optionsContainer.classList.remove('is-open'));
};

/**
 * Creates and populates the sidebar navigation.
 */
export const createSidebar = () => {
    if (!state.docPages.length) {
        DOM.sidebarNav.innerHTML = '<p>No navigation items found.</p>';
        return;
    }
    const navList = document.createElement('ul');
    state.docPages.forEach(page => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        const slug = createSlug(page.title);
        link.href = `#/${state.currentVersion}/${slug}`;
        link.textContent = page.title;
        link.dataset.slug = slug;

        // Close sidebar on mobile when clicking a link
        link.addEventListener('click', closeSidebar);

        listItem.appendChild(link);
        navList.appendChild(listItem);
    });
    DOM.sidebarNav.innerHTML = '';
    DOM.sidebarNav.appendChild(navList);
};

/**
 * Adds a "Copy" button to each code block.
 */
const addCopyButtonsToCodeBlocks = () => {
    DOM.contentWrapper.querySelectorAll('pre').forEach(block => {
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.setAttribute('aria-label', 'Copy code to clipboard');
        button.innerHTML = '<i data-lucide="copy"></i>';
        block.appendChild(button);

        button.addEventListener('click', () => {
            const code = block.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                button.innerHTML = '<i data-lucide="check"></i>';
                button.classList.add('copied');
                lucide.createIcons();
                setTimeout(() => {
                    button.innerHTML = '<i data-lucide="copy"></i>';
                    button.classList.remove('copied');
                    lucide.createIcons();
                }, 2000);
            });
        });
    });
    lucide.createIcons();
};

/**
 * Loads and displays the content of a markdown file.
 * @param {string} filePath - The path to the markdown file.
 */
export const loadContent = async (filePath) => {
    DOM.contentWrapper.classList.add('content-fade-out');
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`File not found: ${filePath}`);
        const markdown = await response.text();

        DOM.contentWrapper.innerHTML = marked.parse(markdown);
        DOM.contentWrapper.querySelectorAll('pre code').forEach(hljs.highlightElement);
        addCopyButtonsToCodeBlocks();
    } catch (error) {
        DOM.contentWrapper.innerHTML = `<h1>Error</h1><p>Could not load content.</p>`;
        console.error(error);
    } finally {
        DOM.contentWrapper.classList.remove('content-fade-out');
        DOM.contentWrapper.classList.add('content-fade-in');
        DOM.contentWrapper.addEventListener('animationend', () => {
            DOM.contentWrapper.classList.remove('content-fade-in');
        }, { once: true });
    }
};