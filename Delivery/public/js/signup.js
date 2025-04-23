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

document.getElementById("signupForm").addEventListener("submit", function(e){
    e.preventDefault();
    Swal.fire('Success!', 'Your account has been created!', 'success');
});
