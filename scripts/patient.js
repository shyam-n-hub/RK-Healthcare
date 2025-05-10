document.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated and is a patient
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in, check if they are a patient
      database.ref('users/' + user.uid).once('value')
        .then((snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            if (userData.role !== 'patient') {
              // Redirect to appropriate dashboard if not a patient
              window.location.href = userData.role === 'doctor' ? 'doctor-dashboard.html' : 'index.html';
              return;
            }
            
            // Update user name on the dashboard
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
              userNameElement.textContent = userData.name || user.email;
            }
            
            // Update navigation for logged in patient
            updateNavigation(true, 'patient');
            
            // Load patient-specific data
            loadPatientIssues();
          }
        })
        .catch((error) => {
          console.error("Error getting user data:", error);
        });
    } else {
      // User is not signed in, redirect to login
      window.location.href = 'login.html';
    }
  });

  // Get the form for submitting health issues
  const issueForm = document.getElementById('issueForm');
  const issuesList = document.getElementById('issuesList');
  
  if (issueForm) {
    issueForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("You must be logged in to submit an issue.");
        return;
      }
      
      const issueData = {
        title: document.getElementById('issueTitle').value,
        description: document.getElementById('issueDescription').value,
        symptoms: document.getElementById('symptoms').value,
        duration: document.getElementById('duration').value,
        patientId: currentUser.uid,
        timestamp: Date.now(),
        status: 'pending',
        response: null
      };
      
      // Save to database
      const newIssueRef = database.ref('issues').push();
      newIssueRef.set(issueData)
        .then(() => {
          alert("Health issue submitted successfully!");
          issueForm.reset();
        })
        .catch((error) => {
          console.error("Error submitting issue:", error);
          alert("Error submitting issue. Please try again.");
        });
    });
  }

  // Function to load patient issues
  function loadPatientIssues() {
    const currentUser = auth.currentUser;
    if (!currentUser || !issuesList) return;
    
    const issuesRef = database.ref('issues');
    const patientIssuesQuery = issuesRef.orderByChild('patientId').equalTo(currentUser.uid);
    
    patientIssuesQuery.on('value', (snapshot) => {
      // Clear current list
      issuesList.innerHTML = '';
      
      if (!snapshot.exists()) {
        issuesList.innerHTML = '<div class="no-issues">You have not reported any health issues yet.</div>';
        return;
      }
      
      // Add issues to the list
      const issues = snapshot.val();
      Object.keys(issues).reverse().forEach((key) => {
        const issue = issues[key];
        const date = new Date(issue.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        const issueCard = document.createElement('div');
        issueCard.className = 'issue-card';
        
        // Create status badge
        const statusClass = issue.status === 'pending' ? 'status-pending' : 'status-responded';
        const statusText = issue.status === 'pending' ? 'Pending' : 'Responded';
        
        let cardContent = `
          <h4>
            ${issue.title}
            <span class="issue-card-status ${statusClass}">${statusText}</span>
          </h4>
          <div class="issue-card-details">
            <p><strong>Symptoms:</strong> ${issue.symptoms}</p>
            <p><strong>Duration:</strong> ${issue.duration}</p>
            <p><strong>Description:</strong> ${issue.description}</p>
            <p class="issue-date"><small>Submitted on: ${formattedDate}</small></p>
          </div>
        `;
        
        // Add response if available
        if (issue.response) {
          const responseDate = new Date(issue.response.timestamp).toLocaleDateString();
          cardContent += `
            <div class="issue-response">
              <h5>Doctor's Response:</h5>
              <p><strong>Diagnosis:</strong> ${issue.response.diagnosis}</p>
              <p><strong>Prescription:</strong> ${issue.response.prescription}</p>
              ${issue.response.advice ? `<p><strong>Advice:</strong> ${issue.response.advice}</p>` : ''}
              <p class="response-date"><small>Responded on: ${responseDate}</small></p>
            </div>
          `;
        }
        
        issueCard.innerHTML = cardContent;
        issuesList.appendChild(issueCard);
      });
    }, (error) => {
      console.error("Error loading issues:", error);
      if (issuesList) {
        issuesList.innerHTML = '<div class="error">Error loading health issues. Please refresh the page.</div>';
      }
    });
  }
  
  // Handle logout functionality
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