import React, { useState, useRef, useEffect } from 'react';
import { CategoryBalance } from '../../types';
import { categorySynonyms } from './CategorySynonyms';
import './styles.css';

// Update type declarations to avoid the "used as a value" error
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Define SpeechRecognition type
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  resultReceived?: boolean; // Custom property
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface VoiceRecognitionButtonProps {
  onRecognitionComplete: (data: { amount: number; note: string; category?: keyof CategoryBalance }) => void;
}

export const VoiceRecognitionButton: React.FC<VoiceRecognitionButtonProps> = ({ 
  onRecognitionComplete 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [remainingTime, setRemainingTime] = useState(3);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [longPressActive, setLongPressActive] = useState(false);
  const [recognizedData, setRecognizedData] = useState<{ amount: number; note: string; category?: keyof CategoryBalance } | null>(null);
  const [autoConfirmCountdown, setAutoConfirmCountdown] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const autoConfirmTimerRef = useRef<number | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (autoConfirmTimerRef.current) clearInterval(autoConfirmTimerRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Handle auto-confirm countdown
  useEffect(() => {
    if (recognizedData && recognizedData.amount > 0 && recognizedData.category) {
      setAutoConfirmCountdown(3);
      
      if (autoConfirmTimerRef.current) {
        clearInterval(autoConfirmTimerRef.current);
      }
      
      autoConfirmTimerRef.current = window.setInterval(() => {
        setAutoConfirmCountdown(prev => {
          if (prev <= 1) {
            confirmTransaction();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (autoConfirmTimerRef.current) {
          clearInterval(autoConfirmTimerRef.current);
        }
      };
    }
  }, [recognizedData]);

  const confirmTransaction = () => {
    if (recognizedData) {
      onRecognitionComplete(recognizedData);
      setRecognizedData(null);
      if (autoConfirmTimerRef.current) {
        clearInterval(autoConfirmTimerRef.current);
        autoConfirmTimerRef.current = null;
      }
    }
  };

  const cancelTransaction = () => {
    setRecognizedData(null);
    if (autoConfirmTimerRef.current) {
      clearInterval(autoConfirmTimerRef.current);
      autoConfirmTimerRef.current = null;
    }
  };

  const startSpeechRecognition = (isLongPress = false) => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('זיהוי דיבור אינו נתמך בדפדפן זה');
      return;
    }

    setIsListening(true);
    setErrorMessage(null);
    
    // Clear any existing error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    
    if (!isLongPress) {
      setRemainingTime(3);
    }

    // Initialize speech recognition
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI() as SpeechRecognition;
    
    // Configure for Hebrew
    recognitionRef.current.lang = 'he-IL';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    
    // Set recording timeout only for regular (not long press) mode
    if (!isLongPress && timerRef.current === null) {
      timerRef.current = window.setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            stopListening();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Flag to track if we received any results
    recognitionRef.current.resultReceived = false;
    
    // Handle results
    recognitionRef.current.onresult = (event) => {
      if (!recognitionRef.current) return;
      
      recognitionRef.current.resultReceived = true;
      const transcript = event.results[0][0].transcript;
      console.log('Recognized text:', transcript);
      
      // Process the Hebrew text
      const processedData = processHebrewSpeech(transcript);
      
      // Check if we detected an amount
      if (processedData.amount <= 0) {
        showError('לא נקלטה שום הוצאה בהקלטה הקולית');
      } else {
        setRecognizedData(processedData);
        
        // For long press mode, we continue listening
        if (!longPressActive) {
          stopListening();
        }
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopListening();
      showError('שגיאה בזיהוי קולי');
    };

    recognitionRef.current.onend = () => {
      // Only show error if we didn't receive any results and we're still listening
      if (!recognitionRef.current?.resultReceived && isListening) {
        showError('לא נקלטה שום הוצאה בהקלטה הקולית');
      }
      
      if (!longPressActive) {
        setIsListening(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    };

    // Start listening
    recognitionRef.current.start();
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    // Set a new timeout to clear the error message
    errorTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage(null);
      errorTimeoutRef.current = null;
    }, 3000);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsListening(false);
    setLongPressActive(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Handle button press events for long-press functionality
  const handleMouseDown = () => {
    if (isListening) return;
    
    // Start a timer to detect long press
    longPressTimerRef.current = window.setTimeout(() => {
      setLongPressActive(true);
      startSpeechRecognition(true);
    }, 500); // 500ms threshold for long press
  };

  const handleMouseUp = () => {
    // If we've started a long press, stop listening
    if (longPressActive) {
      stopListening();
    } else {
      // If it was a short click, clear the long press timer and start normal recognition
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (!isListening) {
        startSpeechRecognition(false);
      }
    }
  };

  const handleMouseLeave = () => {
    // Clear the long press timer if the mouse leaves the button
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // If long press was active, stop listening
    if (longPressActive) {
      stopListening();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isListening) return;
    
    // Prevent default to avoid issues on mobile
    e.preventDefault();
    
    // Start a timer to detect long press
    longPressTimerRef.current = window.setTimeout(() => {
      setLongPressActive(true);
      startSpeechRecognition(true);
    }, 500); // 500ms threshold for long press
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Prevent default to avoid issues on mobile
    e.preventDefault();
    
    // If we've started a long press, stop listening
    if (longPressActive) {
      stopListening();
    } else {
      // If it was a short touch, clear the long press timer and start normal recognition
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (!isListening) {
        startSpeechRecognition(false);
      }
    }
  };

  // Function to process Hebrew speech
  const processHebrewSpeech = (text: string) => {
    // Extract amount - looking for patterns like "50 שקל" or just "50"
    const amountMatch = text.match(/(\d+)(\s+שקל|\s+שקלים)?/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
    
    // Use direct category names from your type definition
    const categoryKeys: (keyof CategoryBalance)[] = [
      'דלק',
      'מסעדות',
      'חופשות',
      'בילויים',
      'בגדים',
      'חברים',
      'מעיין',
      'טיפוח והנעלה',
      'סופר'
    ];
    
    // Try to identify category from text
    let detectedCategory: keyof CategoryBalance | undefined = undefined;
    
    // First try direct match with category names
    for (const category of categoryKeys) {
      if (text.includes(category)) {
        detectedCategory = category;
        break;
      }
    }
    
    // If no direct match, try synonyms
    if (!detectedCategory) {
      for (const [synonym, category] of Object.entries(categorySynonyms)) {
        if (text.includes(synonym)) {
          detectedCategory = category;
          break;
        }
      }
    }
    
    // Remove the amount part to get the note
    const note = text.replace(/(\d+)(\s+שקל|\s+שקלים)?/, '').trim();
    
    return { amount, note, category: detectedCategory };
  };

  return (
    <div className="voice-button-container">
      {recognizedData && recognizedData.amount > 0 && (
        <div className="recognition-result">
          <div>סכום: {recognizedData.amount} ש"ח</div>
          {recognizedData.category && <div>קטגוריה: {recognizedData.category}</div>}
          {recognizedData.note && <div>הערה: {recognizedData.note}</div>}
          <div className="confirmation-buttons">
            <button onClick={confirmTransaction} className="confirm-button">אישור</button>
            <button onClick={cancelTransaction} className="cancel-button">ביטול</button>
          </div>
          {recognizedData.category && autoConfirmCountdown > 0 && (
            <div className="auto-confirm-countdown">
              אישור אוטומטי בעוד {autoConfirmCountdown} שניות
            </div>
          )}
        </div>
      )}
      
      <button 
        type="button"
        className={`voice-recognition-button ${isListening ? 'listening' : ''} ${longPressActive ? 'long-press' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={isListening && !longPressActive}
      >
        {/* Microphone icon */}
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        {isListening && !longPressActive && <span className="timer">{remainingTime}s</span>}
        {longPressActive && <span className="long-press-indicator">...מקליט</span>}
      </button>
      {errorMessage && (
        <div className="voice-error-message">
          {errorMessage}
        </div>
      )}
    </div>
  );
};