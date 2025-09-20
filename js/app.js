document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const contentWrapper = document.querySelector('.content-wrapper');
    const versionSelectorContainer = document.getElementById('version-selector-container');
    const menuToggle = document.getElementById('menu-toggle');
    const mainView = document.querySelector('.main-view');

    let versionsConfig = {};
    let currentVersion = '';
    let docPages = [];

    const createSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const toggleSidebar = () => {
        document.body.classList.toggle('sidebar-is-open');
    };

    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    mainView.addEventListener('click', () => {
        if (window.innerWidth <= 768 && document.body.classList.contains('sidebar-is-open')) {
            toggleSidebar();
        }
    });

    sidebar.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && window.innerWidth <= 768) {
            if (document.body.classList.contains('sidebar-is-open')) {
                toggleSidebar();
            }
        }
    });

    const fetchVersions = async () => {
        try {
            const response = await fetch('versions.json');
            if (!response.ok) throw new Error('versions.json not found');
            versionsConfig = await response.json();
        } catch (error) {
            console.error('Failed to load versions config:', error);
            contentWrapper.innerHTML = '<p style="color: #ff6b6b;">Error: Could not load versions configuration.</p>';
        }
    };

    const fetchConfig = async (version) => {
        try {
            const response = await fetch(`docs/${version}/config.json`);
            if (!response.ok) throw new Error(`config.json for version ${version} not found`);
            docPages = await response.json();
        } catch (error) {
            console.error(`Failed to load config for version ${version}:`, error);
            docPages = [];
            contentWrapper.innerHTML = `<p style="color: #ff6b6b;">Error: Could not load navigation for version ${version}.</p>`;
        }
    };

    const createVersionSelector = () => {
        versionSelectorContainer.innerHTML = '';

        const selected = document.createElement('div');
        selected.className = 'version-selected';
        selected.textContent = currentVersion + (currentVersion === versionsConfig.latest ? ' (Latest)' : '');

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'version-options';

        versionsConfig.versions.forEach(version => {
            const option = document.createElement('div');
            option.className = 'version-option';
            option.textContent = version + (version === versionsConfig.latest ? ' (Latest)' : '');
            option.dataset.value = version;

            if (version === currentVersion) {
                option.classList.add('is-selected');
            }

            option.addEventListener('click', () => {
                const newVersion = option.dataset.value;
                if (newVersion !== currentVersion) {
                    const currentSlug = window.location.hash.substring(2).split('/')[1] || createSlug(docPages[0]?.title || '');
                    window.location.hash = `/${newVersion}/${currentSlug}`;
                }
                optionsContainer.classList.remove('is-open');
            });

            optionsContainer.appendChild(option);
        });

        versionSelectorContainer.appendChild(selected);
        versionSelectorContainer.appendChild(optionsContainer);

        selected.addEventListener('click', (e) => {
            e.stopPropagation();
            optionsContainer.classList.toggle('is-open');
        });

        document.addEventListener('click', (e) => {
            if (!versionSelectorContainer.contains(e.target)) {
                optionsContainer.classList.remove('is-open');
            }
        });
    };

    const createSidebar = () => {
        if (!docPages || docPages.length === 0) {
            sidebar.innerHTML = '<p style="color: #a9a9a9;">No navigation items found.</p>';
            return;
        }

        const navList = document.createElement('ul');
        docPages.forEach(page => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            const slug = createSlug(page.title);

            link.href = `#/${currentVersion}/${slug}`;
            link.textContent = page.title;
            link.dataset.file = page.file;
            link.dataset.slug = slug;

            listItem.appendChild(link);
            navList.appendChild(listItem);
        });
        sidebar.innerHTML = '';
        sidebar.appendChild(navList);
    };

    const loadContent = async (filePath) => {
        contentWrapper.classList.add('content-fade-out');
        await new Promise(resolve => setTimeout(resolve, 250));
        content.scrollTop = 0;

        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`File not found: ${filePath}`);

            const markdown = await response.text();

            contentWrapper.classList.remove('content-fade-out');
            contentWrapper.innerHTML = marked.parse(markdown);
            contentWrapper.querySelectorAll('pre code').forEach(hljs.highlightElement);

            contentWrapper.classList.add('content-fade-in');
            contentWrapper.addEventListener('animationend', () => {
                contentWrapper.classList.remove('content-fade-in');
            }, { once: true });

        } catch (error) {
            console.error('Error loading page:', error);
            contentWrapper.innerHTML = `<h1>Error</h1><p>Could not load content from <code>${filePath}</code>.</p>`;
            contentWrapper.classList.remove('content-fade-out', 'content-fade-in');
        }
    };

    const handleRouteChange = async () => {
        const hash = window.location.hash || `/${versionsConfig.latest}/${createSlug(docPages[0]?.title || 'introduction')}`;
        const [_, version, slug] = hash.split('/');
        const targetVersion = versionsConfig.versions.includes(version) ? version : versionsConfig.latest;

        if (targetVersion !== currentVersion) {
            currentVersion = targetVersion;
            await fetchConfig(currentVersion);
            createVersionSelector();
            createSidebar();
        }

        const targetSlug = slug || createSlug(docPages[0]?.title || '');
        const page = docPages.find(p => createSlug(p.title) === targetSlug);

        if (page) {
            const filePath = `docs/${currentVersion}/${page.file}`;
            loadContent(filePath);
            document.querySelectorAll('#sidebar a').forEach(link => {
                link.classList.toggle('active', link.dataset.slug === targetSlug);
            });
        } else {
            const firstPage = docPages[0];
            if (firstPage) {
                window.location.hash = `/${currentVersion}/${createSlug(firstPage.title)}`;
            } else {
                contentWrapper.innerHTML = '<h1>404 - Not Found</h1><p>The requested page does not exist in this version.</p>';
            }
        }
    };

    const init = async () => {
        await fetchVersions();
        if (!versionsConfig.versions || versionsConfig.versions.length === 0) return;

        const initialVersion = window.location.hash.split('/')[1] || versionsConfig.latest;
        currentVersion = versionsConfig.versions.includes(initialVersion) ? initialVersion : versionsConfig.latest;

        await fetchConfig(currentVersion);
        createVersionSelector();
        createSidebar();
        handleRouteChange();

        window.addEventListener('hashchange', handleRouteChange);
    };

    init();
});