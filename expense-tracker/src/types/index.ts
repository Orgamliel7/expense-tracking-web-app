import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface CategoryBalance {
  דלק: number;
  מסעדות: number;
  חופשות: number;
  בילויים: number;
  בגדים: number;
  חברים: number; 
  מעיין: number; 
  "טיפוח והנעלה": number; 
  "סופר": number; 
}

export interface Expense {
  category: keyof CategoryBalance;
  amount: number;
  date: string;
  note?: string;
  displayAmount: string; 
}


// Default values as fallback if Firebase fetch fails
const DEFAULT_BALANCE: CategoryBalance = {
  דלק: 1200,
  מסעדות: 550,
  חופשות: 400,
  בילויים: 350,
  בגדים: 400,
  חברים: 300,
  מעיין: 120,  
  "טיפוח והנעלה": 150, 
  "סופר": 1300, 
};

// Initial export that will be updated after fetch
export let INITIAL_BALANCE: CategoryBalance = { ...DEFAULT_BALANCE };

// Function to fetch initial balance from Firebase
export const fetchInitialBalance = async (): Promise<void> => {
  try {
    const docRef = doc(db, 'balances', 'initialBalance');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data()) {
      const data = docSnap.data();
      // Validate the data has all required keys
      const isValidBalance = Object.keys(DEFAULT_BALANCE).every(key => 
        typeof data[key] === 'number' && !isNaN(data[key])
      );
      
      if (isValidBalance) {
        INITIAL_BALANCE = data as CategoryBalance;
        console.log('Initial balance loaded from Firebase');
      } else {
        console.warn('Invalid balance data in Firebase, using defaults');
      }
    } else {
      // If document doesn't exist, create it with default values
      await setDoc(docRef, DEFAULT_BALANCE);
      console.log('Created default initial balance in Firebase');
    }
  } catch (error) {
    console.error('Error fetching initial balance:', error);
    // Fallback to default values on error
  }
};

// Function to update initial balance in Firebase
export const updateInitialBalance = async (newBalance: CategoryBalance): Promise<boolean> => {
  try {
    const docRef = doc(db, 'balances', 'initialBalance');
    await setDoc(docRef, newBalance);
    // Update in-memory value as well
    INITIAL_BALANCE = { ...newBalance };
    console.log('Initial balance updated in Firebase');
    return true;
  } catch (error) {
    console.error('Error updating initial balance:', error);
    return false;
  }
};

export const COLORS = {
  דלק: '#FF6B6B',
  מסעדות: '#4ECDC4',
  חופשות: '#45B7D1',
  בילויים: '#FFD700',
  בגדים: '#FF8C00',
  חברים: '#7B68EE',
  מעיין: '#FF5733',  
  "טיפוח והנעלה": '#FF1493', 
  "סופר": '#32CD32', 
};

export type MonthlyReport = {
  month: string;
  balances: CategoryBalance;
  expenses: Expense[];
};
