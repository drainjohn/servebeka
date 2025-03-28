function loadModal(modalId, contentFn) {
    const modal = document.getElementById(modalId);
    modal.innerHTML = contentFn();
    modal.style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}