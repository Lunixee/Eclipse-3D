// Public release links used by the Eclipse 3D palette buttons.
// exampleProject is the hosted first-person-knife.sb3 file, not a repository page.
export const PUBLIC_LINKS = {
    documentation: 'https://lunixee.github.io/Eclipse-3D/docs/',
    exampleProject: 'https://lunixee.github.io/Eclipse-3D/examples/first-person-knife/first-person-knife.sb3',
    website: 'https://lunixee.github.io/Eclipse-3D/'
};

export const PALETTE_BUTTONS = [
    {text: 'Documentation', func: 'openDocumentation'},
    {text: 'Example Project', func: 'openExampleProject'},
    {text: 'Website', func: 'openWebsite'}
];

/** @param {keyof typeof PUBLIC_LINKS} key */
export function openPublicLink(key, links = PUBLIC_LINKS, host = typeof window === 'undefined' ? null : window) {
    if (!host) return;
    const label = key === 'exampleProject' ? 'Example Project' : key === 'documentation' ? 'Documentation' : 'Website';
    const notice = () => host.alert(`${label} URL is not configured yet.`);
    if (!links[key]) { notice(); return; }
    try {
        let target = new URL(links[key]);
        if (target.protocol !== 'https:' && target.protocol !== 'http:') { notice(); return; }
        if (key === 'exampleProject') {
            const current = new URL(host.location.href);
            const editor = current.protocol === 'https:' && current.hostname === 'turbowarp.org' &&
                (current.pathname === '/' || current.pathname === '/editor') ? current : new URL('https://turbowarp.org/');
            editor.searchParams.set('project_url', target.href);
            target = editor;
        }
        // Palette clicks are user gestures: open synchronously, as Simple3D does.
        host.open(target.href, '_blank', 'noopener');
    } catch {
        notice();
    }
}
