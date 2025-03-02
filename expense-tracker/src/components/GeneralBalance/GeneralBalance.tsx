import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Expense, CategoryBalance } from '../../types';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import generalBalance from '../../values';
import './styles.css';

interface GeneralProps {
  expenses: Expense[];
  balances: CategoryBalance;
  actionBtnClicked: boolean;
  onClose: () => void;
}

interface CustomExpense extends Expense {
  id: string;
  description: string;
  displayAmount: string;
}

interface MonthlyData {
  month: string;
  expenses: CustomExpense[];
  customIncomes: {
    id: string;
    amount: number;
    date: string;
    description: string;
  }[];
  fixedExpenses: {
    description: string;
    amount: number;
  }[];
  fixedIncomes: {
    description: string;
    amount: number;
  }[];
}

const getAllMonths = (): string[] => {
  const months: string[] = [];
  
  // Start from February 2025
  const startDate = new Date(2025, 1, 1); // Month is 0-indexed, so 1 is February
  const currentDate = new Date();
  let date = new Date(startDate);
  
  while (date <= currentDate) {
    months.push(`${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`);
    date.setMonth(date.getMonth() + 1);
  }
  
  return months;
};

const General: React.FC<GeneralProps> = ({ expenses, balances, actionBtnClicked, onClose }) => {
  const [customExpenses, setCustomExpenses] = useState<CustomExpense[]>([]);
  const [customIncomes, setCustomIncomes] = useState<MonthlyData['customIncomes']>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [newIncome, setNewIncome] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Set available months and default selected month on component mount
  useEffect(() => {
    const jerusalemDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
    const currentMonth = `${String(new Date(jerusalemDate).getMonth() + 1).padStart(2, '0')}/${new Date(jerusalemDate).getFullYear()}`;
    
    // Get all months from February 2025 to current month
    const months = getAllMonths();
    setAvailableMonths(months);
    
    // Set default month to current month if not already set
    if (!selectedMonth) {
      setSelectedMonth(currentMonth);
    }
  }, [selectedMonth]);

  // Fetch custom data from Firestore
  useEffect(() => {
    const fetchCustomData = async () => {
      const docRef = doc(db, 'customData', 'generalData');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomExpenses(data.expenses || []);
        setCustomIncomes(data.customIncomes || []);
      }
    };

    fetchCustomData();
  }, []);

  // Calculate monthly data including fixed expenses and incomes
  const monthlyData = useMemo(() => {
    const data: Record<string, MonthlyData> = {};
    
    // Initialize data for all available months
    availableMonths.forEach(monthKey => {
      data[monthKey] = {
        month: monthKey,
        expenses: [],
        customIncomes: [],
        fixedExpenses: Object.entries(generalBalance['fixed-expenses']).map(([description, amount]) => ({
          description,
          amount: Number(amount)
        })),
        fixedIncomes: Object.entries(generalBalance['fixed-incomes']).map(([description, amount]) => ({
          description,
          amount: Number(amount)
        }))
      };
    });
    
    // Process date string to get month/year format
    const processDate = (date: string) => {
      const dateObj = new Date(date);
      return `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
    };

    // Process regular expenses from the expenses prop
    expenses.forEach(expense => {
      const monthKey = processDate(expense.date);
      if (data[monthKey]) {
        const customExpense: CustomExpense = {
          ...expense,
          id: `regular-${expense.date}-${expense.amount}`,
          description: expense.category,
          displayAmount: `₪${expense.amount.toFixed(2)}`
        };
        data[monthKey].expenses.push(customExpense);
      }
    });

    // Process custom expenses
    customExpenses.forEach(expense => {
      const monthKey = processDate(expense.date);
      if (data[monthKey]) {
        data[monthKey].expenses.push(expense);
      }
    });

    // Process custom incomes
    customIncomes.forEach(income => {
      const monthKey = processDate(income.date);
      if (data[monthKey]) {
        data[monthKey].customIncomes.push(income);
      }
    });

    return data;
  }, [expenses, customExpenses, customIncomes, availableMonths]);

  // Get chart data for selected month
  const chartData = useMemo(() => {
    const selectedData = monthlyData[selectedMonth];
    if (!selectedData) return [];

    const totalExpenses = selectedData.expenses.reduce((sum, exp) => sum + exp.amount, 0) +
                         selectedData.fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomes = selectedData.customIncomes.reduce((sum, inc) => sum + inc.amount, 0) +
                        selectedData.fixedIncomes.reduce((sum, inc) => sum + inc.amount, 0);

    return [
      { name: 'הוצאות', amount: totalExpenses, fill: '#F87171' },
      { name: 'הכנסות', amount: totalIncomes, fill: '#4ADE80' },
      { name: 'מאזן חודשי', amount: totalIncomes - totalExpenses, fill: '#60A5FA' }
    ];
  }, [monthlyData, selectedMonth]);

  // Handle adding new expense
  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.description) {
      alert('נא למלא סכום ותיאור');
      return;
    }

    const expense: CustomExpense = {
      id: Date.now().toString(),
      amount: parseFloat(newExpense.amount),
      category: 'כללי' as keyof CategoryBalance,
      date: newExpense.date,
      description: newExpense.description,
      displayAmount: `₪${parseFloat(newExpense.amount).toFixed(2)}`
    };

    const newExpenses = [...customExpenses, expense];
    setCustomExpenses(newExpenses);
    await updateFirestore(newExpenses, customIncomes);
    setNewExpense({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Handle adding new income
  const handleAddIncome = async () => {
    if (!newIncome.amount || !newIncome.description) {
      alert('נא למלא סכום ותיאור');
      return;
    }

    const income = {
      id: Date.now().toString(),
      amount: parseFloat(newIncome.amount),
      date: newIncome.date,
      description: newIncome.description
    };

    const newIncomes = [...customIncomes, income];
    setCustomIncomes(newIncomes);
    await updateFirestore(customExpenses, newIncomes);
    setNewIncome({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Update Firestore
  const updateFirestore = async (newExpenses: CustomExpense[], newIncomes: MonthlyData['customIncomes']) => {
    const docRef = doc(db, 'customData', 'generalData');
    try {
      await setDoc(docRef, {
        expenses: newExpenses,
        customIncomes: newIncomes
      });
    } catch (error) {
      console.error('Error updating general data:', error);
      alert('שגיאה בשמירת הנתונים. נא לנסות שוב.');
    }
  };

  if (!actionBtnClicked) return null;

  return (
    <div className="general-container">
      <div className="general-content">
        <button onClick={onClose} className="close-btn">×</button>
        <h2 className="general-title">ניהול תקציב חודשי</h2>

        <div className="month-selector">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-select"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>

        <div className="chart-section">
          <h3 className="section-title">מאזן חודשי</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 'auto']} tick={{ dx: -10 }} />
              <Tooltip 
                formatter={(value) => `₪${Math.abs(Number(value)).toFixed(2)}`}
                contentStyle={{ direction: 'rtl' }}
              />
              <Legend />
              <Bar dataKey="amount" fill="#4a90e2" barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="data-grid">
          <div className="fixed-section">
            <h3 className="section-title">הוצאות והכנסות קבועות</h3>
            <div className="fixed-expenses">
              <h4>הוצאות קבועות</h4>
              {monthlyData[selectedMonth]?.fixedExpenses.map((expense, index) => (
                <div key={index} className="fixed-item expense">
                  <span className="description">{expense.description}</span>
                  <span className="amount">₪{expense.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="fixed-incomes">
              <h4>הכנסות קבועות</h4>
              {monthlyData[selectedMonth]?.fixedIncomes.map((income, index) => (
                <div key={index} className="fixed-item income">
                  <span className="description">{income.description}</span>
                  <span className="amount">₪{income.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="input-sections">
            <div className="expense-section">
              <h3 className="section-title">הוספת הוצאה</h3>
              <div className="input-group">
                <input
                  type="number"
                  placeholder="סכום *"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                  className="amount-input"
                  required
                />
                <input
                  type="text"
                  placeholder="תיאור *"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  className="description-input"
                  required
                />
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                  className="date-input"
                />
                <button onClick={handleAddExpense} className="add-btn expense">הוסף הוצאה</button>
              </div>
            </div>

            <div className="income-section">
              <h3 className="section-title">הוספת הכנסה</h3>
              <div className="input-group">
                <input
                  type="number"
                  placeholder="סכום *"
                  value={newIncome.amount}
                  onChange={(e) => setNewIncome(prev => ({ ...prev, amount: e.target.value }))}
                  className="amount-input"
                  required
                />
                <input
                  type="text"
                  placeholder="תיאור *"
                  value={newIncome.description}
                  onChange={(e) => setNewIncome(prev => ({ ...prev, description: e.target.value }))}
                  className="description-input"
                  required
                />
                <input
                  type="date"
                  value={newIncome.date}
                  onChange={(e) => setNewIncome(prev => ({ ...prev, date: e.target.value }))}
                  className="date-input"
                />
                <button onClick={handleAddIncome} className="add-btn income">הוסף הכנסה</button>
              </div>
            </div>
          </div>

          <div className="transactions-section">
            <h3 className="section-title">תנועות חודשיות</h3>
            <div className="transactions-grid">
              <div className="custom-expenses">
                <h4>הוצאות</h4>
                {monthlyData[selectedMonth]?.expenses
                  .map((expense) => (
                    <div key={expense.id} className="transaction-item expense">
                      <span className="date">
                        {new Date(expense.date).toLocaleDateString('he-IL')}
                      </span>
                      <span className="description">{expense.description}</span>
                      <span className="amount">₪{expense.amount.toFixed(2)}</span>
                      {customExpenses.some(e => e.id === expense.id) && (
                        <button 
                          onClick={() => {
                            const newExpenses = customExpenses.filter(e => e.id !== expense.id);
                            setCustomExpenses(newExpenses);
                            updateFirestore(newExpenses, customIncomes);
                          }}
                          className="delete-btn"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
              </div>

              <div className="custom-incomes">
                <h4>הכנסות</h4>
                {monthlyData[selectedMonth]?.customIncomes
                  .map((income) => (
                    <div key={income.id} className="transaction-item income">
                      <span className="date">
                        {new Date(income.date).toLocaleDateString('he-IL')}
                      </span>
                      <span className="description">{income.description}</span>
                      <span className="amount">₪{income.amount.toFixed(2)}</span>
                      <button 
                        onClick={() => {
                          const newIncomes = customIncomes.filter(i => i.id !== income.id);
                          setCustomIncomes(newIncomes);
                          updateFirestore(customExpenses, newIncomes);
                        }}
                        className="delete-btn"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default General;