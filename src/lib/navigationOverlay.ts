export function showNavOverlay() {
    console.log('showNavOverlay called');
    const el = document.getElementById("nav-overlay");
    console.log('Overlay element found:', el);
    if (el) {
        console.log('Setting display to flex');
        el.style.display = "flex";
        console.log('Overlay display set to:', el.style.display);
    } else {
        console.error('nav-overlay element not found in DOM!');
    }
}

export function hideNavOverlay() {
    const el = document.getElementById("nav-overlay");
    if (el) {
        el.style.display = "none";
    }
}
