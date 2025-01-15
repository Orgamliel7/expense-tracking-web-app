import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: 'AIzaSyClsQXK71-2aX0fG2YSh4C_aWf42WuDIiA',
    authDomain: 'expensetracker-578ef.firebaseapp.com',
    projectId: 'expensetracker-578ef',
    storageBucket: 'expensetracker-578ef.firebasestorage.app',
    messagingSenderId: '97675828426',
    appId: '1:97675828426:web:e05ff088069f9dacf46833',
    measurementId: 'G-M7L1Z8VLGH'
  };
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  export { db };