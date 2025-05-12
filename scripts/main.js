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

  // Function to update navigation based on auth state
  window.updateNavigation = function(isLoggedIn, role = null) {
    const navElement = document.querySelector('nav ul');
    if (!navElement) return;
    
    // Get current page to highlight active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (isLoggedIn) {
      // Update navigation for logged in users
      const dashboardLink = role === 'patient' ? 'patient-dashboard.html' : 'doctor-dashboard.html';
      
      navElement.innerHTML = `
        <li><a href="index.html" ${currentPage === 'index.html' ? 'class="active"' : ''}>Home</a></li>
        <li><a href="${dashboardLink}" ${currentPage.includes('dashboard') ? 'class="active"' : ''}>Dashboard</a></li>
        <li><a href="contact.html" ${currentPage === 'contact.html' ? 'class="active"' : ''}>Contact</a></li>
        <li><a href="#" id="logout">Logout</a></li>
      `;
      
      // Reattach logout event listener
      const newLogoutButton = document.getElementById('logout');
      if (newLogoutButton) {
        newLogoutButton.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Confirmation dialog
          if (confirm("Are you sure you want to logout?")) {
            auth.signOut().then(() => {
              window.location.href = 'index.html';
            }).catch((error) => {
              console.error("Error signing out:", error);
            });
          }
        });
      }
    } else {
      // Update navigation for logged out users
      navElement.innerHTML = `
        <li><a href="index.html" ${currentPage === 'index.html' ? 'class="active"' : ''}>Home</a></li>
         <li><a href="login.html" ${currentPage === 'login.html' ? 'class="active"' : ''}>Login</a></li>
         <li><a href="signup.html" ${currentPage === 'signup.html' ? 'class="active"' : ''}>Signup</a></li>
        <li><a href="contact.html" ${currentPage === 'contact.html' ? 'class="active"' : ''}>Contact</a></li>
      `;
    }
  };

  // Handle smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      // Skip for the logout link
      if (this.id === 'logout') return;
      
      e.preventDefault();
      
      const targetId = this.getAttribute('href').substring(1);
      if (!targetId) return; // Skip if href is just "#"
      
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // Handle contact form if present (from your example)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Get form values
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const subject = document.getElementById('subject').value;
      const message = document.getElementById('message').value;
      
    
      const messagesRef = database.ref('contactMessages');
      
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