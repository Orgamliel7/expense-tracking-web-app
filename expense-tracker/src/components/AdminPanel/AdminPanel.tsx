import React, { useState, useEffect } from 'react';
import { FaUpload, FaDownload, FaEdit, FaSearch, FaEnvelope } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { CategoryBalance, Expense, INITIAL_BALANCE } from '../../types';
import { updateInitialBalance as updateInitialBalanceInFirebase } from '../../types';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import generalBalance from '../../values';

import './styles.css';

interface AdminPanelProps {
  expenses: Expense[];
  balances: CategoryBalance;
  setBalances: React.Dispatch<React.SetStateAction<CategoryBalance>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  updateExpenseData: (balances: CategoryBalance, expenses: Expense[]) => Promise<void>;
  updateInitialBalance?: (newInitialBalance: CategoryBalance) => Promise<boolean>;
  onClose?: () => void;
}

interface SearchResult {
  source: 'expenseData' | 'smallCashData' | 'generalData';
  category: string;
  amount: number;
  date: string;
  note: string;
}

// Add this TypeScript declaration to avoid type errors
declare global {
  interface Window {
    emailjs: any;
  }
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  expenses,
  balances,
  setBalances,
  setExpenses,
  updateExpenseData,
  updateInitialBalance
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  // Use INITIAL_BALANCE as the starting point for the modal
  const [updatedInitialBalances, setUpdatedInitialBalances] = useState<CategoryBalance>({...INITIAL_BALANCE});

  // Check for end of month to send automatic email
  useEffect(() => {
    const checkEndOfMonth = () => {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Check if today is the last day of the month
      if (now.getDate() === lastDayOfMonth.getDate()) {
        // Check if we're in the last hour of the day
        if (now.getHours() === 23) {
          // Only send if we haven't sent yet this hour
          const lastSentKey = `lastExpenseEmailSent_${now.getFullYear()}_${now.getMonth()}`;
          const lastSent = localStorage.getItem(lastSentKey);
          
          if (!lastSent) {
            sendExpenseEmail();
            // Mark as sent for this month
            localStorage.setItem(lastSentKey, new Date().toISOString());
          }
        }
      }
    };

    // Check every hour
    const intervalId = setInterval(checkEndOfMonth, 60 * 60 * 1000);
    
    // Also check when component mounts
    checkEndOfMonth();

    return () => clearInterval(intervalId);
  }, [expenses]);

  const handleEscape = () => {
    if (isOpen) {
      setIsOpen(false);
      setMessage('');
      setError(null);
    }
    if (showBalanceModal) {
      setShowBalanceModal(false);
    }
    if (showSearchModal) {
      setShowSearchModal(false);
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

  const createExpenseWorkbook = () => {
    if (expenses.length === 0) {
      return null;
    }
    
    // Format expenses for export
    const exportExpenses = expenses.map(expense => ({
      category: expense.category,
      amount: expense.amount,
      date: new Date(expense.date).toLocaleDateString('he-IL'),
      note: expense.note || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportExpenses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    
    return workbook;
  };

  const handleDownloadExcel = () => {
    const workbook = createExpenseWorkbook();
    
    if (!workbook) {
      alert('אין הוצאות להורדה');
      return;
    }
    
    XLSX.writeFile(workbook, 'Expense_Report.xlsx');
  };

  // Load EmailJS script
  const loadEmailJSScript = async () => {
    // Only load if not already loaded
    if (typeof window.emailjs === 'undefined') {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load EmailJS script'));
        document.body.appendChild(script);
      });
    }
    return Promise.resolve();
  };

  const sendExpenseEmail = async () => {
    try {
      setIsSendingEmail(true);
      setError(null);
      setMessage('');
      
      const workbook = createExpenseWorkbook();
      
      if (!workbook) {
        setError('אין הוצאות לשליחה');
        setIsSendingEmail(false);
        return;
      }
      
      // Convert workbook to base64 string
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Get email from generalBalance - get the first key
      const recipientEmail = Object.keys(generalBalance.email)[0];
      
      // Get other EmailJS details from generalBalance
      const serviceID = Object.keys(generalBalance.serviceID)[0]; // Get service ID from values.js
      const templateID = Object.keys(generalBalance.templateID)[0]; // Get template ID from values.js
      const publicKey = Object.keys(generalBalance.publicKey)[0]; // Get public key from values.js
      
      // Convert Blob to Base64 string for email attachment
      const reader = new FileReader();
      const base64FilePromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result?.toString().split(',')[1];
          if (base64String) {
            resolve(base64String);
          } else {
            reject(new Error('Failed to convert file to base64'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      
      const base64File = await base64FilePromise;
      
      // Load EmailJS script
      await loadEmailJSScript();
      
      // Initialize EmailJS with the public key
      window.emailjs.init(publicKey);
      
      // Current date for the email subject
      const currentDate = new Date().toLocaleDateString('he-IL');
      
      // Send email with the Excel file attached
      await window.emailjs.send(
        serviceID,
        templateID,
        {
          to_email: recipientEmail,
          message: `דו״ח הוצאות מעודכן ליום ${currentDate}`,
          attachment: base64File,
          filename: `Expense_Report_${currentDate}.xlsx`
        }
      );
      
      setMessage(`דו״ח הוצאות נשלח בהצלחה ל-${recipientEmail}`);
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת המייל');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleShowBalanceModal = () => {
    // Reset to current INITIAL_BALANCE when opening modal
    setUpdatedInitialBalances({...INITIAL_BALANCE});
    setShowBalanceModal(true);
  };

  const handleBalanceChange = (category: keyof CategoryBalance, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setUpdatedInitialBalances({
        ...updatedInitialBalances,
        [category]: numValue
      });
    }
  };
  
  const handleUpdateInitialBalances = async () => {
    try {
      // Calculate the difference in values to add to current balances
      const newBalances = {...balances};
      
      // For each category, add the difference between updated and initial values
      Object.keys(updatedInitialBalances).forEach(key => {
        const category = key as keyof CategoryBalance;
        const currentInitial = INITIAL_BALANCE[category];
        const newInitial = updatedInitialBalances[category];
        const difference = newInitial - currentInitial;
        
        // Only update if there's a change
        if (difference !== 0) {
          newBalances[category] += difference;
        }
      });
      
      // Update the balances first
      setBalances(newBalances);
      await updateExpenseData(newBalances, expenses);
      
      // Use the imported direct function if prop isn't available
      let success = false;
      if (updateInitialBalance) {
        success = await updateInitialBalance({...updatedInitialBalances});
      } else {
        // Import this from index.ts
        success = await updateInitialBalanceInFirebase({...updatedInitialBalances});
      }
      
      if (success) {
        setMessage('התקציב ההתחלתי עודכן בהצלחה');
      } else {
        setError('שמירת התקציב ההתחלתי נכשלה');
      }
      
      setShowBalanceModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון התקציב ההתחלתי');
    }
  };

  const handleShowSearchModal = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchModal(true);
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError("יש להזין מילת חיפוש");
      return;
    }
  
    try {
      setIsSearching(true);
      setError(null);
      setSearchResults([]);
  
      const term = searchTerm.toLowerCase();
  
      // Fetch documents from Firestore
      const expenseDocRef = doc(db, "balances", "expenseData");
      const smallCashDocRef = doc(db, "balances", "smallCashData");
      const generalDataDocRef = doc(db, "customData", "generalData");
  
      const [expenseSnap, smallCashSnap, generalDataSnap] = await Promise.all([
        getDoc(expenseDocRef),
        getDoc(smallCashDocRef),
        getDoc(generalDataDocRef),
      ]);
  
      const expenseData = expenseSnap.exists() ? expenseSnap.data()?.expenses || [] : [];
      const smallCashData = smallCashSnap.exists() ? smallCashSnap.data()?.expenses || [] : [];
      const generalData = generalDataSnap.exists() ? generalDataSnap.data()?.expenses || [] : [];
  
      // Explicitly define source type using type assertion
      const filterBySearchTerm = (
        data: any[],
        source: "expenseData" | "smallCashData" | "generalData" // Enforce strict type
      ): SearchResult[] =>
        data
          .filter((expense) => expense.note && expense.note.toLowerCase().includes(term))
          .map((expense) => ({
            source, // Now it's strictly typed
            category: String(expense.category),
            amount: Number(expense.amount),
            date: String(expense.date),
            note: String(expense.note),
          }));
  
      const expenseResults = filterBySearchTerm(expenseData, "expenseData");
      const smallCashResults = filterBySearchTerm(smallCashData, "smallCashData");
      const generalResults = filterBySearchTerm(generalData, "generalData");
  
      // Combine and sort results by date (newest first)
      const combinedResults: SearchResult[] = [...expenseResults, ...smallCashResults, ...generalResults].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  
      setSearchResults(combinedResults);
  
      if (combinedResults.length === 0) {
        setMessage("לא נמצאו תוצאות עבור החיפוש");
      }
    } catch (error) {
      console.error("Error searching expenses:", error);
      setError("שגיאה בחיפוש נתונים");
    } finally {
      setIsSearching(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL');
    } catch (error) {
      return dateString;
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessage('');
    setError(null);
  };

  return (
    <>
      <button 
        className="admin-button"
        onClick={() => setIsOpen(true)}
      >
        Admin Options
      </button>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Admin Operations</h2>
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

                  <button 
                    className="excel-button send-email"
                    onClick={sendExpenseEmail}
                    disabled={isSendingEmail}
                  >
                    <FaEnvelope /> {isSendingEmail ? 'שולח...' : 'שלח דו״ח במייל'}
                  </button>

                  <button 
                    className="excel-button update-balance"
                    onClick={handleShowBalanceModal}
                  >
                    <FaEdit /> שנה ערך התחלתי
                  </button>
                  
                  <button 
                    className="excel-button search"
                    onClick={handleShowSearchModal}
                  >
                    <FaSearch /> חיפוש בהוצאות
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

      {showBalanceModal && (
        <div className="modal-overlay">
          <div className="modal-content balance-modal">
            <div className="modal-header">
              <h2>עדכון ערך התחלתי</h2>
              <button className="close-button" onClick={() => setShowBalanceModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="balance-form-info">
                שינוי ערך התחלתי ישפיע על יתרת התקציב הנוכחית באופן חד פעמי בלבד. 
                לדוגמה: אם תשנה את הערך מ-200 ל-300, יתווספו 100 ש״ח ליתרת הקטגוריה באופן חד פעמי.
              </div>
              
              <div className="balance-form">
                {Object.keys(updatedInitialBalances).map((category) => (
                  <div key={category} className="balance-item">
                    <label htmlFor={`balance-${category}`}>{category}</label>
                    <div className="input-row">
                      <input
                        id={`balance-${category}`}
                        type="number"
                        min="0"
                        value={updatedInitialBalances[category as keyof CategoryBalance]}
                        onChange={(e) => handleBalanceChange(category as keyof CategoryBalance, e.target.value)}
                      />
                      <span className="currency-symbol">₪</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="balance-actions">
                <button 
                  className="balance-submit"
                  onClick={handleUpdateInitialBalances}
                >
                  שמור שינויים
                </button>
                <button 
                  className="balance-cancel"
                  onClick={() => setShowBalanceModal(false)}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSearchModal && (
        <div className="modal-overlay">
          <div className="modal-content search-modal">
            <div className="modal-header">
              <h2>חיפוש בהערות ההוצאות</h2>
              <button className="close-button" onClick={() => setShowSearchModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="search-form">
                <div className="search-input-container">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    placeholder="הזן מילת חיפוש..."
                    className="search-input"
                  />
                  <button 
                    className="search-button"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? 'מחפש...' : 'חפש'}
                  </button>
                </div>
                
                {error && (
                  <div className="message error">
                    {error}
                  </div>
                )}
                
                {message && searchResults.length === 0 && (
                  <div className="message info">
                    {message}
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="search-results">
                    <div className="results-count">נמצאו {searchResults.length} תוצאות</div>
                    <div className="results-table-container">
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>תאריך</th>
                            <th>קטגוריה</th>
                            <th>סכום</th>
                            <th>הערה</th>
                            <th>מקור</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchResults.map((result, index) => (
                            <tr key={index}>
                              <td>{formatDate(result.date)}</td>
                              <td>{result.category}</td>
                              <td className="amount-cell">₪{result.amount.toLocaleString('he-IL')}</td>
                              <td className="note-cell">{result.note}</td>
                              <td>
                                {result.source === 'expenseData' && 'הוצאות כלליות'}
                                {result.source === 'smallCashData' && 'הוצאות יומיומיות'}
                                {result.source === 'generalData' && 'מידע כללי'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPanel;