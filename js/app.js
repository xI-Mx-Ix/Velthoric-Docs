document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');

    const createSlug = (title) => title.toLowerCase().replace(/\s+/g, '-');

    const createSidebar = () => {
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
                throw new Error(`Could not load file: ${filePath}`);
            }
            const markdown = await response.text();

            content.classList.remove('content-fade-out');
            content.innerHTML = marked.parse(markdown);

            content.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            content.classList.add('content-fade-in');

            content.addEventListener('animationend', () => {
                content.classList.remove('content-fade-in');
            }, { once: true }); 

        } catch (error) {
            console.error('Error loading page:', error);
            content.innerHTML = `<p style="color: #ff6b6b;">Error: Could not load content. Please check the console.</p>`;

            content.classList.remove('content-fade-out', 'content-fade-in');
        }
    };

    const handleRouteChange = () => {
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

            loadContent(DOC_PAGES[0].file);
            document.querySelector('#sidebar a').classList.add('active');
        }
    };

    const init = () => {
        createSidebar();
        handleRouteChange(); 
        window.addEventListener('hashchange', handleRouteChange); 
    };

    init();
});