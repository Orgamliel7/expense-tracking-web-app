import React, { useState, useEffect } from 'react';
import { Expense, CategoryBalance, COLORS } from '../../types';
import { Search } from 'lucide-react';
import './categorySearch.css';

interface CategorySearchModalProps {
  allExpenses: Record<string, Expense[]>;
  onClose: () => void;
}

export const CategorySearchModal: React.FC<CategorySearchModalProps> = ({ 
  allExpenses,
  onClose 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    // Extract all unique categories from expenses
    const uniqueCategories = new Set<string>();
    
    Object.values(allExpenses).forEach(monthExpenses => {
      monthExpenses.forEach(expense => {
        uniqueCategories.add(expense.category as string);
      });
    });
    
    setCategories(Array.from(uniqueCategories));
  }, [allExpenses]);

  useEffect(() => {
    if (selectedCategory) {
      // Flatten and filter expenses by selected category
      const filtered = Object.values(allExpenses)
        .flat()
        .filter(expense => expense.category === selectedCategory)
        // Sort by date (newest first)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setFilteredExpenses(filtered);
    } else {
      setFilteredExpenses([]);
    }
  }, [selectedCategory, allExpenses]);

  const formatAmount = (amount: number | string) => {
    if (amount === undefined || amount === null) return "₪0";
    
    // Convert string to number if needed
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Check if it's a valid number
    if (isNaN(numAmount)) return "₪0";
    
    const absValue = Math.abs(numAmount).toLocaleString();
    return numAmount < 0 ? `-₪${absValue}` : `₪${absValue}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  // Calculate total for selected category
  const calculateTotal = () => {
    if (!selectedCategory || filteredExpenses.length === 0) return 0;
    
    return filteredExpenses.reduce((sum, expense) => {
      if (expense.amount === undefined || expense.amount === null) return sum;
      
      const amount = typeof expense.amount === 'string' 
        ? parseFloat(expense.amount) 
        : expense.amount;
      
      return isNaN(amount) ? sum : sum + amount;
    }, 0);
  };

  const total = calculateTotal();

  return (
    <div className="category-search-modal">
      <div className="category-search-content">
        <div className="category-search-header">
          {selectedCategory ? (
            <>
              <button 
                onClick={handleBackToCategories} 
                className="back-button"
              >
                ←
              </button>
              <h2 style={{ color: COLORS[selectedCategory as keyof typeof COLORS] }}>
                {selectedCategory}
              </h2>
            </>
          ) : (
            <>
              <h2>חיפוש לפי קטגוריה</h2>
              <div className="search-icon">
                <Search size={24} />
              </div>
            </>
          )}
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="category-search-body">
          {!selectedCategory ? (
            <div className="categories-grid">
              {categories.map((category) => (
                <div 
                  key={category}
                  className="category-card"
                  style={{ backgroundColor: COLORS[category as keyof typeof COLORS] }}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className="category-name">{category}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="category-expenses">
              <div className="expenses-summary">
                <span className="expenses-count">סה"כ {filteredExpenses.length} הוצאות</span>
                <span className="expenses-total">
                  סכום כולל: <strong>{formatAmount(total)}</strong>
                </span>
              </div>
              
              {filteredExpenses.length === 0 ? (
                <div className="no-expenses">לא נמצאו הוצאות בקטגוריה זו</div>
              ) : (
                <div className="expenses-list">
                  {filteredExpenses.map((expense, index) => {
                    // Always ensure we have an amount to display
                    let displayAmount;
                    if (expense.displayAmount) {
                      displayAmount = expense.displayAmount;
                    } else if (expense.amount !== undefined && expense.amount !== null) {
                      displayAmount = formatAmount(expense.amount);
                    } else {
                      displayAmount = "₪0";
                    }
                    
                    return (
                      <div 
                        key={`${expense.date}-${index}`}
                        className="expense-history-item"
                      >
                        <div className="expense-details">
                          <div className="expense-date">
                            {formatDate(expense.date)}
                          </div>
                          <div className="expense-amount">
                            {displayAmount}
                          </div>
                          {expense.note && (
                            <div className="expense-note">{expense.note}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};