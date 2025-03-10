import React from 'react';
import { Expense } from '../../types';
import './styles.css';

interface ActionButtonsProps {
  expenses: Expense[];
  onShowReport: () => void;
  onShowAnalytics: () => void;
  onShowPastReports: () => void;
  onShowSmallCash: () => void;
  onShowGeneral: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  expenses,
  onShowReport,
  onShowAnalytics,
  onShowPastReports,
  onShowSmallCash,
  onShowGeneral,
}) => {
  return (
    <div className="action-buttons-grid">
      <div className="action-buttons-row">
        <button onClick={onShowGeneral} className="general-button">
          כללי
        </button>
        <button onClick={onShowSmallCash} className="small-cash-button">
          קופה קטנה
        </button>
        <button onClick={onShowReport} className="report-button">
          דו"ח הוצאות
        </button>
      </div>
      <div className="action-buttons-row">
        <button onClick={onShowAnalytics} className="report-button analytics-button">
          אנליזות
        </button>
        <button className="past-reports-button" onClick={onShowPastReports}>
          דו"חות עבר
        </button>
      </div>
    </div>
  );
};
