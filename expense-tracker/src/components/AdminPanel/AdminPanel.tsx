import React, { useState } from 'react';
import { FaUpload, FaDownload } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { CategoryBalance, Expense } from '../../types';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

import './styles.css';

interface AdminPanelProps {
  expenses: Expense[];
  balances: CategoryBalance;
  setBalances: React.Dispatch<React.SetStateAction<CategoryBalance>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  updateExpenseData: (balances: CategoryBalance, expenses: Expense[]) => Promise<void>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  expenses,
  balances,
  setBalances,
  setExpenses,
  updateExpenseData
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleEscape = () => {
    if (isOpen) {
      setIsOpen(false);
      setMessage('');
      setError(null);
    }
  };

  useKeyboardShortcuts({
    onEscape: handleEscape,
  });

  const parseExcelDate = (dateValue: string | number): Date => {
    // If it's a number (Excel serial date)
    if (typeof dateValue === 'number') {
      const utc = new Date(Date.UTC(1899, 11, 30)); // Start date in Excel is Dec 30, 1899
      utc.setDate(utc.getDate() + dateValue);
      return utc;
    }
  
    // If it's a string, try different formats
    if (typeof dateValue === 'string') {
      // Try parsing as ISO date first
      const isoDate = new Date(dateValue);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
  
      // Check if the date is in a "dd.mm.yyyy" format
      if (dateValue.includes('.')) {
        const parts = dateValue.split('.');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
      }
  
      // Handle slash and dash separated date formats
      const parts = dateValue.split(/[./\s-]/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
  
        // If year is in two digits, assume 20xx
        if (year < 100) year += 2000;
  
        // Handle time part if present (HH:MM)
        const timePart = parts.length === 4 ? parts[3] : '';
  
        const date = new Date(year, month, day);
  
        if (timePart) {
          const [hours, minutes] = timePart.split(':').map(Number);
          date.setHours(hours, minutes);
        }
  
        return date;
      }
    }
  
    throw new Error(`Invalid date format: ${dateValue}`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      setMessage('');
      const file = event.target.files?.[0];
      if (!file) {
        setError('No file selected');
        return;
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error('No data read from file');
          }

          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { raw: false });

          if (rows.length === 0) {
            throw new Error('No data found in Excel file');
          }

          const updatedExpenses = [...expenses];
          const updatedBalances = { ...balances };
          let importedCount = 0;

          for (const row of rows) {
            if (!row.category || !row.amount || !row.date) {
              console.warn('Skipping row due to missing required fields:', row);
              continue;
            }

            // Validate that the category exists in CategoryBalance
            if (!(row.category in balances)) {
              console.warn('Invalid category:', row.category);
              continue;
            }
          
            try {
              const parsedDate = parseExcelDate(row.date);
              const amountNumber = parseFloat(row.amount.toString().replace(/[^\d.-]/g, ''));
          
              if (isNaN(amountNumber)) {
                console.warn('Invalid amount:', row.amount);
                continue;
              }
          
              updatedBalances[row.category as keyof CategoryBalance] -= amountNumber;
          
              const newExpense: Expense = {
                category: row.category as keyof CategoryBalance,
                amount: amountNumber,
                date: parsedDate.toISOString(),
                displayAmount: amountNumber.toLocaleString('he-IL'),
                note: row.note || '',
              };
          
              updatedExpenses.push(newExpense);
              importedCount++;
            } catch (err) {
              console.error('Error processing row:', row, err);
            }
          }
          
          if (importedCount > 0) {
            setBalances(updatedBalances);
            setExpenses(updatedExpenses);
            await updateExpenseData(updatedBalances, updatedExpenses);
            setMessage(`Successfully imported ${importedCount} expenses`);
          } else {
            setError('No valid expenses found to import');
          }
          
          event.target.value = '';

        } catch (err) {
          console.error('Error processing file data:', err);
          setError(err instanceof Error ? err.message : 'Error processing file');
        }
      };

      reader.onerror = () => {
        setError('Error reading file');
      };

      reader.readAsArrayBuffer(file);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const handleDownloadExcel = () => {
    if (expenses.length === 0) {
      alert('אין הוצאות להורדה');
      return;
    }
    
    // Format expenses for export
    const exportExpenses = expenses.map(expense => ({
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      note: expense.note || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportExpenses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    XLSX.writeFile(workbook, 'Expense_Report.xlsx');
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessage('');
    setError(null);
  };

  return (
    <>
    <div className="admin-panel-wrapper">
      <button 
        className="admin-button"
        onClick={() => setIsOpen(true)}
      >
        Excel Options
      </button>
    </div>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Excel Operations</h2>
              <button className="close-button" onClick={handleClose}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="excel-operations">
                <div className="excel-buttons">
                  <label className="excel-button upload">
                    <FaUpload /> יבא הוצאות מקובץ אקסל
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      onClick={(e) => (e.target as HTMLInputElement).value = ''}
                      style={{ display: 'none' }}
                    />
                  </label>
                  
                  <button 
                    className="excel-button download"
                    onClick={handleDownloadExcel}
                  >
                    <FaDownload /> הורד כקובץ אקסל
                  </button>
                </div>
              </div>

              {message && (
                <div className="message success">
                  {message}
                </div>
              )}
              
              {error && (
                <div className="message error">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPanel;