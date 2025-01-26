import React from 'react';
import { FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { Expense } from '../../types';
import './styles.css';

interface ActionButtonsProps {
  expenses: Expense[];
  onShowReport: () => void;
  onShowAnalytics: () => void;
  onShowPastReports: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  expenses,
  onShowReport,
  onShowAnalytics,
  onShowPastReports,
}) => {
  const handleDownloadExcel = () => {
    if (expenses.length === 0) {
      alert('אין הוצאות להורדה');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(expenses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    XLSX.writeFile(workbook, 'Expense_Report.xlsx');
  };

  return (
    <div className="report-buttons">
      <button onClick={onShowReport} className="report-button">
        דו"ח הוצאות
      </button>
      <button onClick={onShowAnalytics} className="report-button">
        אנליזות
      </button>
      <button className="past-reports-button" onClick={onShowPastReports}>דו"חות עבר</button>
      <button onClick={handleDownloadExcel} className="excel-button">
        <FaFileExcel />
        Excel הורד כקובץ
      </button>
    </div>
  );
};