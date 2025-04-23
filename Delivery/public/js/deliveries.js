function updateStatus(orderId) {
    Swal.fire({
        title: 'Status Updated!',
        text: orderId + ' status changed successfully!',
        icon: 'success',
        confirmButtonText: 'OK'
    });
}
