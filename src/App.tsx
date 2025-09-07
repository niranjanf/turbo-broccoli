import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Users,
  Receipt,
  IndianRupee,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  date: string;
}

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // ✅ Load from localStorage on startup
  useEffect(() => {
    const savedMembers = localStorage.getItem("members");
    const savedExpenses = localStorage.getItem("expenses");
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

  // ✅ Save whenever members or expenses change
  useEffect(() => {
    localStorage.setItem("members", JSON.stringify(members));
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [members, expenses]);

  // Example: Add new member
  const addMember = (name: string) => {
    setMembers([...members, { id: Date.now().toString(), name }]);
  };

  // Example: Add new expense
  const addExpense = (
    description: string,
    amount: number,
    paidBy: string,
    splitAmong: string[]
  ) => {
    setExpenses([
      ...expenses,
      {
        id: Date.now().toString(),
        description,
        amount,
        paidBy,
        splitAmong,
        date: new Date().toISOString(),
      },
    ]);
  };

  // ✅ Calculate balances for settlement
  const balances = useMemo(() => {
    const balance: Record<string, number> = {};
    members.forEach((m) => (balance[m.id] = 0));

    expenses.forEach((exp) => {
      const share = exp.amount / exp.splitAmong.length;
      exp.splitAmong.forEach((id) => {
        balance[id] -= share; // each owes their share
      });
      balance[exp.paidBy] += exp.amount; // payer gets credit
    });

    return balance;
  }, [members, expenses]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Receipt /> Roommate Expense Splitter
      </h1>

      {/* Example Members List */}
      <div className="mt-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Users /> Members
        </h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>{m.name}</li>
          ))}
        </ul>
        <button
          className="mt-2 bg-indigo-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={() => addMember(prompt("Enter member name") || "")}
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Example Expenses List */}
      <div className="mt-6">
        <h2 className="font-semibold flex items-center gap-2">
          <IndianRupee /> Expenses
        </h2>
        <ul>
          {expenses.map((e) => (
            <li key={e.id}>
              {e.description} — ₹{e.amount} (Paid by{" "}
              {members.find((m) => m.id === e.paidBy)?.name || "Unknown"})
            </li>
          ))}
        </ul>
        <button
          className="mt-2 bg-green-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={() =>
            addExpense(
              prompt("Description") || "Expense",
              Number(prompt("Amount")),
              members[0]?.id || "",
              members.map((m) => m.id)
            )
          }
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Balances */}
      <div className="mt-6">
        <h2 className="font-semibold">Balances</h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>
              {m.name}: ₹{balances[m.id]?.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;

