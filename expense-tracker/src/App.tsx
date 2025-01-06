import React, { useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';

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
  entertainment: '#96CEB4'
};

function App() {
  const [balances, setBalances] = useState<CategoryBalance>(INITIAL_BALANCE);
  const [selectedCategory, setSelectedCategory] = useState<keyof CategoryBalance | null>(null);
  const [amount, setAmount] = useState<string>('');

  const handleCategorySelect = (category: keyof CategoryBalance) => {
    setSelectedCategory(category);
  };

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory && amount) {
      const newAmount = Number(amount);
      if (!isNaN(newAmount) && newAmount > 0) {
        setBalances(prev => ({
          ...prev,
          [selectedCategory]: Math.max(0, prev[selectedCategory] - newAmount)
        }));
        setAmount('');
        setSelectedCategory(null);
      }
    }
  };

  const chartData = Object.entries(balances).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="App" style={{ backgroundColor: '#F5F5DC', minHeight: '100vh', padding: '20px' }}>
      {/* Header */}
      <h1 style={{
        textAlign: 'center',
        fontSize: '2.5em',
        color: '#333',
        marginBottom: '40px',
        fontFamily: '"Segoe UI", sans-serif'
      }}>
        Expense Tracker
      </h1>
      
      {/* Category Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        {Object.keys(balances).map((category) => (
          <button
            key={category}
            onClick={() => handleCategorySelect(category as keyof CategoryBalance)}
            style={{
              margin: '5px',
              padding: '12px 24px',
              backgroundColor: selectedCategory === category ? COLORS[category as keyof CategoryBalance] : '#E8E8E8',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              fontSize: '1.1em',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D1D1D1'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedCategory === category ? COLORS[category as keyof CategoryBalance] : '#E8E8E8'}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Amount Input Form */}
      <form onSubmit={handleAmountSubmit} style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '30px',
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
            marginBottom: '10px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            width: '200px'
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
            transition: 'background-color 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3CA6A2'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4ECDC4'}
        >
          Subtract Expense
        </button>
      </form>

      {/* Balance Display */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
        <PieChart width={400} height={400}>
          <Pie
            data={chartData}
            cx={200}
            cy={200}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name as keyof CategoryBalance]}
              />
            ))}
          </Pie>
        </PieChart>
      </div>

      {/* Balance Text Display */}
      <div style={{
        textAlign: 'center',
        fontSize: '1.1em',
        marginBottom: '30px'
      }}>
        {Object.entries(balances).map(([category, balance]) => (
          <div key={category} style={{ margin: '10px 0' }}>
            <span style={{
              color: COLORS[category as keyof CategoryBalance],
              fontWeight: 'bold'
            }}>
              {category.charAt(0).toUpperCase() + category.slice(1)}: ${balance}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
