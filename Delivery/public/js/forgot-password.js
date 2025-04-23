document.getElementById("forgotForm").addEventListener("submit", function(e){
    e.preventDefault();
    Swal.fire('Email Sent!', 'Please check your email for reset instructions.', 'success');
});
