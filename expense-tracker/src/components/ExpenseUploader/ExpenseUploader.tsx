import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Expense, CategoryBalance } from '../../types';
import './styles.css';

interface ExpenseUploaderProps {
  expenses: Expense[];
  balances: CategoryBalance;
  setBalances: React.Dispatch<React.SetStateAction<CategoryBalance>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  updateExpenseData: (balances: CategoryBalance, expenses: Expense[]) => Promise<void>;
}

interface RowData {
  category: string;
  amount: string | number;
  date: string | number;
  note?: string;
}

export const ExpenseUploader: React.FC<ExpenseUploaderProps> = ({
  expenses,
  balances,
  setBalances,
  setExpenses,
  updateExpenseData,
}) => {
  const [error, setError] = useState<string | null>(null);

  const parseExcelDate = (dateValue: string | number): Date => {
    // If it's a number (Excel serial date)
    if (typeof dateValue === 'number') {
      const utc = new Date(Date.UTC(1899, 11, 30)); // Start date in Excel is Dec 30, 1899
      utc.setDate(utc.getDate() + dateValue); // Adjust date by serial value
      return utc;
    }
  
    // If it's a string, try different formats
    if (typeof dateValue === 'string') {
      // Try parsing as ISO date first
      const isoDate = new Date(dateValue);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
  
      // Check if the date is in a "dd.mm.yyyy" format and flip day/month if so
      if (dateValue.includes('.')) {
        let parts = dateValue.split('.');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // JavaScript months are zero-based
          const year = parseInt(parts[2], 10);
          return new Date(year, day - 1, month); // Flipping day and month
        }
      }
  
      // Handle slash and dash separated date formats
      let parts = dateValue.split(/[./\s-]/); // Split by slashes, dots, spaces, or dashes
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JavaScript months are zero-based
        let year = parseInt(parts[2], 10);
  
        // If year is in two digits, assume 20xx
        if (year < 100) year += 2000;
  
        // Handle time part if present (HH:MM)
        const timePart = parts.length === 4 ? parts[3] : ''; // If there's a 4th part, it's the time
  
        // Return the date as a Date object (without time part for now)
        const date = new Date(year, month, day);
  
        if (timePart) {
          const [hours, minutes] = timePart.split(':').map(Number);
          date.setHours(hours, minutes); // Set the time if available
        }
  
        return date;
      }
    }
  
    throw new Error(`Invalid date format: ${dateValue}`);
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      const file = event.target.files?.[0];
      if (!file) {
        setError('No file selected');
        return;
      }

      console.log('Reading file:', file.name);

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error('No data read from file');
          }

          // Parse Excel file
          const workbook = XLSX.read(data, { type: 'array' });
          console.log('Workbook sheets:', workbook.SheetNames);

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: RowData[] = XLSX.utils.sheet_to_json(firstSheet, { raw: false });
          console.log('Parsed rows:', rows);

          if (rows.length === 0) {
            throw new Error('No data found in Excel file');
          }

          const updatedExpenses = [...expenses];
          const updatedBalances = { ...balances };

          for (const row of rows) {
            console.log('Processing row:', row);
            if (!row.category || !row.amount || !row.date) {
              console.warn('Skipping row due to missing required fields:', row);
              continue;
            }
          
            try {
              const parsedDate = parseExcelDate(row.date);
              const amountNumber = parseFloat(row.amount.toString().replace(/[^\d.-]/g, ''));
          
              if (isNaN(amountNumber)) {
                console.warn('Invalid amount:', row.amount);
                continue;
              }
          
              // Update balance (subtract the expense amount from the current balance)
              if (updatedBalances[row.category] !== undefined) {
                updatedBalances[row.category] -= amountNumber; // Subtract instead of adding
              } else {
                console.warn('Unknown category:', row.category);
                continue;
              }
          
              // Create new expense (use positive value for expenses)
              const newExpense: Expense = {
                note: row.note || '',
                category: row.category,
                amount: amountNumber, // Use the positive amount directly
                date: parsedDate.toISOString(),
                displayAmount: amountNumber.toLocaleString('he-IL'),
              };
          
              updatedExpenses.push(newExpense);
              console.log('Added expense:', newExpense);
            } catch (err) {
              console.error('Error processing row:', row, err);
            }
          }
          
          console.log('Setting new expenses:', updatedExpenses);
          console.log('Setting new balances:', updatedBalances);
          
          setBalances(updatedBalances);
          setExpenses(updatedExpenses);
          await updateExpenseData(updatedBalances, updatedExpenses);
          
          event.target.value = '';
          console.log('File processing completed successfully');

        } catch (err) {
          console.error('Error processing file data:', err);
          setError(err instanceof Error ? err.message : 'Error processing file');
        }
      };

      reader.onerror = () => {
        console.error('FileReader error');
        setError('Error reading file');
      };

      reader.readAsArrayBuffer(file);

    } catch (err) {
      console.error('Error in handleFileUpload:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  return (
    <div className="expense-uploader">
      <input 
        type="file" 
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        onClick={(e) => (e.target as HTMLInputElement).value = ''}
      />
      {error && (
        <div style={{ color: 'red', marginTop: '10px', direction: 'rtl' }}>
          שגיאה: {error}
        </div>
      )}
    </div>
  );
};
