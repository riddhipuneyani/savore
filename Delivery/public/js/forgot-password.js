document.getElementById("forgotForm").addEventListener("submit", function(e){
    e.preventDefault();
    Swal.fire('Message Sent!', 'Please check your phone for reset instructions.', 'success');
});
