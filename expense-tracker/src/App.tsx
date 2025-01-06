import React, { useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'

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
    <div className="App">
      <h1>Expense Tracker</h1>
      
      {/* Category Buttons */}
      <div style={{ marginBottom: '20px' }}>
        {Object.keys(balances).map((category) => (
          <button
            key={category}
            onClick={() => handleCategorySelect(category as keyof CategoryBalance)}
            style={{
              margin: '5px',
              padding: '10px 20px',
              backgroundColor: selectedCategory === category ? COLORS[category as keyof CategoryBalance] : '#f0f0f0',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Amount Input Form */}
      <form onSubmit={handleAmountSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          style={{ padding: '10px', marginRight: '10px' }}
        />
        <button
          type="submit"
          disabled={!selectedCategory || !amount}
          style={{ padding: '10px 20px' }}
        >
          Subtract Expense
        </button>
      </form>

      {/* Balance Display */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
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
      <div>
        {Object.entries(balances).map(([category, balance]) => (
          <div key={category} style={{ margin: '10px 0' }}>
            <span style={{ 
              color: COLORS[category as keyof CategoryBalance],
              fontWeight: 'bold'
            }}>
              {category}: ${balance}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App