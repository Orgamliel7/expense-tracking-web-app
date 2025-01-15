import React from 'react';
import { CategoryBalance, COLORS } from '../../types';
import './styles.css';

interface CategoryButtonsProps {
  balances: CategoryBalance;
  selectedCategory: keyof CategoryBalance | null;
  onCategorySelect: (category: keyof CategoryBalance) => void;
}

export const CategoryButtons: React.FC<CategoryButtonsProps> = ({
  balances,
  selectedCategory,
  onCategorySelect,
}) => (
  <div className="category-buttons">
    {Object.keys(balances).map((category) => (
      <button
        key={category}
        onClick={() => onCategorySelect(category as keyof CategoryBalance)}
        className={`category-button ${selectedCategory === category ? 'selected' : ''}`}
        style={{
          backgroundColor: selectedCategory === category ? COLORS[category as keyof CategoryBalance] : '#E8E8E8',
        }}
      >
        {category}
      </button>
    ))}
  </div>
);