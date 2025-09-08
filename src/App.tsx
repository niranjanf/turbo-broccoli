import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Users,
  Receipt,
  Mail,
  RefreshCw,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  email?: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paid: Record<string, number>; // memberId -> amount paid
  splitAmong: string[];
  date: string;
}

function App() {
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

  // Add member
  const addMember = () => {
    const name = prompt("Enter member name");
    const email = prompt("Enter member email (optional)");
    if (!name) return;
    setMembers([...members, { id: Date.now().toString(), name, email: email || "" }]);
  };

  // Add expense
  const addExpense = () => {
    if (members.length === 0) return alert("Add members first!");

    const description = prompt("Enter expense description") || "Expense";
    const totalAmountStr = prompt("Enter total expense amount") || "0";
    const totalAmount = Number(totalAmountStr);
    if (totalAmount <= 0) return alert("Invalid total amount!");

    const paid: Record<string, number> = {};
    let totalPaidByMembers = 0;

    members.forEach((m) => {
      const amt = prompt(`Amount paid by ${m.name}`) || "0";
      const amtNum = Number(amt);
      paid[m.id] = amtNum;
      totalPaidByMembers += amtNum;
    });

    // If totalPaidByMembers != totalAmount, show warning
    if (totalPaidByMembers !== totalAmount) {
      if (!window.confirm(
        `Total paid by members (${totalPaidByMembers}) does not equal total expense (${totalAmount}). Continue?`
      )) return;
    }

    const splitAmong = members.map((m) => m.id);

    setExpenses([
      ...expenses,
      {
        id: Date.now().toString(),
        description,
        amount: totalAmount,
        paid,
        splitAmong,
        date: new Date().toISOString(),
      },
    ]);
  };

  // Calculate balances (paid - share)
  const balances = useMemo(() => {
    const bal: Record<string, number> = {};
    members.forEach((m) => (bal[m.id] = 0));

    expenses.forEach((exp) => {
      const share = exp.amount / exp.splitAmong.length;
      exp.splitAmong.forEach((id) => {
        bal[id] -= share; // everyone owes their share
      });
      Object.entries(exp.paid).forEach(([id, amt]) => {
        bal[id] += amt; // add what they actually paid
      });
    });

    return bal;
  }, [expenses, members]);

  // Calculate settlements
  const settlements = useMemo(() => {
    const owes: { from: string; to: string; amount: number }[] = [];
    const pos: { id: string; bal: number }[] = [];
    const neg: { id: string; bal: number }[] = [];

    Object.entries(balances).forEach(([id, b]) => {
      if (b > 0) pos.push({ id, bal: b });
      else if (b < 0) neg.push({ id, bal: -b });
    });

    let i = 0, j = 0;
    while (i < pos.length && j < neg.length) {
      const pay = Math.min(pos[i].bal, neg[j].bal);
      owes.push({ from: neg[j].id, to: pos[i].id, amount: pay });
      pos[i].bal -= pay;
      neg[j].bal -= pay;
      if (pos[i].bal === 0) i++;
      if (neg[j].bal

