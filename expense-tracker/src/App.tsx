import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { db } from './firebase';  // Import the db from firebase.js
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';  // Firestore functions

interface CategoryBalance {
  car: number;
  food: number;
  vacation: number;
  entertainment: number;
}

const INITIAL_BALANCE: CategoryBalance = {
  car: 1000,
  food: 1000,
  vacation: 1000,
  entertainment: 1000,
};

const COLORS = {
  car: '#FF6B6B',
  food: '#4ECDC4',
  vacation: '#45B7D1',
  entertainment: '#FFD700' // Light Gold color for entertainment
};

const BACKGROUND_COLOR = '#2E1A47'; // Dark Purple background color

function App() {
  const [balances, setBalances] = useState<CategoryBalance>(INITIAL_BALANCE);
  const [selectedCategory, setSelectedCategory] = useState<keyof CategoryBalance | null>(null);
  const [amount, setAmount] = useState<string>('');

  // Fetch balance data when the app loads
  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, 'balances', 'expenseData');  // Reference to the Firestore document
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setBalances(docSnap.data() as CategoryBalance);  // Load data from Firestore
      }
    };

    fetchData();
  }, []);

  // Update Firestore when the balance changes
  const updateBalanceInFirestore = async (updatedBalances: CategoryBalance) => {
    const docRef = doc(db, 'balances', 'expenseData');  // Reference to the Firestore document
    await setDoc(docRef, updatedBalances);  // Save the new balance data
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
          [selectedCategory]: Math.max(0, balances[selectedCategory] - newAmount)
        };
        
        setBalances(newBalances);  // Update state
        console.log('Updated Balances:', newBalances); 
        await updateBalanceInFirestore(newBalances);  // Update Firestore
        setAmount('');
        setSelectedCategory(null);
      }
    }
  };

  const chartData = Object.entries(balances).map(([name, value]) => ({
    name,
    value
  }));

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value, index } = props;
    const RADIAN = Math.PI / 180;
    const angle = midAngle * RADIAN;
    const x = cx + (outerRadius + 10) * Math.cos(angle);
    const y = cy + (outerRadius + 10) * Math.sin(angle);

    return (
      <text x={x} y={y} fill="#888" textAnchor="middle" dominantBaseline="middle">
        {chartData[index].name}: ₪{value}
      </text>
    );
  };

  return (
    <div className="App" style={{ backgroundColor: BACKGROUND_COLOR, minHeight: '100vh', padding: '20px' }}>
      <h1 style={{
        textAlign: 'center',
        fontSize: '2.8em',
        color: '#fff',
        marginBottom: '40px',
        fontFamily: '"Segoe UI", sans-serif',
        letterSpacing: '1px'
      }}>
        Expense Tracker
      </h1>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '40px',
        flexWrap: 'wrap'
      }}>
        {Object.keys(balances).map((category) => (
          <button
            key={category}
            onClick={() => handleCategorySelect(category as keyof CategoryBalance)}
            style={{
              margin: '8px',
              padding: '12px 24px',
              backgroundColor: selectedCategory === category ? COLORS[category as keyof CategoryBalance] : '#E8E8E8',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease, transform 0.2s ease',
              fontSize: '1.1em',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      <form onSubmit={handleAmountSubmit} style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '300px',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
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
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            width: '220px',
            transition: 'border-color 0.3s ease'
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
            cursor: 'pointer',
            fontSize: '1.1em',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            color: '#fff',
            transition: 'background-color 0.3s ease, transform 0.2s ease'
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
              <span style={{
                color: COLORS[category as keyof CategoryBalance],
                fontWeight: 'bold',
                fontSize: '1.3em',
                marginBottom: '5px',
                display: 'inline-block',
                textTransform: 'capitalize'
              }}>
                {category}: ₪{balance}
              </span>
              <div style={{
                height: '15px',
                width: '100%',
                backgroundColor: '#e0e0e0',
                borderRadius: '10px',
                marginTop: '20px',
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: COLORS[category as keyof CategoryBalance],
                    borderRadius: '10px',
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
