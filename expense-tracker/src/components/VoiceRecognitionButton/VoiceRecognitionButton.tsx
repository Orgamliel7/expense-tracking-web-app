import React, { useState } from 'react';
import { CategoryBalance } from '../../types';
import './styles.css';

interface VoiceRecognitionButtonProps {
  onRecognitionComplete: (data: { amount: number; note: string; category?: keyof CategoryBalance }) => void;
}

export const VoiceRecognitionButton: React.FC<VoiceRecognitionButtonProps> = ({ 
  onRecognitionComplete 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [remainingTime, setRemainingTime] = useState(3);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startListening = () => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('זיהוי דיבור אינו נתמך בדפדפן זה');
      return;
    }

    setIsListening(true);
    setRemainingTime(3);
    setErrorMessage(null);

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configure for Hebrew
    recognition.lang = 'he-IL';
    recognition.continuous = true;
    recognition.interimResults = false;
    
    // Set recording timeout (3 seconds)
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          recognition.stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Handle results
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Recognized text:', transcript);
      
      // Process the Hebrew text
      const processedData = processHebrewSpeech(transcript);
      
      // Check if we detected an amount
      if (processedData.amount <= 0) {
        setErrorMessage('לא נקלטה שום הוצאה בהקלטה הקולית');
        setTimeout(() => setErrorMessage(null), 3000); // Clear error after 3 seconds
      } else {
        onRecognitionComplete(processedData);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      clearInterval(timer);
      setErrorMessage('שגיאה בזיהוי קולי');
      setTimeout(() => setErrorMessage(null), 3000); // Clear error after 3 seconds
    };

    recognition.onend = () => {
      setIsListening(false);
      clearInterval(timer);
      
      // If no results were received at all, show an error
      if (!recognition.resultReceived) {
        setErrorMessage('לא נקלטה שום הוצאה בהקלטה הקולית');
        setTimeout(() => setErrorMessage(null), 3000); // Clear error after 3 seconds
      }
    };

    // Flag to track if we received any results
    recognition.resultReceived = false;
    
    recognition.onresult = function(event) {
      recognition.resultReceived = true;
      const transcript = event.results[0][0].transcript;
      console.log('Recognized text:', transcript);
      
      // Process the Hebrew text
      const processedData = processHebrewSpeech(transcript);
      
      // Check if we detected an amount
      if (processedData.amount <= 0) {
        setErrorMessage('לא נקלטה שום הוצאה בהקלטה הקולית');
        setTimeout(() => setErrorMessage(null), 3000); // Clear error after 3 seconds
      } else {
        onRecognitionComplete(processedData);
      }
    };

    // Start listening
    recognition.start();
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
    
    // Also add some common synonyms that might be used in speech
    const categorySynonyms: Record<string, keyof CategoryBalance> = {
      'תדלוק': 'דלק',
      'בנזין': 'דלק',
      'מסעדה': 'מסעדות',
      'אוכל בחוץ': 'מסעדות',
      'קפה': 'מסעדות',
      'חופש': 'חופשות',
      'נופש': 'חופשות',
      'טיול': 'חופשות',
      'בילוי': 'בילויים',
      'בגד': 'בגדים',
      'חבר': 'חברים',
      'חברה': 'חברים',
      'טיפוח': 'טיפוח והנעלה',
      'נעליים': 'טיפוח והנעלה',
      'מכולת': 'סופר',
      'קניות': 'סופר'
    };
    
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
      <button 
        type="button"
        className={`voice-recognition-button ${isListening ? 'listening' : ''}`}
        onClick={startListening}
        disabled={isListening}
      >
        {/* Microphone icon */}
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        {isListening && <span className="timer">{remainingTime}s</span>}
      </button>
      {errorMessage && (
        <div className="voice-error-message">
          {errorMessage}
        </div>
      )}
    </div>
  );
};