import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Expense, CategoryBalance, COLORS, INITIAL_BALANCE } from '../../types';
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
  incomes: {
    id: string;
    amount: number;
    date: string;
    description: string;
  }[];
  fixedExpenses: {
    description: string;
    amount: number;
  }[];
}

const General: React.FC<GeneralProps> = ({ expenses, balances, actionBtnClicked, onClose }) => {
  const [customExpenses, setCustomExpenses] = useState<CustomExpense[]>([]);
  const [incomes, setIncomes] = useState<MonthlyData['incomes']>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [newIncome, setNewIncome] = useState({
    amount: '',
    date: '',
    description: ''
  });

  // Set default date and selected month on component mount
  useEffect(() => {
    const jerusalemDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
    const dateObj = new Date(jerusalemDate);
    const monthKey = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
    setSelectedMonth(monthKey);
  }, []);

  // Fetch custom data from Firestore
  useEffect(() => {
    const fetchCustomData = async () => {
      const docRef = doc(db, 'customData', 'generalData');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomExpenses(data.expenses || []);
        setIncomes(data.incomes || []);
      }
    };

    fetchCustomData();
  }, []);

  // Calculate monthly data including fixed expenses
  const monthlyData = useMemo(() => {
    const data: Record<string, MonthlyData> = {};
    
    // Process fixed expenses from generalBalance
    const processMonth = (monthKey: string) => {
      if (!data[monthKey]) {
        data[monthKey] = {
          month: monthKey,
          expenses: [],
          incomes: [],
          fixedExpenses: Object.entries(generalBalance['fixed-expenses']).map(([description, amount]) => ({
            description,
            amount: Number(amount)
          }))
        };
      }
    };

    // Process regular expenses
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      processMonth(monthKey);
    });

    // Process custom expenses
    customExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      processMonth(monthKey);
      data[monthKey].expenses.push(expense);
    });

    // Process incomes
    incomes.forEach(income => {
      const date = new Date(income.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      processMonth(monthKey);
      data[monthKey].incomes.push(income);
    });

    return data;
  }, [expenses, customExpenses, incomes]);

  // Get chart data for selected month
  const chartData = useMemo(() => {
    const selectedData = monthlyData[selectedMonth];
    if (!selectedData) return [];

    const totalExpenses = selectedData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalFixedExpenses = selectedData.fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomes = selectedData.incomes.reduce((sum, inc) => sum + inc.amount, 0);

    return [
      { name: 'הוצאות משתנות', amount: totalExpenses },
      { name: 'הוצאות קבועות', amount: totalFixedExpenses },
      { name: 'הכנסות', amount: totalIncomes },
      { name: 'מאזן', amount: totalIncomes - (totalExpenses + totalFixedExpenses) }
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
    await updateFirestore(newExpenses, incomes);
    setNewExpense({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Update Firestore
  const updateFirestore = async (newExpenses: CustomExpense[], newIncomes: MonthlyData['incomes']) => {
    const docRef = doc(db, 'customData', 'generalData');
    try {
      await setDoc(docRef, {
        expenses: newExpenses,
        incomes: newIncomes
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
        <h2>כללי</h2>

        <div className="month-selector">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-select"
          >
            {Object.keys(monthlyData).map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>

        <div className="chart-section">
          <h3>מאזן חודשי</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `₪${Number(value).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="fixed-expenses-section">
          <h3>הוצאות קבועות לחודש</h3>
          {monthlyData[selectedMonth]?.fixedExpenses.map((expense, index) => (
            <div key={index} className="fixed-expense-item">
              <span className="description">{expense.description}</span>
              <span className="amount">₪{expense.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="expense-section">
          <h3>הוספת הוצאה</h3>
          <div className="input-group">
            <input
              type="number"
              placeholder="סכום *"
              value={newExpense.amount}
              onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="תיאור *"
              value={newExpense.description}
              onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
              required
            />
            <input
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
            />
            <button onClick={handleAddExpense}>הוסף הוצאה</button>
          </div>
        </div>

        <div className="existing-data">
          <h3>הוצאות קיימות</h3>
          <div className="expenses-list">
            {customExpenses.map((expense) => (
              <div key={expense.id} className="expense-item">
                <span className="date">{new Date(expense.date).toLocaleDateString('he-IL')}</span>
                <span className="description">{expense.description}</span>
                <span className="amount">{expense.displayAmount}</span>
                <button 
                  onClick={() => {
                    const newExpenses = customExpenses.filter(e => e.id !== expense.id);
                    setCustomExpenses(newExpenses);
                    updateFirestore(newExpenses, incomes);
                  }}
                  className="delete-btn"
                >
                  מחק
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default General;