// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3hN9-x4-UBlZ8S2vb3lVVMktclCCU29c",
  authDomain: "hospital-management-de5c3.firebaseapp.com",
  projectId: "hospital-management-de5c3",
  storageBucket: "hospital-management-de5c3.firebasestorage.app",
  messagingSenderId: "467152632565",
  appId: "1:467152632565:web:75ee7e1bac706f147f23bc",
  measurementId: "G-2RJ1XJHYEF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Set persistence to LOCAL to keep user logged in across tabs/page refreshes
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });