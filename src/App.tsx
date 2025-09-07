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
  paidBy: string; // member id
  splitAmong: string[]; // array of member ids
  date: string;
}

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const savedMembers = localStorage.getItem("members");
    const savedExpenses = localStorage.getItem("expenses");
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

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
      { id: Date.now().toString(), description, amount, paidBy, splitAmong, date: new Date().toISOString() },
    ]);
  };

  // ✅ Calculate net balances
  const balances = useMemo(() => {
    const bal: Record<string, number> = {};
    members.forEach((m) => (bal[m.id] = 0));

    expenses.forEach((e) => {
      const share = e.amount / e.splitAmong.length;
      e.splitAmong.forEach((id) => {
        bal[id] -= share; // each member owes their share
      });
      bal[e.paidBy] += e.amount; // payer gets credit
    });

    return bal;
  }, [members, expenses]);

  // ✅ Generate simplified settlements
  const settlements = useMemo(() => {
    const creditors = Object.entries(balances)
      .filter(([_, amt]) => amt > 0)
      .map(([id, amt]) => ({ id, amt }))
      .sort((a, b) => b.amt - a.amt);

    const debtors = Object.entries(balances)
      .filter(([_, amt]) => amt < 0)
      .map(([id, amt]) => ({ id, amt: -amt }))
      .sort((a, b) => b.amt - a.amt);

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
      if (d.amt <= 0.01) i++;
      if (c.amt <= 0.01) j++;
    }
    return txns;
  }, [balances]);

  return (
    <div className="p-6">
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
              {e.description} — ₹{e.amount} (Paid by{" "}
              {members.find((m) => m.id === e.paidBy)?.name || "Unknown"})
            </li>
          ))}
        </ul>
        <button
          className="mt-2 bg-green-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={() => {
            const desc = prompt("Description") || "Expense";
            const amount = Number(prompt("Amount") || "0");
            const paidBy = members[0]?.id || "";
            const splitAmong = members.map((m) => m.id);
            addExpense(desc, amount, paidBy, splitAmong);
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
              {m.name}: ₹{balances[m.id].toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      {/* Settlement Plan */}
      <div className="mt-6">
        <h2 className="font-semibold">Settlement Plan</h2>
        {settlements.length === 0 ? (
          <p>All settled!</p>
        ) : (
          <ul>
            {settlements.map((t, i) => (
              <li key={i}>
                {members.find((m) => m.id === t.from)?.name} pays{" "}
                {members.find((m) => m.id === t.to)?.name} ₹
                {t.amount.toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;

