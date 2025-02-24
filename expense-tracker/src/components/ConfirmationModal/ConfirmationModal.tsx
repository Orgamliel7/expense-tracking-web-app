import React from 'react';
import { CategoryBalance } from '../../types';
import './styles.css';

interface ConfirmationModalProps {
  amount: number;
  note: string;
  category: keyof CategoryBalance;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  amount,
  note,
  category,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="modal-overlay">
      <div className="confirmation-modal">
        <h3>אישור הוצאה</h3>
        <p className="confirmation-message">
          {"האם להפחית " + amount + " שקלים ממאזן " + category + "?"}
        </p>
        {note && <p className="note-preview">{"הערה: " + note}</p>}
        
        <div className="confirmation-buttons">
          <button className="confirm-button" onClick={onConfirm}>
            אישור
          </button>
          <button className="cancel-button" onClick={onCancel}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};