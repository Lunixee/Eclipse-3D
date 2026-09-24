/* Public repository links used by the website. */
const publicLinks = {
    source: 'https://github.com/Lunixee/Eclipse-3D',
    releases: 'https://github.com/Lunixee/Eclipse-3D/releases'
};

for (const link of document.querySelectorAll('[data-public-link]')) {
    const destination = publicLinks[link.dataset.publicLink];
    if (!destination) continue;
    const url = new URL(destination);
    if (url.protocol !== 'https:') continue;
    link.href = url.href;
    if (link.hasAttribute('data-pending-label')) {
        link.textContent = link.dataset.publicLink === 'source' ? 'Browse the repository ↗' : 'View releases ↗';
    }
}
