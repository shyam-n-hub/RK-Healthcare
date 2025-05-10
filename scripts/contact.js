document.addEventListener('DOMContentLoaded', () => {
  // Update navigation based on authentication state
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in, update navigation
      database.ref('users/' + user.uid).once('value')
        .then((snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            const userRole = userData.role;
            // Update navigation for logged in state
            updateNavigation(true, userRole);
          }
        })
        .catch((error) => {
          console.error("Error getting user data:", error);
        });
    } else {
      // User is signed out, update navigation for logged out state
      updateNavigation(false);
    }
  });

  const contactForm = document.getElementById('contactForm');
  
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Get form values
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const subject = document.getElementById('subject').value;
      const message = document.getElementById('message').value;
      
      // Create a messages reference in Firebase
      const messagesRef = database.ref('contactMessages');
      
      // Add user ID if logged in
      const userId = auth.currentUser ? auth.currentUser.uid : null;
      
      messagesRef.push({
        name,
        email,
        subject,
        message,
        userId,
        timestamp: Date.now()
      })
      .then(() => {
        alert("Message sent successfully! We'll get back to you soon.");
        contactForm.reset();
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        alert("Error sending message. Please try again later.");
      });
    });
  }
});