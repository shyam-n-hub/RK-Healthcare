document.addEventListener('DOMContentLoaded', () => {
  // Check authentication state on page load
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      console.log("User authenticated:", user.uid);
      
      // Get user role from database
      database.ref('users/' + user.uid).once('value')
        .then((snapshot) => {
          console.log("User data snapshot:", snapshot.val());
          const userData = snapshot.val();
          if (userData) {
            const userRole = userData.role;
            console.log("User role:", userRole);
            
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
          } else {
            console.error("User data is null or undefined in the database");
          }
        })
        .catch((error) => {
          console.error("Error getting user data:", error);
        });
    } else {
      // User is signed out
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      
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
      
      // Clear previous error messages
      errorMessage.textContent = "";
      
      // Validate input
      if (!email || !password) {
        errorMessage.textContent = "Please enter both email and password.";
        return;
      }
      
      // Disable submit button to prevent multiple submissions
      const submitButton = loginForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';
      }
      
      // Try to sign in
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Successfully signed in
          const user = userCredential.user;
          console.log("Login successful for user:", user.uid);
          
          // Check if user role matches
          return database.ref('users/' + user.uid).once('value');
        })
        .then((snapshot) => {
          console.log("Database response:", snapshot.val());
          const userData = snapshot.val();
          
          if (!userData) {
            console.error("User data is null or undefined");
            errorMessage.textContent = "User data not found in database. Please contact support.";
            
            // Re-enable submit button
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = 'Login';
            }
            
            // Log out the user
            return auth.signOut().then(() => {
              throw new Error("User data not found");
            });
          }
          
          const selectedRole = role;
          console.log("Selected role:", selectedRole, "User role:", userData.role);
          
          if (userData.role !== selectedRole) {
            // Wrong role selected
            errorMessage.textContent = `Incorrect role selected. You are registered as a ${userData.role}.`;
            // Log out the user
            return auth.signOut().then(() => {
              throw new Error("Role mismatch");
            });
          }
          
          // Role matches, redirect to appropriate dashboard
          if (userData.role === 'patient') {
            window.location.href = 'patient-dashboard.html';
          } else if (userData.role === 'doctor') {
            window.location.href = 'doctor-dashboard.html';
          }
        })
        .catch((error) => {
          console.error("Login error:", error);
          
          // Re-enable submit button
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
          }
          
          // Handle specific error messages
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage.textContent = "Invalid email or password. Please try again.";
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage.textContent = "Too many failed login attempts. Please try again later.";
          } else if (error.message === "Role mismatch") {
            // Already handled above
          } else if (error.message === "User data not found") {
            // Already handled above
          } else {
            errorMessage.textContent = "Login failed: " + error.message;
          }
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
      
      // Clear previous error messages
      errorMessage.textContent = "";
      
      // Validate form inputs
      if (!name || !email || !password || !confirmPassword) {
        errorMessage.textContent = "Please fill in all fields.";
        return;
      }
      
      // Validate password
      if (password !== confirmPassword) {
        errorMessage.textContent = "Passwords do not match. Please try again.";
        return;
      }
      
      // Validate password strength (minimum 6 characters)
      if (password.length < 6) {
        errorMessage.textContent = "Password must be at least 6 characters long.";
        return;
      }
      
      // Disable submit button to prevent multiple submissions
      const submitButton = signupForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Creating account...';
      }
      
      // Create user
      auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Successfully created user
          const user = userCredential.user;
          console.log("User created successfully:", user.uid);
          
          // Store user data in database
          const userData = {
            name: name,
            email: email,
            role: role,
            createdAt: Date.now()
          };
          
          console.log("Storing user data for UID:", user.uid, userData);
          
          // Return the database promise to chain properly
          return database.ref('users/' + user.uid).set(userData);
        })
        .then(() => {
          console.log("User data stored successfully");
          
          // Get the role to redirect to appropriate dashboard
          const role = document.querySelector('input[name="role"]:checked').value;
          
          // Redirect based on role
          if (role === 'patient') {
            window.location.href = 'patient-dashboard.html';
          } else if (role === 'doctor') {
            window.location.href = 'doctor-dashboard.html';
          }
        })
        .catch((error) => {
          console.error("Signup error:", error);
          
          // Re-enable submit button
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Sign Up';
          }
          
          // Handle specific error messages
          if (error.code === 'auth/email-already-in-use') {
            errorMessage.textContent = "This email is already registered. Please use a different email or login.";
          } else if (error.code === 'auth/invalid-email') {
            errorMessage.textContent = "Invalid email format. Please provide a valid email.";
          } else if (error.code === 'auth/weak-password') {
            errorMessage.textContent = "Password is too weak. Please use a stronger password.";
          } else {
            errorMessage.textContent = "Error creating account: " + error.message;
          }
        });
    });
  }

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

  // Handle logout functionality across all pages
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