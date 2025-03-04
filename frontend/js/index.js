// Load navbar
$(document).ready(function() {
    $("#navbar-container").load("navbar.html");
    
    // Simple animation when content cards enter viewport
    const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
    if (entry.isIntersecting) {
        entry.target.style.opacity = 1;
        entry.target.style.transform = "translateY(0)";
    }
    });
});

document.querySelectorAll('.content-card').forEach(card => {
    card.style.opacity = 0;
    card.style.transform = "translateY(30px)";
    card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(card);
    });
});