document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const menuToggle = document.getElementById('menuToggle'); 
    const sidebarBackdrop = document.getElementById('sidebarBackdrop'); 
    const body = document.body; 

    const createSlug = (title) => title.toLowerCase().replace(/\s+/g, '-');

    function toggleSidebar() {
        sidebar.classList.toggle('is-open');
        sidebarBackdrop.classList.toggle('is-open');
        body.classList.toggle('no-scroll'); 
    }

    if (menuToggle && sidebar && sidebarBackdrop) {
        menuToggle.addEventListener('click', toggleSidebar);
        sidebarBackdrop.addEventListener('click', toggleSidebar);

        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768 && sidebar.classList.contains('is-open')) {
                    toggleSidebar();
                }
            });
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
                sidebarBackdrop.classList.remove('is-open');
                body.classList.remove('no-scroll');
            }
        });
    }

    const createSidebar = () => {

        if (typeof DOC_PAGES === 'undefined' || !Array.isArray(DOC_PAGES)) { 
             sidebar.innerHTML = '<p style="color: #ff6b6b;">Error: Could not load navigation config.</p>';
             console.error("DOC_PAGES is not defined or is not an array. Ensure js/config.js is loaded correctly and DOC_PAGES is an array.");
             return;
        }

        const navList = document.createElement('ul');
        DOC_PAGES.forEach(page => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');

            link.href = `#/${createSlug(page.title)}`;
            link.textContent = page.title;
            link.dataset.file = page.file; 

            listItem.appendChild(link);
            navList.appendChild(listItem);
        });
        sidebar.innerHTML = ''; 
        sidebar.appendChild(navList);
    };

    const loadContent = async (filePath) => {
        content.classList.add('content-fade-out');

        await new Promise(resolve => setTimeout(resolve, 250)); 

        try {
            const response = await fetch(filePath);
            if (!response.ok) {

                window.location.href = '404.html';
                return; 
            }
            const markdown = await response.text();

            content.classList.remove('content-fade-out');
            content.innerHTML = marked.parse(markdown);

            content.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            content.classList.add('content-fade-in');

            content.addEventListener('animationend', function handler() {
                content.classList.remove('content-fade-in');
                this.removeEventListener('animationend', handler); 
            }, { once: true }); 

        } catch (error) {
            console.error('Error loading page:', error);

            window.location.href = '404.html'; 

            content.classList.remove('content-fade-out', 'content-fade-in');
        }
    };

    const handleRouteChange = () => {

        if (typeof DOC_PAGES === 'undefined' || !Array.isArray(DOC_PAGES) || DOC_PAGES.length === 0) {
            console.error("DOC_PAGES not defined, not an array, or empty. Cannot route.");
            content.innerHTML = '<p style="color: #ff6b6b;">Error: Navigation data missing or invalid.</p>';
            return;
        }

        const hash = window.location.hash || `#/${createSlug(DOC_PAGES[0].title)}`;
        const slug = hash.substring(2); 

        const page = DOC_PAGES.find(p => createSlug(p.title) === slug);

        if (page) {
            loadContent(page.file);

            document.querySelectorAll('#sidebar a').forEach(link => {
                link.classList.remove('active');
                if (link.dataset.file === page.file) {
                    link.classList.add('active');
                }
            });
        } else {

            window.location.href = '404.html'; 
        }
    };

    const init = () => {
        createSidebar();
        handleRouteChange(); 
        window.addEventListener('hashchange', handleRouteChange); 
    };

    init();
});