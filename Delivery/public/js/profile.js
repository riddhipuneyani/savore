window.onload = function() {
    const savedEmail = localStorage.getItem("email");
    const savedPhone = localStorage.getItem("phone");

    if (savedEmail) {
        document.getElementById("email").value = savedEmail;
    } else {
        document.getElementById("email").value = "johndoe@example.com";
    }

    if (savedPhone) {
        document.getElementById("phone").value = savedPhone;
    } else {
        document.getElementById("phone").value = "+91 8989898989";
    }
};

function saveProfile() {
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;

    localStorage.setItem("email", email);
    localStorage.setItem("phone", phone);

    alert("Profile updated successfully!");
}

function openPasswordModal() {
    document.getElementById("passwordModal").style.display = "block";
}

function changePassword() {
    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const savedPassword = localStorage.getItem("password");

    if (oldPassword !== savedPassword) {
        alert("Incorrect old password!");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("New passwords do not match!");
        return;
    }

    if (newPassword.length < 6) {
        alert("New password should be at least 6 characters!");
        return;
    }

    localStorage.setItem("password", newPassword);
    alert("Password changed successfully!");

    document.getElementById("passwordModal").style.display = "none";
    document.getElementById("oldPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
}

function logout() {
    window.location.href = "login.html";
}

window.onclick = function(event) {
    const modal = document.getElementById("passwordModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
};
