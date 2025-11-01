/**
 * Creates a URL-friendly slug from a string.
 * @param {string} title - The string to slugify.
 * @returns {string} The slugified string.
 */
export const createSlug = (title) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};