import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Users,
  Receipt,
  IndianRupee,
  Mail,
} from "lucide-react";
import emailjs from "@emailjs/browser";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Payer {
  memberId: string;
  amountPaid: number;
}

interface Expense {
  id: string;
  description: string;
  paidBy: Payer[];
  splitAmong: string[];
  date: string;
}

export default function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

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
  const addMember = () => {
    const name = prompt("Enter member name") || "";
    const email = prompt("Enter member email") || "";
    if (!name || !email) return;
    setMembers([...members, { id: Date.now().toString(), name, email }]);
  };

  // Add Expense
  const addExpense = () => {
    const description = prompt("Description") || "Expense";
    const splitAmongIds = members.map((m) => m.id);

    // Ask how much each member paid
    const paidBy: Payer[] = members.map((m) => {
      const amt = Number(prompt(`${m.name} paid?`) || 0);
      return { memberId: m.id, amountPaid: amt };
    });

    setExpenses([
      ...expenses,
      { id: Date.now().toString(), description, paidBy, splitAmong: splitAmongIds, date: new Date().toISOString() },
    ]);
  };

  // Reset all data
  const resetAll = () => {
    if (window.confirm("Are you sure? This will clear all data.")) {
      setMembers([]);
      setExpenses([]);
    }
  };

  // Calculate balances
  const balances = useMemo(() => {
    const bal: Record<string, number> = {};
    members.forEach((m) => (bal[m.id] = 0));
    expenses.forEach((exp) => {
      const totalPaid = exp.paidBy.reduce((a, b) => a + b.amountPaid, 0);
      const share = totalPaid / exp.splitAmong.length;

      exp.splitAmong.forEach((id) => (bal[id] -= share));
      exp.paidBy.forEach((p) => (bal[p.memberId] += p.amountPaid));
    });
    return bal;
  }, [members, expenses]);

  // Settlements (who pays whom)
  const settlements = useMemo(() => {
    const creditors = members
      .map((m) => ({ id: m.id, amt: balances[m.id] }))
      .filter((c) => c.amt > 0)
      .sort((a, b) => b.amt - a.amt);

    const debtors = members
      .map((m) => ({ id: m.id, amt: -balances[m.id] }))
      .filter((d) => d.amt > 0)
      .sort((a, b) => b.amt - a.amt);

    const result: { from: string; to: string; amt: number }[] = [];
    let i = 0,
      j = 0;

    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const pay = Math.min(d.amt, c.amt);

      result.push({ from: d.id, to: c.id, amt: pay });

      d.amt -= pay;
      c.amt -= pay;

      if (d.amt < 0.01) i++;
      if (c.amt < 0.01) j++;
    }

    return result;
  }, [balances, members]);

  // Send emails via EmailJS
  const sendEmails = () => {
    settlements.forEach((s) => {
      const fromMember = members.find((m) => m.id === s.from);
      const toMember = members.find((m) => m.id === s.to);
      if (!fromMember || !toMember) return;

      const message = `
Hello ${fromMember.name},

You owe ₹${s.amt.toFixed(2)} to ${toMember.name}.

Expenses breakdown:
${expenses
  .map(
    (e) =>
      `- ${e.description}: ${e.paidBy
        .map(
          (p) =>
            `${members.find((m) => m.id === p.memberId)?.name || ""} paid ₹${
              p.amountPaid
            }`
        )
        .join(", ")}`
  )
  .join("\n")}
`;

      emailjs.send(
        "YOUR_SERVICE_ID",
        "YOUR_TEMPLATE_ID",
        {
          to_name: fromMember.name,
          to_email: fromMember.email,
          message: message,
        },
        "YOUR_PUBLIC_KEY"
      );
    });
    alert("Emails sent!");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold flex items-center gap-2 text-indigo-600">
        <Receipt /> Roommate Expense Splitter
      </h1>

      <div className="mt-6 flex gap-4 flex-wrap">
        <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2" onClick={addMember}>
          <Plus /> Add Member
        </button>
        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2" onClick={addExpense}>
          <Plus /> Add Expense
        </button>
        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2" onClick={resetAll}>
          <RefreshCw /> Reset All
        </button>
        <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center gap-2" onClick={sendEmails}>
          <Mail /> Send Emails
        </button>
      </div>

      {/* Members */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Users /> Members</h2>
        <ul className="mt-2 space-y-1">
          {members.map((m) => (
            <li key={m.id} className="p-2 bg-white shadow rounded flex justify-between">
              <span>{m.name}</span>
              <span className="text-sm text-gray-500">{m.email}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Expenses */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold flex items-center gap-2"><IndianRupee /> Expenses</h2>
        <ul className="mt-2 space-y-2">
          {expenses
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((e) => (
              <li key={e.id} className="p-2 bg-white shadow rounded">
                <div className="font-semibold">{e.description} — ₹{e.paidBy.reduce((a,b)=>a+b.amountPaid,0)}</div>
                <div className="text-sm text-gray-600">
                  {e.paidBy.map((p) => (
                    <div key={p.memberId}>
                      {members.find((m) => m.id === p.memberId)?.name} paid ₹{p.amountPaid}
                    </div>
                  ))}
                </div>
              </li>
            ))}
        </ul>
      </div>

      {/* Balances */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Balances</h2>
        <ul className="mt-2 space-y-1">
          {members.map((m) => (
            <li key={m.id} className="p-2 bg-white shadow rounded">
              {m.name}: ₹{balances[m.id].toFixed(2)}
            </li>
          ))}
        </ul>

        {/* Settlements */}
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Who pays whom</h2>
          <ul className="mt-2 space-y-1">
            {settlements.map((s, idx) => (
              <li key={idx} className="p-2 bg-white shadow rounded">
                {members.find((m) => m.id === s.from)?.name} pays ₹{s.amt.toFixed(2)} to {members.find((m) => m.id === s.to)?.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

