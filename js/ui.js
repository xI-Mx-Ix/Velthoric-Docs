import { DOM, state } from './state.js';
import { createSlug } from './utils.js';

/**
 * Toggles the sidebar visibility on mobile devices.
 * Uses Tailwind utility classes for transitions.
 */
export const toggleSidebar = () => {
    if (DOM.sidebar && DOM.mobileOverlay) {
        // Toggle the translation class to slide in/out
        DOM.sidebar.classList.toggle('-translate-x-full');
        // Toggle visibility of the backdrop
        DOM.mobileOverlay.classList.toggle('hidden');
    }
};

/**
 * Closes the sidebar (for mobile).
 */
export const closeSidebar = () => {
    if (DOM.sidebar && DOM.mobileOverlay) {
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.mobileOverlay.classList.add('hidden');
    }
};

/**
 * Creates and populates the version selector dropdown.
 * Uses FontAwesome icons and Tailwind styling.
 */
export const createVersionSelector = () => {
    const isLatest = state.currentVersion === state.versionsConfig.latest;
    const labelText = `${state.currentVersion} ${isLatest ? '(Latest)' : ''}`;

    // Create the selected item display
    const selected = document.createElement('div');
    selected.className = 'version-selected group';
    selected.innerHTML = `
        <span class="font-mono text-cyan-400 font-bold tracking-tight">${labelText}</span>
        <i class="fas fa-chevron-down text-xs text-slate-500 group-hover:text-cyan-400 transition-transform duration-200"></i>
    `;

    // Create the dropdown container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'version-options';

    state.versionsConfig.versions.forEach(version => {
        const option = document.createElement('div');
        option.className = 'version-option flex items-center justify-between';

        // Add checkmark if active
        const activeIcon = version === state.currentVersion
            ? '<i class="fas fa-check text-cyan-500 text-xs"></i>'
            : '';

        option.innerHTML = `
            <span>${version} ${version === state.versionsConfig.latest ? '(Latest)' : ''}</span>
            ${activeIcon}
        `;

        option.addEventListener('click', () => {
            const firstPageSlug = createSlug(state.docPages[0]?.title || '');
            window.location.hash = `/${version}/${firstPageSlug}`;
            optionsContainer.classList.remove('is-open');

            // Rotate arrow back
            const arrow = selected.querySelector('.fa-chevron-down');
            if(arrow) arrow.style.transform = 'rotate(0deg)';
        });

        optionsContainer.appendChild(option);
    });

    // Clear and Append
    DOM.versionSelectorContainer.innerHTML = '';
    DOM.versionSelectorContainer.appendChild(optionsContainer);
    DOM.versionSelectorContainer.appendChild(selected);

    // Toggle Logic
    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = optionsContainer.classList.contains('is-open');
        const arrow = selected.querySelector('.fa-chevron-down');

        if (isOpen) {
            optionsContainer.classList.remove('is-open');
            arrow.style.transform = 'rotate(0deg)';
        } else {
            optionsContainer.classList.add('is-open');
            arrow.style.transform = 'rotate(180deg)';
        }
    });

    // Close when clicking elsewhere
    document.addEventListener('click', () => {
        optionsContainer.classList.remove('is-open');
        const arrow = selected.querySelector('.fa-chevron-down');
        if(arrow) arrow.style.transform = 'rotate(0deg)';
    });
};

/**
 * Creates and populates the sidebar navigation links.
 */
export const createSidebar = () => {
    if (!state.docPages.length) {
        DOM.sidebarNav.innerHTML = '<p class="text-slate-500 text-sm italic p-4">No navigation items found.</p>';
        return;
    }

    const navList = document.createElement('ul');
    navList.className = 'space-y-1'; // Tailwind spacing

    state.docPages.forEach(page => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        const slug = createSlug(page.title);

        link.href = `#/${state.currentVersion}/${slug}`;
        link.dataset.slug = slug;

        // Base content
        link.innerHTML = `<i class="fas fa-file-alt mr-3 text-xs opacity-50"></i>${page.title}`;

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
 * Uses absolute positioning and FontAwesome icons.
 */
const addCopyButtonsToCodeBlocks = () => {
    DOM.contentWrapper.querySelectorAll('pre').forEach(block => {
        // Ensure parent is relative for absolute positioning of button
        block.style.position = 'relative';

        const button = document.createElement('button');
        // Tailwind classes for the button styling
        button.className = 'absolute top-3 right-3 p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100';
        button.setAttribute('aria-label', 'Copy code');
        button.innerHTML = '<i class="far fa-copy"></i>';

        // Make the pre block a group so the button appears on hover
        block.classList.add('group');
        block.appendChild(button);

        button.addEventListener('click', () => {
            const code = block.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                // Success State
                button.innerHTML = '<i class="fas fa-check text-emerald-400"></i>';
                button.classList.add('border-emerald-500/50', 'bg-emerald-500/10');

                setTimeout(() => {
                    // Revert State
                    button.innerHTML = '<i class="far fa-copy"></i>';
                    button.classList.remove('border-emerald-500/50', 'bg-emerald-500/10');
                }, 2000);
            });
        });
    });
};

/**
 * Loads and displays the content of a markdown file.
 * Handles fade transitions and syntax highlighting.
 * @param {string} filePath - The path to the markdown file.
 */
export const loadContent = async (filePath) => {
    // Start Fade Out
    DOM.contentWrapper.classList.add('opacity-0', 'translate-y-2');
    DOM.contentWrapper.classList.remove('opacity-100', 'translate-y-0');

    await new Promise(resolve => setTimeout(resolve, 200));

    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`File not found: ${filePath}`);
        const markdown = await response.text();

        // Parse Markdown
        DOM.contentWrapper.innerHTML = marked.parse(markdown);

        // Apply Syntax Highlighting
        DOM.contentWrapper.querySelectorAll('pre code').forEach(hljs.highlightElement);

        // Add functional UI elements to the generated content
        addCopyButtonsToCodeBlocks();

    } catch (error) {
        DOM.contentWrapper.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-slate-500">
                <i class="fas fa-bug text-4xl mb-4 text-red-500/50"></i>
                <h1 class="text-xl font-bold text-slate-300">Content Error</h1>
                <p>Unable to load the requested documentation.</p>
            </div>
        `;
        console.error(error);
    } finally {
        // Start Fade In
        // Small delay to ensure DOM render
        requestAnimationFrame(() => {
            DOM.contentWrapper.classList.remove('opacity-0', 'translate-y-2');
            DOM.contentWrapper.classList.add('opacity-100', 'translate-y-0', 'transition-all', 'duration-500', 'ease-out');
        });
    }
};