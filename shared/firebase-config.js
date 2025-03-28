const firebaseConfig = {
    apiKey: "AIzaSyA6DzzxfW0JvxH6rxrX0eYmnscn0PJisxw",
    authDomain: "servebeka.firebaseapp.com",
    projectId: "servebeka",
    storageBucket: "servebeka.firebasestorage.app",
    messagingSenderId: "2729075411",
    appId: "1:2729075411:web:b14d950fe33d3973676a26"
  };

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
