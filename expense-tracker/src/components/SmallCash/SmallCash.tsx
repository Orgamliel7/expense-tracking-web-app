import React, { useState, useMemo, useEffect } from 'react';
import { Expense, INITIAL_BALANCE } from '../../types';
import './styles.css';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface Subtraction {
  id: string;
  amount: number;
  date: string;
  note: string;
}

interface SmallCashProps {
  expenses: Expense[];
  actionBtnClicked: boolean;
  onClose: () => void;
}

const SmallCash: React.FC<SmallCashProps> = ({ expenses, actionBtnClicked, onClose }) => {
  const [subtractions, setSubtractions] = useState<Subtraction[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Fetch subtractions from Firestore on component mount
  useEffect(() => {
    const fetchSubtractions = async () => {
      const docRef = doc(db, 'balances', 'smallCashData');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSubtractions(docSnap.data().subtractions || []);
      }
    };

    fetchSubtractions();
  }, []);

  // Update Firestore when subtractions change
  const updateFirestore = async (newSubtractions: Subtraction[]) => {
    const docRef = doc(db, 'balances', 'smallCashData');
    try {
      await setDoc(docRef, { subtractions: newSubtractions });
    } catch (error) {
      console.error('Error updating small cash data:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Set default date to current date in Jerusalem timezone
  useEffect(() => {
    const jerusalemDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
    const dateString = new Date(jerusalemDate).toISOString().split('T')[0];
    setDate(dateString);
  }, []);

  // Calculate monthly data
  const calculateMonthlyData = useMemo(() => {
    const totalInitialBudget = Object.values(INITIAL_BALANCE).reduce((a, b) => a + b, 0);
    const monthlyData: Record<string, { saved: number }> = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${expense.date}`);
        return;
      }

      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { saved: totalInitialBudget };
      }
      monthlyData[monthKey].saved -= expense.amount;
    });

    return monthlyData;
  }, [expenses]);

  // Calculate small cash amount (30% of total savings)
  const smallCashAmount = useMemo(() => {
    const totalSaved = Object.values(calculateMonthlyData).reduce((acc, { saved }) => acc + saved, 0);
    return totalSaved * 0.3;
  }, [calculateMonthlyData]);

  // Handle adding a new subtraction
  const handleAddSubtraction = async () => {
    if (amount.trim() === '' || !date) {
      alert('Please enter a valid amount and date.');
      return;
    }

    const newSubtraction: Subtraction = {
      id: `${Date.now()}`,
      amount: parseFloat(amount),
      date,
      note,
    };

    const newSubtractions = [...subtractions, newSubtraction];
    setSubtractions(newSubtractions);
    await updateFirestore(newSubtractions);
    
    // Reset form
    setAmount('');
    setDate('');
    setNote('');
  };

  // Handle deleting a subtraction
  const handleDeleteSubtraction = async (id: string) => {
    const newSubtractions = subtractions.filter((sub) => sub.id !== id);
    setSubtractions(newSubtractions);
    await updateFirestore(newSubtractions);
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        handleAddSubtraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, amount, date, note]);

  if (!actionBtnClicked) return null;

  return (
    <div className="small-cash-container">
      <div className="small-cash-content">
        <button onClick={onClose} className="close-btn">
          x
        </button>
        <h3>קופה קטנה</h3>
        <div className="small-cash-amount">
          ₪{(smallCashAmount - subtractions.reduce((acc, { amount }) => acc + amount, 0)).toFixed(2)}
        </div>

        <div className="add-subtraction-form">
          <input
            type="number"
            placeholder="סכום"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="subtraction-input"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="subtraction-input"
          />
          <input
            type="text"
            placeholder="הערה (אופציונלי)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="subtraction-input"
          />
          <button onClick={handleAddSubtraction} className="add-btn">
            הזן סכום
          </button>
        </div>

        <div className="subtractions-list">
          {subtractions.map((subtraction) => (
            <div key={subtraction.id} className="subtraction-item">
              <div className="subtraction-details">
                <span>{new Date(subtraction.date).toLocaleDateString()}</span>
                <span>{subtraction.note ? ` - ${subtraction.note}` : ''}</span>
              </div>
              <div className="subtraction-amount">₪{subtraction.amount.toFixed(2)}</div>
              <button
                onClick={() => handleDeleteSubtraction(subtraction.id)}
                className="delete-btn"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmallCash;