# Velthoric API Documentation Template

This is a clean, responsive, and easy-to-use template for creating a static documentation website. It's built with vanilla JavaScript, requires no backend, and can be hosted on any static hosting service like GitHub Pages or Netlify.

## Features

-   **Version Control**: Easily manage and switch between different documentation versions (e.g., `3.2.5`, `3.2.4`) via a dropdown menu.
-   **Markdown-Based**: Write your documentation in simple Markdown files.
-   **Syntax Highlighting**: Code blocks are automatically highlighted using `highlight.js`.
-   **Responsive Design**: Looks great on desktop, tablets, and mobile devices.
-   **No Build Step**: Purely static. Just edit the files and deploy.
-   **Smooth Transitions**: Content fades in and out smoothly when navigating between pages.

## How to Use

1.  **Configure Versions**:
    -   Open `versions.json` in the root directory.
    -   Add your version numbers to the `versions` array.
    -   Set the `latest` property to the version you want to be the default.

2.  **Add Documentation for a Version**:
    -   Create a new folder inside `docs/` with your version name (e.g., `docs/3.3.0/`).
    -   Inside this new folder, create a `config.json` file. This file lists the pages for the sidebar navigation.
        ```json
        [
          {
            "title": "Introduction",
            "file": "01-introduction.md"
          },
          {
            "title": "Getting Started",
            "file": "02-getting-started.md"
          }
        ]
        ```
    -   Add your `.md` content files (like `01-introduction.md`) in the same folder.

3.  **Deploy**:
    -   That's it. Upload the entire project folder to any static web host.