import React, { useState } from 'react';
import { CategoryBalance } from '../../types';
import './styles.css';

interface ExpenseFormProps {
  selectedCategory: keyof CategoryBalance | null;
  onSubmit: (amount: number, note: string) => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ selectedCategory, onSubmit }) => {
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && !isNaN(Number(amount))) {
      onSubmit(Number(amount), note);
      setAmount('');
      setNote('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="הזן סכום"
        className="amount-input"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="הערה (לא חובה)"
        className="note-input"
      />
      <button type="submit" disabled={!selectedCategory || !amount} className="submit-button">
        אישור
      </button>
    </form>
  );
};  