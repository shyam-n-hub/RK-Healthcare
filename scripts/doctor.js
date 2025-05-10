document.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated and is a doctor
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in, check if they are a doctor
      database.ref('users/' + user.uid).once('value')
        .then((snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            if (userData.role !== 'doctor') {
              // Redirect to appropriate dashboard if not a doctor
              window.location.href = userData.role === 'patient' ? 'patient-dashboard.html' : 'index.html';
              return;
            }
            
            // Update user name on the dashboard
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
              userNameElement.textContent = userData.name || user.email;
            }
            
            // Update navigation for logged in doctor
            updateNavigation(true, 'doctor');
            
            // Load patient issues
            loadPatientIssues('all');
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

  const patientIssuesList = document.getElementById('patientIssuesList');
  const issueResponseForm = document.getElementById('issueResponseForm');
  const selectedIssueDetails = document.getElementById('selectedIssueDetails');
  const responseForm = document.getElementById('responseForm');
  const issueFilter = document.getElementById('issueFilter');
  const cancelResponseButton = document.getElementById('cancelResponse');
  
  let currentIssues = {};
  
  // Load all patient issues
  function loadPatientIssues(filterType = 'all') {
    if (!patientIssuesList) return;
    
    const issuesRef = database.ref('issues');
    
    issuesRef.on('value', (snapshot) => {
      // Clear current list
      patientIssuesList.innerHTML = '';
      currentIssues = {};
      
      if (!snapshot.exists()) {
        patientIssuesList.innerHTML = '<div class="no-issues">No patient issues available.</div>';
        return;
      }
      
      // Add issues to the list
      const issues = snapshot.val();
      let issueCount = 0;
      
      Object.keys(issues).reverse().forEach((key) => {
        const issue = issues[key];
        
        // Apply filter
        if (filterType === 'pending' && issue.status !== 'pending') return;
        if (filterType === 'responded' && issue.status !== 'responded') return;
        
        issueCount++;
        currentIssues[key] = issue;
        
        const date = new Date(issue.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        // Get patient name
        database.ref('users/' + issue.patientId).once('value')
          .then((userSnapshot) => {
            const patientData = userSnapshot.val();
            const patientName = patientData ? patientData.name : 'Unknown Patient';
            
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
                <p><strong>Patient:</strong> ${patientName}</p>
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
                  <h5>Your Response:</h5>
                  <p><strong>Diagnosis:</strong> ${issue.response.diagnosis}</p>
                  <p><strong>Prescription:</strong> ${issue.response.prescription}</p>
                  ${issue.response.advice ? `<p><strong>Advice:</strong> ${issue.response.advice}</p>` : ''}
                  <p class="response-date"><small>Responded on: ${responseDate}</small></p>
                </div>
              `;
            } else {
              // Add respond button for pending issues
              cardContent += `
                <button class="btn btn-primary respond-btn" data-issue-id="${key}">
                  Respond to Patient
                </button>
              `;
            }
            
            issueCard.innerHTML = cardContent;
            patientIssuesList.appendChild(issueCard);
            
            // Add event listener to respond button
            const respondBtn = issueCard.querySelector('.respond-btn');
            if (respondBtn) {
              respondBtn.addEventListener('click', () => {
                showResponseForm(key, issue);
              });
            }
          })
          .catch((error) => {
            console.error("Error getting patient data:", error);
          });
      });
      
      if (issueCount === 0) {
        patientIssuesList.innerHTML = `<div class="no-issues">No ${filterType} issues available.</div>`;
      }
    }, (error) => {
      console.error("Error loading issues:", error);
      patientIssuesList.innerHTML = '<div class="error">Error loading patient issues. Please refresh the page.</div>';
    });
  }
  
  // Show the response form for a specific issue
  function showResponseForm(issueId, issue) {
    if (!issueResponseForm || !selectedIssueDetails) return;
    
    // Show form
    issueResponseForm.classList.remove('hidden');
    
    // Populate selected issue details
    database.ref('users/' + issue.patientId).once('value')
      .then((userSnapshot) => {
        const patientData = userSnapshot.val();
        const patientName = patientData ? patientData.name : 'Unknown Patient';
        
        selectedIssueDetails.innerHTML = `
          <h4>${issue.title}</h4>
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Symptoms:</strong> ${issue.symptoms}</p>
          <p><strong>Duration:</strong> ${issue.duration}</p>
          <p><strong>Description:</strong> ${issue.description}</p>
          <p class="issue-date"><small>Submitted on: ${new Date(issue.timestamp).toLocaleDateString()}</small></p>
        `;
        
        // Set issue ID and patient ID in form
        document.getElementById('issueId').value = issueId;
        document.getElementById('patientId').value = issue.patientId;
        
        // Scroll to the form
        issueResponseForm.scrollIntoView({ behavior: 'smooth' });
      })
      .catch((error) => {
        console.error("Error getting patient data:", error);
      });
  }
  
  // Handle response form submission
  if (responseForm) {
    responseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const issueId = document.getElementById('issueId').value;
      const patientId = document.getElementById('patientId').value;
      const diagnosis = document.getElementById('diagnosis').value;
      const prescription = document.getElementById('prescription').value;
      const advice = document.getElementById('advice').value;
      
      const responseData = {
        diagnosis: diagnosis,
        prescription: prescription,
        advice: advice,
        timestamp: Date.now(),
        doctorId: auth.currentUser.uid
      };
      
      // Update issue in database
      const updates = {};
      updates[`/issues/${issueId}/response`] = responseData;
      updates[`/issues/${issueId}/status`] = 'responded';
      
      database.ref().update(updates)
        .then(() => {
          alert("Response sent successfully!");
          responseForm.reset();
          issueResponseForm.classList.add('hidden');
          loadPatientIssues(issueFilter.value); // Reload with current filter
        })
        .catch((error) => {
          console.error("Error sending response:", error);
          alert("Error sending response. Please try again.");
        });
    });
  }
  
  // Handle filter change
  if (issueFilter) {
    issueFilter.addEventListener('change', () => {
      loadPatientIssues(issueFilter.value);
    });
  }
  
  // Handle cancel button
  if (cancelResponseButton) {
    cancelResponseButton.addEventListener('click', () => {
      responseForm.reset();
      issueResponseForm.classList.add('hidden');
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