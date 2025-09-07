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
  const [showHistory, setShowHistory] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const savedMembers = localStorage.getItem("members");
    const savedExpenses = localStorage.getItem("expenses");
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("members", JSON.stringify(members));
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [members, expenses]);

  const addMember = (name: string) => {
    if (!name.trim()) return;
    setMembers([...members, { id: Date.now().toString(), name }]);
  };

  const addExpense = (
    description: string,
    amount: number,
    paidBy: string,
    splitAmong: string[]
  ) => {
    if (!description || !amount || !paidBy || splitAmong.length === 0) return;
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

  const resetAll = () => {
    if (confirm("Clear all members and expenses?")) {
      setMembers([]);
      setExpenses([]);
    }
  };

  // Calculate balances
  const balances = useMemo(() => {
    const balance: Record<string, number> = {};
    members.forEach((m) => (balance[m.id] = 0));

    expenses.forEach((exp) => {
      const share = exp.amount / exp.splitAmong.length;
      exp.splitAmong.forEach((id) => {
        balance[id] -= share; // owes share
      });
      balance[exp.paidBy] += exp.amount; // gets credit
    });

    return balance;
  }, [members, expenses]);

  // Settlement plan
  const settlements = useMemo(() => {
    const eps = 0.01;
    const creditors: { id: string; amt: number }[] = [];
    const debtors: { id: string; amt: number }[] = [];

    Object.entries(balances).forEach(([id, amt]) => {
      if (amt > eps) creditors.push({ id, amt });
      else if (amt < -eps) debtors.push({ id, amt: -amt });
    });

    const txns: { from: string; to: string; amount: number }[] = [];
    let i = 0,
      j = 0;
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const pay = Math.min(d.amt, c.amt);
      txns.push({ from: d.id, to: c.id, amount: pay });
      d.amt -= pay;
      c.amt -= pay;
      if (d.amt < eps) i++;
      if (c.amt < eps) j++;
    }
    return txns;
  }, [balances]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Receipt /> Roommate Expense Splitter
      </h1>

      {/* Members */}
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

      {/* Expenses */}
      <div className="mt-6">
        <h2 className="font-semibold flex items-center gap-2">
          <IndianRupee /> Expenses
        </h2>
        <ul>
          {expenses.map((e) => (
            <li key={e.id}>
              {e.description} — ₹{e.amount.toFixed(2)} (Paid by{" "}
              {members.find((m) => m.id === e.paidBy)?.name || "Unknown"})
            </li>
          ))}
        </ul>
        <button
          className="mt-2 bg-green-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={() => {
            const description = prompt("Description") || "Expense";
            const amount = Number(prompt("Amount"));
            const paidBy = prompt(
              `Paid by (choose from: ${members.map((m) => m.name).join(", ")})`
            );
            if (!paidBy || !members.find((m) => m.name === paidBy)) return;
            const paidById = members.find((m) => m.name === paidBy)?.id || "";
            addExpense(description, amount, paidById, members.map((m) => m.id));
          }}
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
              {m.name}: ₹{balances[m.id]?.toFixed(2)}{" "}
              {balances[m.id] > 0 ? "should receive" : "owes"}
            </li>
          ))}
        </ul>
      </div>

      {/* Settlement */}
      <div className="mt-6">
        <h2 className="font-semibold">Settlement Plan</h2>
        {settlements.length === 0 ? (
          <p>All settled or not enough data.</p>
        ) : (
          <ul>
            {settlements.map((t, idx) => (
              <li key={idx}>
                {members.find((m) => m.id === t.from)?.name} pays ₹
                {t.amount.toFixed(2)} to{" "}
                {members.find((m) => m.id === t.to)?.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* History and Reset */}
      <div className="mt-6 flex gap-2">
        <button
          className="bg-blue-500 text-white px-3 py-1 rounded"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? "Hide" : "Show"} History
        </button>
        <button
          className="bg-rose-500 text-white px-3 py-1 rounded"
          onClick={resetAll}
        >
          Reset All
        </button>
      </div>

      {showHistory && (
        <div className="mt-4">
          <h2 className="font-semibold">Expense History</h2>
          <ul>
            {expenses
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((e) => (
                <li key={e.id}>
                  {new Date(e.date).toLocaleString()} — {e.description}: ₹
                  {e.amount.toFixed(2)} (Paid by{" "}
                  {members.find((m) => m.id === e.paidBy)?.name})
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;

