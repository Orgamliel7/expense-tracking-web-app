# 📊 **מעקב הוצאות** - Expense Tracker

Welcome to **מעקב הוצאות** (Expense Tracker), a simple yet powerful app to help you track and manage your expenses. With an intuitive interface, you can monitor your financial balance, categorize your spending, add new expenses, and generate insightful reports and analytics.

---

## 🚀 **Features**

- 💰 **Track Expenses**: Add new expenses by selecting a category, entering the amount, and adding an optional note.
- 📉 **Real-time Balance**: Monitor your available balance for each category in real-time, with progress indicators.
- 🔄 **Reset Balances**: Reset any category balance back to its initial value.
- 📈 **Expense Report**: View a detailed, categorized list of your expenses, sorted by date.
- 📊 **Analytics**: Visualize your spending patterns with beautiful, dynamic charts.
- 📥 **Excel Export**: Download your expense data as an Excel file for further analysis or record-keeping.
- 📅 **Past Reports**: Access and review your monthly expense reports for trend analysis.
- 🏦 **Admin Panel**: Control user data, manage categories, and review overall expense history with an admin panel.
- 🖼️ **Expense Upload**: Import and organize bulk expenses via an easy-to-use uploader.

---

## 🎨 **Technologies Used**

- **React**: Building the front-end with React for a modern, dynamic user experience.
- **Firebase**: Secure cloud storage and seamless data synchronization via Firebase Firestore.
- **Recharts**: Stunning pie charts and other visualizations to display spending trends.
- **XLSX**: Export data to Excel format for easier analysis and sharing.
- **Styled Components**: Custom-styled components to ensure a responsive, attractive UI.
- **TypeScript**: Utilizing TypeScript for type safety and better code organization.
- **Custom Hooks**: Leveraging hooks like `useLoading` and `useKeyboardShortcuts` to improve app functionality and user experience.

---

## 🏗️ **Project Structure**

```
src/
├── components/
│   ├── CategoryButtons/    # Category selection buttons
│   ├── ExpenseForm/        # Form for submitting new expenses
│   ├── BalanceList/        # Displays current balance per category
│   ├── ReportModal/        # Modal for viewing detailed expense reports
│   ├── Analytics/          # Chart visualization of expenses
│   ├── ExpenseUploader/    # Component for bulk importing expenses
│   ├── ActionButtons/      # Controls to trigger different app views
│   ├── SmallCash/          # Small expenses summary
│   ├── AdminPanel/         # Admin panel for managing categories and reports
│   └── GeneralBalance/     # General balance view
├── services/               
│   └── firebase.js         # Firebase configuration and Firestore interactions
├── hooks/                  
│   ├── useKeyboardShortcuts.js # Custom hook for keyboard shortcuts
│   ├── useLoading.js         # Custom hook to handle loading states
├── types/                  
│   ├── index.ts            # TypeScript types for categories, expenses, etc.
├── styles.css              # Global styles for the app
└── App.tsx                 # Main application component
```

---

## 🧑‍💻 **How to Run**

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Orgamliel7/expense-tracker.git
   ```

2. **Install dependencies**:
   ```bash
   cd expense-tracker
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000` to start using the app!

---

## 💡 **How to Use**

1. **Select a Category**: Choose a category (e.g., Groceries, Entertainment).
2. **Enter Amount**: Input the amount of your expense.
3. **Optional Note**: Add a note to describe the expense.
4. **Submit**: Click "הפחת הוצאה" to log your expense.
5. **View Report**: Click "דו"ח הוצאות" to see a detailed list of all expenses.
6. **Export to Excel**: Download your data in Excel format by clicking "Excel הורד כקובץ."

---

## ✨ **Future Enhancements**

- 🌍 **Multi-language support**: Adding language options (currently in Hebrew).
- 🔐 **User authentication**: Secure data with user logins.
- 🧑‍🤝‍🧑 **Expense sharing**: Collaborate with others to manage shared expenses.
- 📅 **Budget planning**: Add features for budgeting and forecasting expenses.

---

## 🤝 **Contributing**

We welcome contributions! If you'd like to help improve this project, follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-xyz`)
3. Make your changes and commit them (`git commit -m 'Add feature XYZ'`)
4. Push to the branch (`git push origin feature-xyz`)
5. Open a pull request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

### 🌟 **Enjoy tracking your expenses!**

---
