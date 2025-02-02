import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { INITIAL_BALANCE, CategoryBalance } from '../../types';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

import './styles.css';

const AdminPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleEscape = () => {
    if (isOpen) {
      setIsOpen(false);
      setMessage('');
      setShowResetConfirm(false);
    }
  };

  useKeyboardShortcuts({
    onEscape: handleEscape,
  });

  const checkFirebaseData = async () => {
    try {
      const docRef = doc(db, 'balances', 'expenseData');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log("Current data:", docSnap.data());
        setMessage('Check the console to see current Firebase data');
      } else {
        setMessage('No data found in Firebase');
      }
    } catch (error) {
      setMessage('Error checking data: ' + error.message);
    }
  };

  const resetFirebaseData = async () => {
    try {
      const docRef = doc(db, 'balances', 'expenseData');
      await setDoc(docRef, {
        balances: INITIAL_BALANCE,
        expenses: []
      });
      setMessage('Successfully reset Firebase data with new structure');
      setShowResetConfirm(false);
    } catch (error) {
      setMessage('Error resetting data: ' + error.message);
    }
  };

  const updatePastReports = async () => {
    try {
      const pastReportsRef = doc(db, 'balances', 'pastReports');
      const docSnap = await getDoc(pastReportsRef);
      if (docSnap.exists()) {
        const currentReports = docSnap.data().reports;
        await setDoc(pastReportsRef, { 
          reports: currentReports.map(report => ({
            ...report,
            balances: {
              ...report.balances,
              חברים: 0
            }
          }))
        });
        setMessage('Successfully updated past reports');
      } else {
        setMessage('No past reports found');
      }
    } catch (error) {
      setMessage('Error updating past reports: ' + error.message);
    }
  };

  const refreshFields = async () => {
    try {
      // Get current data from Firebase
      const docRef = doc(db, 'balances', 'expenseData');
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setMessage('No existing data found to update');
        return;
      }

      const currentData = docSnap.data();
      const currentBalances = currentData.balances || {};
      const currentExpenses = currentData.expenses || [];

      // Create new balances object with all fields from INITIAL_BALANCE
      const updatedBalances: CategoryBalance = { ...INITIAL_BALANCE };

      // Preserve existing values where they exist
      Object.keys(updatedBalances).forEach(key => {
        if (key in currentBalances) {
          updatedBalances[key as keyof CategoryBalance] = currentBalances[key];
        }
      });

      // Update Firebase with new structure while preserving existing expenses
      await setDoc(docRef, {
        balances: updatedBalances,
        expenses: currentExpenses
      });

      // Update past reports with new fields
      const pastReportsRef = doc(db, 'balances', 'pastReports');
      const pastReportsSnap = await getDoc(pastReportsRef);
      
      if (pastReportsSnap.exists()) {
        const currentReports = pastReportsSnap.data().reports;
        const updatedReports = currentReports.map(report => ({
          ...report,
          balances: {
            ...INITIAL_BALANCE,  // First spread the initial balance structure
            ...report.balances   // Then override with existing values
          }
        }));

        await setDoc(pastReportsRef, { reports: updatedReports });
      }

      setMessage('Successfully refreshed all fields and updated data structure');
    } catch (error) {
      setMessage('Error refreshing fields: ' + error.message);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessage('');
    setShowResetConfirm(false);
  };

  return (
    <>
      <button 
        className="admin-button"
        onClick={() => setIsOpen(true)}
      >
        Admin Options
      </button>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Admin Panel</h2>
              <button className="close-button" onClick={handleClose}>&times;</button>
            </div>
            
            <div className="modal-body">
              {showResetConfirm ? (
                <div className="confirm-dialog">
                  <p>Are you sure you want to reset? All your data will be deleted permanently!</p>
                  <div className="confirm-buttons">
                    <button className="confirm-yes" onClick={resetFirebaseData}>Yes, Reset Data</button>
                    <button className="confirm-no" onClick={() => setShowResetConfirm(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="button-group">
                  <button className="action-button check" onClick={checkFirebaseData}>
                    Check Firebase Data
                  </button>
                  
                  <button className="action-button reset" onClick={() => setShowResetConfirm(true)}>
                    Reset Firebase Data
                  </button>
                  
                  <button className="action-button update" onClick={updatePastReports}>
                    Update Past Reports
                  </button>

                  <button className="action-button refresh" onClick={refreshFields}>
                    Refresh Fields
                  </button>
                </div>
              )}

              {message && (
                <div className="message">
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPanel;