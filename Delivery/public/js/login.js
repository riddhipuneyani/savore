function togglePassword(id, el) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        el.textContent = "🙈"; // monkey closed eyes
    } else {
        input.type = "password";
        el.textContent = "👁️"; // eye open
    }
}

document.getElementById("loginForm").addEventListener("submit", function(e){
    e.preventDefault();
    window.location.href = "dashboard.html"; 
});
