// ⚠️ Restaurer **avant** de rendre le focus au déclencheur, sinon il tombe sur `<body>`.
export function inertOutside(el) {
    const touched = [];
    for (let node = el; node?.parentElement && node !== document.body; node = node.parentElement) {
        for (const sibling of node.parentElement.children) {
            if (sibling === node || sibling.inert) continue;
            sibling.inert = true;
            touched.push(sibling);
        }
    }
    return () => {
        for (const sibling of touched) sibling.inert = false;
    };
}
