export const modelSelectionCancelled = () => new DOMException('Model import cancelled. Choose a file to try again.', 'AbortError');

export const chooseLocalModelFile = (Scratch, signal) => new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || !document.body) {
        reject(new Error('Local model selection is unavailable in this runtime'));
        return;
    }
    if (signal.aborted) { reject(modelSelectionCancelled()); return; }

    const previousFocus = document.activeElement;
    const outer = document.createElement('div');
    outer.dataset.eclipseModelPicker = '';
    Object.assign(outer.style, {width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0008', pointerEvents: 'auto', colorScheme: 'light', zIndex: '1000'});
    const panel = document.createElement('div');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Import 3D model');
    Object.assign(panel.style, {background: 'white', color: '#222', borderRadius: '12px', padding: '20px',
        maxWidth: '300px', textAlign: 'center', font: '14px sans-serif', border: '2px dashed #888'});
    const title = document.createElement('p');
    title.textContent = 'Choose or drop a 3D model';
    const hint = document.createElement('p');
    hint.textContent = '.glb or self-contained .gltf';
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.textContent = 'Choose model file';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    for (const button of [choose, cancel]) Object.assign(button.style, {font: 'inherit', padding: '8px 12px', margin: '4px', cursor: 'pointer'});
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf,model/gltf-binary,model/gltf+json';
    input.hidden = true;
    panel.append(title, hint, choose, cancel, input);
    outer.append(panel);
    const renderer = Scratch.vm?.renderer ?? Scratch.vm?.runtime?.renderer;
    const useOverlay = typeof renderer?.addOverlay === 'function' && typeof renderer?.removeOverlay === 'function';
    let settled = false;
    const finish = (file, error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        document.removeEventListener('keydown', keydown, true);
        input.onchange = input.oncancel = null;
        choose.onclick = cancel.onclick = outer.onclick = null;
        outer.ondragover = outer.ondrop = null;
        if (useOverlay) renderer.removeOverlay(outer);
        outer.remove();
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        if (error) reject(error);
        else resolve(file);
    };
    const abort = () => finish(null, modelSelectionCancelled());
    const selected = files => {
        if (!files?.length) { abort(); return; }
        if (files.length !== 1 || !/\.(glb|gltf)$/i.test(files[0].name)) {
            finish(null, new Error('Choose one .glb or self-contained .gltf model file.'));
            return;
        }
        finish(files[0], null);
    };
    const keydown = event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); abort(); }
        if (event.key === 'Tab') {
            event.preventDefault();
            (document.activeElement === choose ? cancel : choose).focus();
        }
    };
    // the button gives safari a real user gesture; cancel stays available on older browsers
    choose.onclick = () => input.click();
    cancel.onclick = abort;
    input.onchange = () => selected(input.files);
    input.oncancel = abort;
    outer.onclick = event => { if (event.target === outer) abort(); };
    outer.ondragover = event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; };
    outer.ondrop = event => { event.preventDefault(); selected(event.dataTransfer?.files); };
    signal.addEventListener('abort', abort, {once: true});
    document.addEventListener('keydown', keydown, true);
    if (useOverlay) renderer.addOverlay(outer, 'scale');
    else {
        Object.assign(outer.style, {position: 'fixed', inset: '0'});
        document.body.append(outer);
    }
    choose.focus();
});
