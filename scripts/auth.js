// Global variable to track authentication state
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication state on page load
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      currentUser = user;
      const currentPage = window.location.pathname.split('/').pop();
      
      // Get user role from database
      database.ref('users/' + user.uid).once('value')
        .then((snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            const userRole = userData.role;
            
            // Update navigation links based on authentication
            updateNavigation(true, userRole);
            
            // Redirect based on role if on login or signup page
            if (currentPage === 'login.html' || currentPage === 'signup.html') {
              if (userRole === 'patient') {
                window.location.href = 'patient-dashboard.html';
              } else if (userRole === 'doctor') {
                window.location.href = 'doctor-dashboard.html';
              }
            }
            
            // Update user name on dashboard
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
              userNameElement.textContent = userData.name || user.email;
            }
          }
        })
        .catch((error) => {
          console.error("Error getting user data:", error);
        });
    } else {
      // User is signed out
      currentUser = null;
      const currentPage = window.location.pathname.split('/').pop();
      
      // Update navigation for logged out state
      updateNavigation(false);
      
      // Redirect to login if trying to access dashboard
      if (currentPage === 'patient-dashboard.html' || currentPage === 'doctor-dashboard.html') {
        window.location.href = 'login.html';
      }
    }
  });

  // Login form processing
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const role = document.querySelector('input[name="role"]:checked').value;
      const errorMessage = document.getElementById('error-message');
      
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Signed in
          const user = userCredential.user;
          
          // Check if user role matches
          database.ref('users/' + user.uid).once('value')
            .then((snapshot) => {
              const userData = snapshot.val();
              if (userData && userData.role === role) {
                // Redirect based on role
                if (role === 'patient') {
                  window.location.href = 'patient-dashboard.html';
                } else {
                  window.location.href = 'doctor-dashboard.html';
                }
              } else {
                // Wrong role selected
                errorMessage.textContent = "Incorrect role selected. Please try again.";
                auth.signOut();
              }
            })
            .catch((error) => {
              console.error("Error getting user data:", error);
              errorMessage.textContent = "An error occurred. Please try again.";
            });
        })
        .catch((error) => {
          console.error("Login error:", error);
          errorMessage.textContent = "Invalid email or password. Please try again.";
        });
    });
  }
  
  // Signup form processing
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const role = document.querySelector('input[name="role"]:checked').value;
      const errorMessage = document.getElementById('error-message');
      
      // Validate password
      if (password !== confirmPassword) {
        errorMessage.textContent = "Passwords do not match. Please try again.";
        return;
      }
      
      // Create user
      auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Signed up
          const user = userCredential.user;
          
          // Store user data in database
          return database.ref('users/' + user.uid).set({
            name: name,
            email: email,
            role: role
          });
        })
        .then(() => {
          // Redirect based on role
          if (role === 'patient') {
            window.location.href = 'patient-dashboard.html';
          } else {
            window.location.href = 'doctor-dashboard.html';
          }
        })
        .catch((error) => {
          console.error("Signup error:", error);
          errorMessage.textContent = "Error creating account: " + error.message;
        });
    });
  }

  // Logout functionality
  const logoutButton = document.getElementById('logout');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
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
});

// Function to update navigation based on auth state
function updateNavigation(isLoggedIn, role = null) {
  const navElement = document.querySelector('nav ul');
  if (!navElement) return;
  
  if (isLoggedIn) {
    // Update navigation for logged in users
    const dashboardLink = role === 'patient' ? 'patient-dashboard.html' : 'doctor-dashboard.html';
    
    // Get current page to highlight active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
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
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    navElement.innerHTML = `
      <li><a href="index.html" ${currentPage === 'index.html' ? 'class="active"' : ''}>Home</a></li>
      <li><a href="login.html" ${currentPage === 'login.html' ? 'class="active"' : ''}>Login</a></li>
      <li><a href="signup.html" ${currentPage === 'signup.html' ? 'class="active"' : ''}>Signup</a></li>
      <li><a href="contact.html" ${currentPage === 'contact.html' ? 'class="active"' : ''}>Contact</a></li>
    `;
  }
}