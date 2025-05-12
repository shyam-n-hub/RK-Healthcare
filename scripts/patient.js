document.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated and is a patient
  auth.onAuthStateChanged((user) => {
    if (user) {
      database.ref('users/' + user.uid).once('value')
        .then((snapshot) => {
          const userData = snapshot.val();
          if (!userData) {
            console.error("No user data found");
            window.location.href = 'login.html';
            return;
          }

          if (userData.role !== 'patient') {
            window.location.href = userData.role === 'doctor' ? 'doctor-dashboard.html' : 'index.html';
            return;
          }

          const userNameElement = document.getElementById('userName');
          if (userNameElement) {
            userNameElement.textContent = userData.name || user.email;
          }

          loadPatientIssues();
        })
        .catch((error) => {
          console.error("Error getting user data:", error);
          alert("Error loading patient data. Please try again later.");
        });
    } else {
      window.location.href = 'login.html';
    }
  });

  // Submit Health Issue
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

      const title = document.getElementById('issueTitle').value;
      const description = document.getElementById('issueDescription').value;
      const symptoms = document.getElementById('symptoms').value;
      const duration = document.getElementById('duration').value;

      if (!title || !description || !symptoms || !duration) {
        alert("Please fill in all required fields");
        return;
      }

      const issueData = {
        title,
        description,
        symptoms,
        duration,
        patientId: currentUser.uid,
        timestamp: Date.now(),
        status: 'pending',
        response: null
      };

      const submitButton = issueForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
      }

      const newIssueRef = database.ref('issues').push();
      newIssueRef.set(issueData)
        .then(() => {
          alert("Health issue submitted successfully!");
          issueForm.reset();
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Health Issue';
          }
          loadPatientIssues();
        })
        .catch((error) => {
          console.error("Error submitting issue:", error);
          alert("Error submitting issue. Please try again.");
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Health Issue';
          }
        });
    });
  }

  // Load Patient Issues
  function loadPatientIssues() {
    const currentUser = auth.currentUser;
    if (!currentUser || !issuesList) return;

    issuesList.innerHTML = '<div class="loading">Loading your health issues...</div>';

    const issuesRef = database.ref('issues');
    const patientIssuesQuery = issuesRef.orderByChild('patientId').equalTo(currentUser.uid);

    patientIssuesQuery.on('value', (snapshot) => {
      issuesList.innerHTML = '';

      if (!snapshot.exists()) {
        issuesList.innerHTML = '<div class="no-issues">You have not reported any health issues yet.</div>';
        return;
      }

      const issues = snapshot.val();
      const issueItems = Object.keys(issues).map(key => {
        return { key, ...issues[key] };
      });

      issueItems.sort((a, b) => b.timestamp - a.timestamp);

      issueItems.forEach((issue) => {
        const date = new Date(issue.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        const issueCard = document.createElement('div');
        issueCard.className = 'issue-card';

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
        `;

        if (issue.response) {
          const responseDate = new Date(issue.response.timestamp);
          cardContent += `
            <div class="issue-response">
              <h5>Doctor's Response</h5>
              <p><strong>Doctor:</strong> ${issue.response.doctorName}</p>
              <p><strong>Advice:</strong> ${issue.response.advice}</p>
              <p><small>Responded on: ${responseDate.toLocaleDateString()} ${responseDate.toLocaleTimeString()}</small></p>
            </div>
          `;
        }

        cardContent += '</div>'; // Close issue-card-details
        issueCard.innerHTML = cardContent;
        issuesList.appendChild(issueCard);
      });
    });
  }

  // Logout Functionality
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut()
        .then(() => {
          window.location.href = 'login.html';
        })
        .catch((error) => {
          console.error("Error logging out:", error);
          alert("Logout failed. Try again.");
        });
    });
  }
});
