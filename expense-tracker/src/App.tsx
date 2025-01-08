import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { db } from './firebase'; // Import the db from firebase.js
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Firestore functions

interface CategoryBalance {
  דלק: number;
  מסעדות: number;
  חופשות: number;
  בילויים: number;
  בגדים: number;
}

interface Expense {
  category: keyof CategoryBalance;
  amount: number;
  date: string;
}

const INITIAL_BALANCE: CategoryBalance = {
  דלק: 1200,
  מסעדות: 550,
  חופשות: 400,
  בילויים: 350,
  בגדים: 400,
};

const COLORS = {
  דלק: '#FF6B6B',
  מסעדות: '#4ECDC4',
  חופשות: '#45B7D1',
  בילויים: '#FFD700',
  בגדים: '#FF8C00',
};

const BACKGROUND_COLOR = '#2E1A47'; // Dark Purple background color

function App() {
  const [balances, setBalances] = useState<CategoryBalance>(INITIAL_BALANCE);
  const [selectedCategory, setSelectedCategory] = useState<keyof CategoryBalance | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showReport, setShowReport] = useState(false);

  // Fetch balance data and expenses when the app loads
  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, 'balances', 'expenseData');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.balances) setBalances(data.balances as CategoryBalance);
        if (data.expenses) setExpenses(data.expenses as Expense[]);
      }
    };

    fetchData();
  }, []);

  // Update Firestore when the balance changes
  const updateDataInFirestore = async (updatedBalances: CategoryBalance, updatedExpenses: Expense[]) => {
    const docRef = doc(db, 'balances', 'expenseData');
    await setDoc(docRef, { balances: updatedBalances, expenses: updatedExpenses });
  };

  const handleCategorySelect = (category: keyof CategoryBalance) => {
    setSelectedCategory(category);
  };

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory && amount) {
      const newAmount = Number(amount);
      if (!isNaN(newAmount) && newAmount > 0) {
        const newBalances = {
          ...balances,
          [selectedCategory]: Math.max(0, balances[selectedCategory] - newAmount),
        };

        // Add the expense to the list
        const newExpense: Expense = {
          category: selectedCategory,
          amount: newAmount,
          date: new Date().toLocaleString(),
        };
        const updatedExpenses = [...expenses, newExpense];

        setBalances(newBalances);
        setExpenses(updatedExpenses);

        // Save updated data to Firestore
        await updateDataInFirestore(newBalances, updatedExpenses);

        setAmount('');
        setSelectedCategory(null);
      }
    }
  };

  const handleResetCategory = async (category: keyof CategoryBalance) => {
    const updatedBalances = {
      ...balances,
      [category]: INITIAL_BALANCE[category],
    };

    setBalances(updatedBalances);
    await updateDataInFirestore(updatedBalances, expenses);
  };

  const chartData = Object.entries(balances).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div
      className="App"
      style={{ backgroundColor: BACKGROUND_COLOR, minHeight: '100vh', padding: '20px' }}
    >
      <h1
        style={{
          textAlign: 'center',
          fontSize: '2.8em',
          color: '#fff',
          marginBottom: '40px',
          fontFamily: '"Segoe UI", sans-serif',
          letterSpacing: '1px',
        }}
      >
        Expense Tracker
      </h1>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '40px',
          flexWrap: 'wrap',
        }}
      >
        {Object.keys(balances).map((category) => (
          <button
            key={category}
            onClick={() => handleCategorySelect(category as keyof CategoryBalance)}
            style={{
              margin: '8px',
              padding: '12px 24px',
              backgroundColor:
                selectedCategory === category
                  ? COLORS[category as keyof CategoryBalance]
                  : '#E8E8E8',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1.1em',
              fontWeight: 'bold',
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleAmountSubmit}
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          style={{
            padding: '12px',
            fontSize: '1.1em',
            marginBottom: '15px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            width: '220px',
          }}
        />
        <button
          type="submit"
          disabled={!selectedCategory || !amount}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4ECDC4',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.1em',
            color: '#fff',
          }}
        >
          Subtract Expense
        </button>
      </form>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        {Object.entries(balances).map(([category, balance]) => {
          const total = INITIAL_BALANCE[category as keyof CategoryBalance];
          const progress = (balance / total) * 100;
          return (
            <div key={category} style={{ margin: '20px 0' }}>
              <span
                style={{
                  color: COLORS[category as keyof CategoryBalance],
                  fontWeight: 'bold',
                  fontSize: '1.3em',
                  display: 'inline-block',
                }}
              >
                {category}: ₪{balance}
              </span>
              <div
                style={{
                  height: '15px',
                  width: '100%',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '10px',
                  marginTop: '10px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: COLORS[category as keyof CategoryBalance],
                    borderRadius: '10px',
                  }}
                />
              </div>
              <button
                onClick={() => handleResetCategory(category as keyof CategoryBalance)}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#FFD700',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1em',
                  fontWeight: 'bold',
                }}
              >
                Reset to Initial
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowReport(true)}
        style={{
          padding: '12px 24px',
          backgroundColor: '#FF8C00',
          border: 'none',
          borderRadius: '12px',
          fontSize: '1.1em',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        דו"ח הוצאות
      </button>

      {showReport && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>דו"ח הוצאות</h2>
          {expenses.length > 0 ? (
            <ul>
              {expenses.map((expense, index) => (
                <li key={index}>
                  {expense.date} - {expense.category} - ₪{expense.amount}
                </li>
              ))}
            </ul>
          ) : (
            <p>אין הוצאות עדיין</p>
          )}
          <button
            onClick={() => setShowReport(false)}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#FF6B6B',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1em',
              fontWeight: 'bold',
            }}
          >
            סגור דו"ח
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
