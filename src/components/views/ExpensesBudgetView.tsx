import React, { useState, useEffect } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Expense, EventType } from '../../types/index.ts';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Edit3,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { formatINR, formatDate, downloadCSV } from '../../lib/utils.ts';

interface ExpensesBudgetViewProps {
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

export const ExpensesBudgetView: React.FC<ExpensesBudgetViewProps> = ({
  onAddExpense,
  onEditExpense,
}) => {
  const { data, budgetMetrics, deleteExpense, updateBudgetConfig } = useWeddingData();
  const { canEditBudget } = useAuth();

  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);

  // Editable budget fields
  const [engBudgetInput, setEngBudgetInput] = useState(data?.budgetConfig.engagementBudget || 0);
  const [wedBudgetInput, setWedBudgetInput] = useState(data?.budgetConfig.weddingBudget || 0);

  useEffect(() => {
    if (data?.budgetConfig) {
      setEngBudgetInput(data.budgetConfig.engagementBudget || 0);
      setWedBudgetInput(data.budgetConfig.weddingBudget || 0);
    }
  }, [data?.budgetConfig]);

  const expenses = data?.expenses || [];

  const filteredExpenses = expenses.filter(e => {
    if (filterEvent !== 'all' && e.event !== filterEvent) return false;
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterStatus !== 'all' && e.paymentStatus !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchVendor = (e.vendorName || '').toLowerCase().includes(q);
      const matchCategory = e.category.toLowerCase().includes(q);
      if (!matchTitle && !matchVendor && !matchCategory) return false;
    }
    return true;
  });

  const handleSaveBudgets = async () => {
    try {
      await updateBudgetConfig({
        engagementBudget: Number(engBudgetInput),
        weddingBudget: Number(wedBudgetInput),
        combinedBudget: Number(engBudgetInput) + Number(wedBudgetInput),
      });
      setIsEditingBudgets(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update budgets');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Expense Title',
      'Ceremony Event',
      'Category',
      'Planned Amount (INR)',
      'Actual Amount (INR)',
      'Amount Paid (INR)',
      'Outstanding (INR)',
      'Payment Status',
      'Payee / Vendor',
      'Payment Date',
      'Payment Method',
      'Person Responsible',
      'Notes',
    ];

    const rows = filteredExpenses.map(e => [
      e.title,
      e.event,
      e.category,
      e.plannedAmount,
      e.actualAmount,
      e.amountPaid,
      e.remainingAmount,
      e.paymentStatus,
      e.vendorName || '',
      e.paymentDate || '',
      e.paymentMethod || '',
      e.responsiblePerson || '',
      e.notes || '',
    ]);

    downloadCSV(`wedding_expenses_ledger_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // Category breakdown calculation
  const categoryTotals: Record<string, { planned: number; actual: number }> = {};
  expenses.forEach(e => {
    if (!categoryTotals[e.category]) {
      categoryTotals[e.category] = { planned: 0, actual: 0 };
    }
    categoryTotals[e.category].planned += Number(e.plannedAmount) || 0;
    categoryTotals[e.category].actual += Number(e.actualAmount) || 0;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Budget Allocation Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            Expense & Budget Management
          </h2>
          <p className="text-xs text-[#7A6B68]">
            Complete expense-tracking with separate budgets for engagement, ceremonies, and royal wedding
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEditBudget && (
            <button
              onClick={() => setIsEditingBudgets(!isEditingBudgets)}
              className="py-2 px-3.5 rounded-xl border border-[#E8DEC8] bg-white text-xs font-semibold text-[#8C6D34] hover:bg-[#FAF5EB] transition cursor-pointer"
            >
              {isEditingBudgets ? 'Close Budget Settings' : 'Edit Planned Budgets'}
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-[#E8DEC8] bg-white text-xs font-semibold text-[#5C4E4B] hover:bg-[#FAF5EB] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#B38F4D]" />
            <span>Export CSV</span>
          </button>

          {canEditBudget && (
            <button
              onClick={onAddExpense}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Editable Budget Settings Drawer */}
      {isEditingBudgets && canEditBudget && (
        <div className="p-5 rounded-2xl bg-[#FAF5EB] border border-[#E8DEC8] space-y-4">
          <div className="font-serif font-bold text-sm text-[#2D2422]">
            Configure Overall Celebration Budgets
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Total Engagement Budget (₹)
              </label>
              <input
                type="number"
                value={engBudgetInput}
                onChange={(e) => setEngBudgetInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs font-semibold text-[#2D2422] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Total Wedding Budget (₹)
              </label>
              <input
                type="number"
                value={wedBudgetInput}
                onChange={(e) => setWedBudgetInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs font-semibold text-[#2D2422] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Combined Total Budget (₹)
              </label>
              <input
                type="text"
                disabled
                value={formatINR(Number(engBudgetInput) + Number(wedBudgetInput))}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs font-bold text-[#8C6D34] outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsEditingBudgets(false)}
              className="py-1.5 px-3 rounded-lg border border-[#E5DFD7] text-xs font-medium text-[#5C4E4B]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBudgets}
              className="py-1.5 px-4 rounded-lg bg-[#D4AF37] text-white text-xs font-medium hover:brightness-105"
            >
              Save Budgets
            </button>
          </div>
        </div>
      )}

      {/* 4 Financial Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Combined Budget Allocated</div>
          <div className="text-2xl font-serif font-bold text-[#2D2422] mt-1">
            {formatINR(budgetMetrics.totalPlanned)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Engagement: {formatINR(budgetMetrics.engagementBudget)} · Wedding: {formatINR(budgetMetrics.weddingBudget)}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Total Actual Committed</div>
          <div className="text-2xl font-serif font-bold text-[#8C6D34] mt-1">
            {formatINR(budgetMetrics.totalActual)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            {budgetMetrics.utilizationPercent}% of combined plan
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Total Amount Paid</div>
          <div className="text-2xl font-serif font-bold text-[#166534] mt-1">
            {formatINR(budgetMetrics.totalPaid)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Cleared via UPI, Bank RTGS & Cards
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Outstanding Payments Due</div>
          <div className="text-2xl font-serif font-bold text-[#A63A50] mt-1">
            {formatINR(budgetMetrics.totalPending)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Pending to vendors & venues
          </div>
        </div>
      </div>

      {/* Budget Warning Banner if utilization exceeds threshold */}
      {budgetMetrics.utilizationPercent >= 80 && (
        <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#F0C9CD] flex items-center gap-3 text-xs text-[#A63A50]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <strong className="font-semibold">Budget Threshold Alert:</strong> You have utilized {budgetMetrics.utilizationPercent}% of the combined planned budget. Please review upcoming ceremony expenses carefully to avoid cost overruns.
          </div>
        </div>
      )}

      {/* Engagement vs Wedding Split Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-serif font-bold text-sm text-[#2D2422]">
              Ring Ceremony & Engagement Budget
            </span>
            <span className="text-xs font-semibold text-[#8C6D34]">
              {formatINR(budgetMetrics.engagementSpent)} / {formatINR(budgetMetrics.engagementBudget)}
            </span>
          </div>
          <div className="w-full h-2 bg-[#E8DEC8]/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#F0C9CD] to-[#D4AF37] rounded-full"
              style={{
                width: `${Math.min(100, Math.round((budgetMetrics.engagementSpent / (budgetMetrics.engagementBudget || 1)) * 100))}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#7A6B68]">
            <span>Spent: {formatINR(budgetMetrics.engagementSpent)}</span>
            <span>Available: {formatINR(Math.max(0, budgetMetrics.engagementBudget - budgetMetrics.engagementSpent))}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-serif font-bold text-sm text-[#2D2422]">
              Wedding & Rituals Budget
            </span>
            <span className="text-xs font-semibold text-[#8C6D34]">
              {formatINR(budgetMetrics.weddingSpent)} / {formatINR(budgetMetrics.weddingBudget)}
            </span>
          </div>
          <div className="w-full h-2 bg-[#E8DEC8]/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B38F4D] rounded-full"
              style={{
                width: `${Math.min(100, Math.round((budgetMetrics.weddingSpent / (budgetMetrics.weddingBudget || 1)) * 100))}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#7A6B68]">
            <span>Spent: {formatINR(budgetMetrics.weddingSpent)}</span>
            <span>Available: {formatINR(Math.max(0, budgetMetrics.weddingBudget - budgetMetrics.weddingSpent))}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by expense, vendor, or category..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#9C8F8B] absolute left-3 top-2.5" />
        </div>

        {/* Event filter */}
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
        >
          <option value="all">All Ceremonies</option>
          <option value="engagement">Engagement</option>
          <option value="wedding">Wedding</option>
          <option value="haldi">Haldi</option>
          <option value="mehendi">Mehendi</option>
          <option value="sangeet">Sangeet</option>
          <option value="reception">Reception</option>
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
        >
          <option value="all">All Payment Statuses</option>
          <option value="paid">Fully Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Expenses Ledger Table */}
      <div className="rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF5EB] border-b border-[#E8DEC8] text-[#5C4E4B] font-semibold">
                <th className="py-3 px-4">Expense & Ceremony</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payee / Vendor</th>
                <th className="py-3 px-4 text-right">Planned (₹)</th>
                <th className="py-3 px-4 text-right">Actual (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Balance (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DD]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#8C7E7A]">
                    No expense records matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-[#FAF8F5]/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#2D2422]">{e.title}</div>
                      <div className="text-[10px] text-[#8C7E7A] uppercase tracking-wider mt-0.5">
                        {e.event} {e.paymentDate && `· ${formatDate(e.paymentDate)}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C4E4B]">
                      {e.category}
                    </td>
                    <td className="py-3.5 px-4 text-[#5C4E4B]">
                      <div className="font-medium text-[#2D2422]">{e.vendorName || '—'}</div>
                      {e.responsiblePerson && (
                        <div className="text-[10px] text-[#8C7E7A]">By: {e.responsiblePerson}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#7A6B68]">
                      {formatINR(e.plannedAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#2D2422]">
                      {formatINR(e.actualAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#166534] font-medium">
                      {formatINR(e.amountPaid)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      <span className={e.remainingAmount > 0 ? 'text-[#A63A50]' : 'text-[#8C7E7A]'}>
                        {formatINR(e.remainingAmount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        e.paymentStatus === 'paid'
                          ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                          : e.paymentStatus === 'partially_paid'
                          ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                          : 'bg-[#FDF2F4] text-[#A63A50] border border-[#F0C9CD]'
                      }`}>
                        {e.paymentStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {e.receiptUrl && (
                          <a
                            href={e.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-[#B38F4D] hover:bg-[#FAF5EB]"
                            title="View receipt"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        {canEditBudget && (
                          <>
                            <button
                              onClick={() => onEditExpense(e)}
                              className="p-1 rounded text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB]"
                              title="Edit expense"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Delete "${e.title}" expense?`)) {
                                  await deleteExpense(e.id);
                                }
                              }}
                              className="p-1 rounded text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4]"
                              title="Delete expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
