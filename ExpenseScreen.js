import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingExpense, setEditingExpense] = useState(null);

    const loadExpenses = async () => {
    const rows = await db.getAllAsync(
      'SELECT * FROM expenses ORDER BY id DESC;'
    );

    // Calculate date 
    const today = new Date();

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let filteredRows = rows;


    // Filter expenses
    if (filter === 'week') {
        filteredRows = rows.filter((row) => {
            const expenseDate = new Date(row.date);
            return expenseDate >= startOfWeek && expenseDate <= endOfWeek;
        });
    } else if (filter === 'month') {
      filteredRows = rows.filter((row) => new Date(row.date) >= startOfMonth);
    }
    setExpenses(filteredRows);
  };

    // Add a new expense
    const addExpense = async () => {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) {
      // Basic validation: ignore invalid or non-positive amounts
      return;
    }

    const trimmedCategory = category.trim();
    const trimmedNote = note.trim();

    if (!trimmedCategory) {
      // Category is required
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
        await db.runAsync(
        "INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);",
        [amountNumber, trimmedCategory, trimmedNote || null, today]
    );

    setAmount('');
    setCategory('');
    setNote('');

    loadExpenses();
  } catch(error) {
    console.error('Error adding expense:', error);
  }
};


    // Delete an expense
   const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    loadExpenses();
  };

  // Save edits to existing expense & UPDATE query
  const saveExpense = async () => {
    const amountNumber = parseFloat(editingExpense.amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }
      try {
        await db.runAsync(
          'UPDATE expenses SET amount = ?, category = ?, note = ? WHERE id = ?;',
          [amountNumber, 
            editingExpense.category.trim(), 
            editingExpense.note && editingExpense.note.trim() ? editingExpense.note.trim() : null,
            editingExpense.id]

        );
        setEditingExpense(null);
        await loadExpenses();
      } catch (error) {
        console.error('Error saving expense:', error);
      }
  };

    // Render each expense row with edit and delete buttons
    const renderExpense = ({ item }) => (
    <View style={styles.expenseRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>${Number(item.amount).toFixed(2)}</Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
      </View>

        <TouchableOpacity onPress={() => setEditingExpense(item)}>
        <Text style={styles.edit}>✎</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </View>
  );

    // Set up table
   useEffect(() => {
    async function setup() {

        await db.execAsync(`DROP TABLE IF EXISTS expenses;`);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          note TEXT,
          date TEXT NOT NULL
        );
      `);

      await loadExpenses();
    }

    setup();
  }, []);

    // Reload expenses whenever filter changes
  useEffect(() => {
    loadExpenses();
  }, [filter]);


//   Calcuate total spending and spending by category
  const totalSpending = expenses.reduce((acc, expense) => acc + expense.amount, 0);

  const totalsByCategory = expenses.reduce((acc, expense) => {
    const cat = expense.category;
    acc[cat] = (acc[cat] || 0) + expense.amount;
    return acc;
  }, {});

    return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker</Text>

    {/* Filter Buttons */}
      <View style={styles.filterRow}>
        <Button title="All" onPress={() => setFilter('all')} />
        <Button title="This Week" onPress={() => setFilter('week')} />
        <Button title="This Month" onPress={() => setFilter('month')} />
      </View>

    {/* Overall total */}
    <View style={styles.analyticsRow}>
            <Text style={styles.analyticsText}>
                Total Spending (
                    {filter === 'all' ? 'All' : filter === 'week' ? 'This Week' : 'This Month'}
        ): ${totalSpending.toFixed(2)}   
            </Text>
        </View>

    {/* Totals by Category */}
    <Text style={styles.analyticsText}>
        By Category (
            {filter ==='all' ? 'All' : filter === 'week' ? 'This Week' : 'This Month'}
        ) :
    </Text>
    {Object.entries(totalsByCategory).map(([cat, total]) => (
        <Text key={cat} style={styles.analyticsCategory}>
            {cat}: ${total.toFixed(2)}
        </Text>
    ))}
    {/* Add Expense Form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <TextInput
          style={styles.input}
          placeholder="Category (Food, Books, Rent...)"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />
        <Button title="Add Expense" onPress={addExpense} />
      </View>

    {/* Edit Expense Form */}
        {editingExpense && (
        <View style={styles.form}>
            <Text style={styles.editHeading}>Edit Expense</Text>
            <TextInput
                style={styles.input}
                value={String(editingExpense.amount)}
                keyboardType="numeric"
                onChangeText={(text) =>
                    setEditingExpense({ ...editingExpense, amount: text })
                }
            />
            <TextInput
                style={styles.input}
                value={editingExpense.category}
                onChangeText={(text) =>
                    setEditingExpense({ ...editingExpense, category: text })
                }
            />
            <TextInput
                style={styles.input}
                value={editingExpense.note || ''}
                onChangeText={(text) =>
                    setEditingExpense({ ...editingExpense, note: text })
                }
            />
            <Button title="Save Changes" onPress={saveExpense} />
            <Button title="Cancel" onPress={() => setEditingExpense(null)} color="#f87171" />
        </View>
    )}

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses yet.</Text>
        }
      />

      <Text style={styles.footer}>
        Enter your expenses and they’ll be saved locally with SQLite.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111827' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  form: {
    marginBottom: 16,
    gap: 8,
  },
  input: {
    padding: 10,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',
  },
  expenseCategory: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  expenseNote: {
    fontSize: 12,
    color: '#9ca3af',
  },
  delete: {
    color: '#f87171',
    fontSize: 20,
    marginLeft: 12,
  },
  empty: {
    color: '#9ca3af',
    marginTop: 24,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 12,
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  analyticsRow: {
    marginBottom: 16,
    alignItems: 'center',
  },
  analyticsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34d399'
  },
  analyticsCategory: {
    fontSize: 14,
    color: '#e5e7eb',
    marginLeft: 8
  },
  edit: {
    color: '#60a5fa',
    fontSize: 20,
    marginLeft: 12,
  },
  editHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,    
  },
});