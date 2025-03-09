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
  autoConfirmed?: boolean;  // Add this field to handle auto-confirmation
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
  const [pendingAutoConfirm, setPendingAutoConfirm] = useState<VoiceData | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && !isNaN(Number(amount))) {
      onSubmit(Number(amount), note);
      setAmount('');
      setNote('');
    }
  };

  // Effect to handle auto-confirm after category is set
  React.useEffect(() => {
    // If we have a pending auto-confirm and a selected category
    if (pendingAutoConfirm && selectedCategory) {
      console.log("Processing delayed auto-confirm with category:", selectedCategory);
      
      // Submit the expense
      onSubmit(pendingAutoConfirm.amount, pendingAutoConfirm.note);
      
      // Reset states
      setAmount('');
      setNote('');
      setPendingAutoConfirm(null);
    }
  }, [pendingAutoConfirm, selectedCategory, onSubmit]);

  const handleVoiceRecognition = (data: { 
    amount: number; 
    note: string; 
    category?: keyof CategoryBalance;
    autoConfirmed?: boolean;
  }) => {
    console.log("Voice recognition data received:", data);
    
    // Category-only selection (first step)
    if (data.category && data.amount === 0 && !data.autoConfirmed) {
      console.log("Setting up category only:", data.category);
      onCategorySelect(data.category);
      return;
    }
    
    // For auto-confirmed transactions with amount and category
    if (data.amount > 0 && data.autoConfirmed && data.category) {
      console.log("Processing auto-confirmed transaction with category:", data.category);
      
      // First set the category
      onCategorySelect(data.category);
      
      // Then queue the expense to be submitted once category is set
      setPendingAutoConfirm(data);
    }
    // For manually confirmed transactions or setting form values
    else if (data.amount > 0) {
      // Set the category if provided
      if (data.category) {
        console.log("Setting category for manual confirmation:", data.category);
        onCategorySelect(data.category);
      }
      
      // Update form values
      setAmount(data.amount.toString());
      setNote(data.note);
      
      // Store voice data for confirmation dialog
      setVoiceData(data);
      
      // Show confirmation if category is available
      if (data.category) {
        // Short delay to ensure category is set
        setTimeout(() => {
          setShowConfirmation(true);
        }, 150);
      }
    }
  };

  const handleConfirm = () => {
    if (voiceData && selectedCategory) {
      // Submit the expense
      onSubmit(voiceData.amount, voiceData.note);
      
      // Reset form and state
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