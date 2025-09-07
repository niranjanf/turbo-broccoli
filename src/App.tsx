import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Receipt,
  Users,
  IndianRupee,
  RefreshCw,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
}

interface Contribution {
  memberId: string;
  amount: number;
}

interface Expense {
  id: string;
  description: string;
  date: string;
  contributions: Contribution[];
  splitAmong: string[];
}

export default function App() {
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

  // Add Member
  const addMember = (name: string) => {
    if (!name.trim()) return;
    setMembers([...members, { id: Date.now().toString(), name }]);
  };

  // Expense Form State
  const [description, setDescription] = useState("");
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [splitAmong, setSplitAmong] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const contrib: Record<string, number> = {};
    const split: Record<string, boolean> = {};
    members.forEach((m) => {
      contrib[m.id] = contributions[m.id] || 0;
      split[m.id] = splitAmong[m.id] ?? true;
    });
    setContributions(contrib);
    setSplitAmong(split);
  }, [members]);

  // Add Expense
  const addExpense = () => {
    const activeContribs: Contribution[] = Object.entries(contributions)
      .filter(([_, amt]) => amt > 0)
      .map(([memberId, amount]) => ({ memberId, amount }));

    const activeSplit = Object.entries(splitAmong)
      .filter(([_, included]) => included)
      .map(([memberId]) => memberId);

    if (!description.trim() || activeContribs.length === 0 || activeSplit.length === 0) {
      alert("Fill all fields properly!");
      return;
    }

    setExpenses([
      ...expenses,
      {
        id: Date.now().toString(),
        description,
        date: new Date().toISOString(),
        contributions: activeContribs,
        splitAmong: activeSplit,
      },
    ]);

    setDescription("");
    setContributions(members.reduce((acc, m) => ({ ...acc, [m.id]: 0 }), {}));
    setSplitAmong(members.reduce((acc, m) => ({ ...acc, [m.id]: true }), {}));
  };

  // Reset All Data
  const resetAll = () => {
    if (window.confirm("Are you sure you want to reset all data?")) {
      setMembers([]);
      setExpenses([]);
      localStorage.clear();
    }
  };

  // Calculate balances
  const balances = useMemo(() => {
    const balance: Record<string, number> = {};
    members.forEach((m) => (balance[m.id] = 0));

    expenses.forEach((exp) => {
      const totalPaid = exp.contributions.reduce((sum, c) => sum + c.amount, 0);
      const perHead = totalPaid / exp.splitAmong.length;

      exp.contributions.forEach((c) => {
        balance[c.memberId] += c.amount; // credit the payer
      });

      exp.splitAmong.forEach((id) => {
        balance[id] -= perHead; // debit each sharer
      });
    });

    return balance;
  }, [members, expenses]);

  const currency = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Receipt /> Roommate Expense Splitter
      </h1>

      {/* Members Section */}
      <div className="mt-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Users /> Members
        </h2>
        <ul className="mb-2">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between">
              {m.name}
              <button
                className="text-red-500"
                onClick={() =>
                  setMembers(members.filter((mem) => mem.id !== m.id))
                }
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        <button
          className="bg-indigo-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={() => addMember(prompt("Enter member name") || "")}
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Expenses Section */}
      <div className="mt-6">
        <h2 className="font-semibold flex items-center gap-2">
          <IndianRupee /> Add Expense
        </h2>
        <div className="mb-2">
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border px-2 py-1 rounded w-full"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Paid"
                value={contributions[m.id] || ""}
                onChange={(e) =>
                  setContributions({
                    ...contributions,
                    [m.id]: Number(e.target.value),
                  })
                }
                className="border px-2 py-1 rounded w-20"
              />
              <label>
                <input
                  type="checkbox"
                  checked={splitAmong[m.id]}
                  onChange={(e) =>
                    setSplitAmong({ ...splitAmong, [m.id]: e.target.checked })
                  }
                />{" "}
                {m.name}
              </label>
            </div>
          ))}
        </div>
        <button
          className="mt-2 bg-green-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={addExpense}
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          className="bg-blue-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={() => setShowHistory(!showHistory)}
        >
          <RefreshCw size={16} /> {showHistory ? "Hide History" : "Show History"}
        </button>
        <button
          className="bg-red-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={resetAll}
        >
          <Trash2 size={16} /> Reset All
        </button>
      </div>

      {/* Expenses History */}
      {showHistory && (
        <div className="mt-6">
          <h2 className="font-semibold flex items-center gap-2">
            <Receipt /> Expense History
          </h2>
          <ul>
            {expenses
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((exp) => (
                <li key={exp.id} className="mb-2 border p-2 rounded">
                  <strong>{exp.description}</strong> — {new Date(exp.date).toLocaleString()}
                  <ul className="ml-4">
                    {exp.contributions.map((c) => (
                      <li key={c.memberId}>
                        {members.find((m) => m.id === c.memberId)?.name || "Unknown"} paid{" "}
                        {currency(c.amount)}
                      </li>
                    ))}
                    <li>
                      Split among:{" "}
                      {exp.splitAmong
                        .map((id) => members.find((m) => m.id === id)?.name || "Unknown")
                        .join(", ")}
                    </li>
                  </ul>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Balances */}
      <div className="mt-6">
        <h2 className="font-semibold">Balances</h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>
              {m.name}:{" "}
              {balances[m.id] >= 0
                ? `should receive ${currency(balances[m.id])}`
                : `owes ${currency(-balances[m.id])}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

