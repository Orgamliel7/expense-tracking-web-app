import React, { useState } from 'react';
import { CategoryBalance } from '../../types';
import { VoiceRecognitionButton } from '../VoiceRecognitionButton/VoiceRecognitionButton';
import { ConfirmationModal } from '../ConfirmationModal/ConfirmationModal';
import './styles.css';

interface ExpenseFormProps {
  selectedCategory: keyof CategoryBalance | null;
  onSubmit: (amount: number, note: string) => void;
  onCategorySelect: (category: keyof CategoryBalance | null) => void;
}

// Define an interface for voice data
interface VoiceData {
  amount: number;
  note: string;
  category?: keyof CategoryBalance;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ 
  selectedCategory, 
  onSubmit, 
  onCategorySelect 
}) => {
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [voiceData, setVoiceData] = useState<VoiceData | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && !isNaN(Number(amount))) {
      onSubmit(Number(amount), note);
      setAmount('');
      setNote('');
    }
  };

  const handleVoiceRecognition = (data: { 
    amount: number; 
    note: string; 
    category?: keyof CategoryBalance 
  }) => {
    setVoiceData(data);
    
    // If we have both amount and category, show confirmation
    if (data.amount > 0 && data.category) {
      // Set the category in the parent component
      onCategorySelect(data.category);
      setShowConfirmation(true);
    } else if (data.amount > 0) {
      // Just set the form data but no confirmation (no category detected)
      setAmount(data.amount.toString());
      setNote(data.note);
    }
  };

  const handleConfirm = () => {
    if (voiceData && selectedCategory) {
      // Submit the expense
      onSubmit(voiceData.amount, voiceData.note);
      // Reset form
      setAmount('');
      setNote('');
      setVoiceData(null);
      setShowConfirmation(false);
    }
  };

  const handleCancel = () => {
    // Just close the modal but keep the form values
    setShowConfirmation(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="expense-form">
        <div className="input-with-voice">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="הזן סכום"
            className="amount-input"
          />
          <VoiceRecognitionButton onRecognitionComplete={handleVoiceRecognition} />
        </div>
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

      {showConfirmation && voiceData && selectedCategory && (
        <ConfirmationModal
          amount={voiceData.amount}
          note={voiceData.note}
          category={selectedCategory}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};