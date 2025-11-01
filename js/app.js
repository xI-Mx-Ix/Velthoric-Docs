/**
 * Initializes the documentation page, handling version selection,
 * sidebar navigation, and content loading.
 */
document.addEventListener('DOMContentLoaded', () => {
    const sidebarNav = document.getElementById('sidebar-nav');
    const contentWrapper = document.querySelector('.content-wrapper');
    const versionSelectorContainer = document.getElementById('version-selector-container');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    let versionsConfig = {};
    let currentVersion = '';
    let docPages = [];

    /**
     * Creates a URL-friendly slug from a string.
     * @param {string} title - The string to slugify.
     * @returns {string} The slugified string.
     */
    const createSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    /**
     * Toggles the sidebar visibility on mobile devices.
     */
    const toggleSidebar = () => {
        document.body.classList.toggle('sidebar-is-open');
    };

    menuToggle.addEventListener('click', toggleSidebar);

    /**
     * Fetches the versions configuration file.
     */
    const fetchVersions = async () => {
        try {
            const response = await fetch('versions.json');
            if (!response.ok) throw new Error('versions.json not found');
            versionsConfig = await response.json();
        } catch (error) {
            contentWrapper.innerHTML = '<p>Error: Could not load versions configuration.</p>';
        }
    };

    /**
     * Fetches the configuration file for a specific version.
     * @param {string} version - The documentation version.
     */
    const fetchConfig = async (version) => {
        try {
            const response = await fetch(`docs/${version}/config.json`);
            if (!response.ok) throw new Error(`config.json for version ${version} not found`);
            docPages = await response.json();
        } catch (error) {
            docPages = [];
            contentWrapper.innerHTML = `<p>Error: Could not load navigation for version ${version}.</p>`;
        }
    };

    /**
     * Creates and populates the version selector dropdown.
     */
    const createVersionSelector = () => {
        const selected = document.createElement('div');
        selected.className = 'version-selected';
        selected.innerHTML = `
            <span>${currentVersion + (currentVersion === versionsConfig.latest ? ' (Latest)' : '')}</span>
            <i data-lucide="chevron-down"></i>
        `;

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'version-options';

        versionsConfig.versions.forEach(version => {
            const option = document.createElement('div');
            option.className = 'version-option';
            option.textContent = version + (version === versionsConfig.latest ? ' (Latest)' : '');
            option.dataset.value = version;
            option.addEventListener('click', () => {
                window.location.hash = `/${version}/${createSlug(docPages[0]?.title || '')}`;
                optionsContainer.classList.remove('is-open');
            });
            optionsContainer.appendChild(option);
        });

        versionSelectorContainer.innerHTML = '';
        versionSelectorContainer.appendChild(optionsContainer);
        versionSelectorContainer.appendChild(selected);

        lucide.createIcons();

        selected.addEventListener('click', (e) => {
            e.stopPropagation();
            optionsContainer.classList.toggle('is-open');
        });

        document.addEventListener('click', () => {
            optionsContainer.classList.remove('is-open');
        });
    };

    /**
     * Creates and populates the sidebar navigation.
     */
    const createSidebar = () => {
        if (!docPages.length) {
            sidebarNav.innerHTML = '<p>No navigation items found.</p>';
            return;
        }

        const navList = document.createElement('ul');
        docPages.forEach(page => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            const slug = createSlug(page.title);
            link.href = `#/${currentVersion}/${slug}`;
            link.textContent = page.title;
            link.dataset.slug = slug;
            listItem.appendChild(link);
            navList.appendChild(listItem);
        });
        sidebarNav.innerHTML = '';
        sidebarNav.appendChild(navList);
    };

    /**
     * Adds a "Copy" button to each code block.
     */
    const addCopyButtonsToCodeBlocks = () => {
        const codeBlocks = contentWrapper.querySelectorAll('pre');
        codeBlocks.forEach(block => {
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
                    lucide.createIcons(); // Render the new 'check' icon

                    setTimeout(() => {
                        button.innerHTML = '<i data-lucide="copy"></i>';
                        button.classList.remove('copied');
                        lucide.createIcons(); // Render the 'copy' icon again
                    }, 2000);
                });
            });
        });
        lucide.createIcons();
    };

    /**
     * Loads and displays the content of a markdown file with animations.
     * @param {string} filePath - The path to the markdown file.
     */
    const loadContent = async (filePath) => {
        contentWrapper.classList.add('content-fade-out');
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`File not found: ${filePath}`);
            const markdown = await response.text();

            contentWrapper.classList.remove('content-fade-out');
            contentWrapper.innerHTML = marked.parse(markdown);
            contentWrapper.querySelectorAll('pre code').forEach(hljs.highlightElement);
            addCopyButtonsToCodeBlocks();

            contentWrapper.classList.add('content-fade-in');
            contentWrapper.addEventListener('animationend', () => {
                contentWrapper.classList.remove('content-fade-in');
            }, { once: true });

        } catch (error) {
            contentWrapper.innerHTML = `<h1>Error</h1><p>Could not load content.</p>`;
            contentWrapper.classList.remove('content-fade-out', 'content-fade-in');
        }
    };

    /**
     * Handles routing based on the URL hash.
     */
    const handleRouteChange = async () => {
        const hash = window.location.hash || `/${versionsConfig.latest}/${createSlug(docPages[0]?.title || 'introduction')}`;
        const [_, version, slug] = hash.split('/');

        if (version !== currentVersion) {
            currentVersion = versionsConfig.versions.includes(version) ? version : versionsConfig.latest;
            await fetchConfig(currentVersion);
            createVersionSelector();
            createSidebar();
        }

        const targetSlug = slug || createSlug(docPages[0]?.title || '');
        const page = docPages.find(p => createSlug(p.title) === targetSlug);

        if (page) {
            await loadContent(`docs/${currentVersion}/${page.file}`);
            document.querySelectorAll('#sidebar-nav a').forEach(link => {
                link.classList.toggle('active', link.dataset.slug === targetSlug);
            });
        } else if (docPages.length > 0) {
            window.location.hash = `/${currentVersion}/${createSlug(docPages[0].title)}`;
        }
    };

    /**
     * Main initialization function.
     */
    const init = async () => {
        await fetchVersions();
        if (!versionsConfig.versions?.length) return;

        currentVersion = window.location.hash.split('/')[1] || versionsConfig.latest;
        await fetchConfig(currentVersion);

        createVersionSelector();
        createSidebar();
        await handleRouteChange();

        lucide.createIcons();

        window.addEventListener('hashchange', handleRouteChange);
    };

    init();
});