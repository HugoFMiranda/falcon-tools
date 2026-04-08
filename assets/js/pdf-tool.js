document.addEventListener('DOMContentLoaded', () => {
    const placeholder = document.querySelector('.workspace-card');

    if (!placeholder) {
        return;
    }

    placeholder.insertAdjacentHTML(
        'beforeend',
        '<p class="tool-note">The interactive PDF workflow is added in the next implementation step.</p>'
    );
});
