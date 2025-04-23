function togglePassword(id, el) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        el.textContent = "🙈";
    } else {
        input.type = "password";
        el.textContent = "👁️";
    }
}

document.getElementById("loginForm").addEventListener("submit", function(e){
    e.preventDefault();
    
    const deliveryId = document.getElementById("deliveryId").value;
    localStorage.setItem("deliveryId", deliveryId);

    window.location.href = "dashboard.html"; 
});
