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
  category: keyof CategoryBalance;
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
          const rows: RowData[] = XLSX.utils.sheet_to_json(firstSheet, { raw: false });

          if (rows.length === 0) {
            throw new Error('No data found in Excel file');
          }

          const updatedExpenses = [...expenses];
          const updatedBalances = { ...balances };

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
          
              updatedBalances[row.category] -= amountNumber;
          
              const newExpense: Expense = {
                category: row.category as keyof CategoryBalance,
                amount: amountNumber,
                date: parsedDate.toISOString(),
                displayAmount: amountNumber.toLocaleString('he-IL'),
                note: row.note || '',
              };
          
              updatedExpenses.push(newExpense);
            } catch (err) {
              console.error('Error processing row:', row, err);
            }
          }
          
          setBalances(updatedBalances);
          setExpenses(updatedExpenses);
          await updateExpenseData(updatedBalances, updatedExpenses);
          
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

  return (
    <div className="expense-uploader">
      <label htmlFor="excel-upload" className="upload-button">
        יבא הוצאות מקובץ אקסל
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          onClick={(e) => (e.target as HTMLInputElement).value = ''}
        />
      </label>
      {error && (
        <div className="error-message">
          שגיאה: {error}
        </div>
      )}
    </div>
  );
};