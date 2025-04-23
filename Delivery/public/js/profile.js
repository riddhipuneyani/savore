window.onload = function() {
    const savedDeliveryId = localStorage.getItem("deliveryId") || "DEL123456";
    const savedPhone = localStorage.getItem("phone") || "+91 8989898989";

    document.getElementById("deliveryId").textContent = savedDeliveryId;
    document.getElementById("phone").textContent = savedPhone;
};

function logout() {
    window.location.href = "login.html";
}
