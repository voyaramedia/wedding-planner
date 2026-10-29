import React, { useState, useEffect } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Expense, EventType, RecordOwner } from '../../types/index.ts';
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
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { formatINR, formatDate, downloadCSV } from '../../lib/utils.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface ExpensesBudgetViewProps {
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

export const ExpensesBudgetView: React.FC<ExpensesBudgetViewProps> = ({
  onAddExpense,
  onEditExpense,
}) => {
  const { data, budgetMetrics, deleteExpense, updateBudgetConfig } = useWeddingData();
  const { user, canEditBudget } = useAuth();
  const { showToast, confirm } = useToast();

  // Active workspace selector (for admin: combined, groom, bride; for couple: strictly their side)
  const defaultSide: 'combined' | 'groom' | 'bride' =
    user?.role === 'groom' ? 'groom' : user?.role === 'bride' ? 'bride' : 'combined';
  const [activeSideWorkspace, setActiveSideWorkspace] = useState<'combined' | 'groom' | 'bride'>(defaultSide);

  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);

  // Editable budget fields
  const [groomBudgetInput, setGroomBudgetInput] = useState(data?.budgetConfig.groomBudget || 0);
  const [brideBudgetInput, setBrideBudgetInput] = useState(data?.budgetConfig.brideBudget || 0);
  const [engBudgetInput, setEngBudgetInput] = useState(data?.budgetConfig.engagementBudget || 0);
  const [wedBudgetInput, setWedBudgetInput] = useState(data?.budgetConfig.weddingBudget || 0);

  useEffect(() => {
    if (data?.budgetConfig) {
      setGroomBudgetInput(data.budgetConfig.groomBudget || 0);
      setBrideBudgetInput(data.budgetConfig.brideBudget || 0);
      setEngBudgetInput(data.budgetConfig.engagementBudget || 0);
      setWedBudgetInput(data.budgetConfig.weddingBudget || 0);
    }
  }, [data?.budgetConfig]);

  const isGroomSide = activeSideWorkspace === 'groom' || user?.role === 'groom';
  const isBrideSide = activeSideWorkspace === 'bride' || user?.role === 'bride';

  // Strict Financial Separation Metrics
  const displayedPlanned = isGroomSide
    ? budgetMetrics.groomBudget
    : isBrideSide
    ? budgetMetrics.brideBudget
    : budgetMetrics.totalPlanned;

  const displayedActual = isGroomSide
    ? budgetMetrics.groomSpent
    : isBrideSide
    ? budgetMetrics.brideSpent
    : budgetMetrics.totalActual;

  const displayedPaid = isGroomSide
    ? budgetMetrics.groomPaid
    : isBrideSide
    ? budgetMetrics.bridePaid
    : budgetMetrics.totalPaid;

  const displayedPending = isGroomSide
    ? budgetMetrics.groomPending
    : isBrideSide
    ? budgetMetrics.bridePending
    : budgetMetrics.totalPending;

  const displayedRemaining = isGroomSide
    ? budgetMetrics.groomRemaining
    : isBrideSide
    ? budgetMetrics.brideRemaining
    : budgetMetrics.remainingBudget;

  const displayedUtilization = isGroomSide
    ? budgetMetrics.groomUtilization
    : isBrideSide
    ? budgetMetrics.brideUtilization
    : budgetMetrics.utilizationPercent;

  // Filter expenses strictly by authorized side
  const rawExpenses = data?.expenses || [];
  const sideExpenses = rawExpenses.filter((e) => {
    if (user?.role === 'groom' || activeSideWorkspace === 'groom') return e.owner === 'groom';
    if (user?.role === 'bride' || activeSideWorkspace === 'bride') return e.owner === 'bride';
    return true; // Admin combined view
  });

  const filteredExpenses = sideExpenses.filter((e) => {
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
      const groomVal = Number(groomBudgetInput) || 0;
      const brideVal = Number(brideBudgetInput) || 0;
      const engVal = Number(engBudgetInput) || 0;
      const wedVal = Number(wedBudgetInput) || 0;

      await updateBudgetConfig({
        groomBudget: groomVal,
        brideBudget: brideVal,
        engagementBudget: engVal,
        weddingBudget: wedVal,
        combinedBudget: (groomVal + brideVal) || (engVal + wedVal),
      });

      setIsEditingBudgets(false);
      showToast('Side budget allocations saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update budgets', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Expense Title',
      'Side Owner',
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

    const rows = filteredExpenses.map((e) => [
      e.title,
      e.owner || 'shared',
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

    downloadCSV(
      `wedding_expenses_${activeSideWorkspace}_${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    );
  };

  const workspaceTitle = isGroomSide
    ? "Groom's Family Financial Workspace"
    : isBrideSide
    ? "Bride's Family Financial Workspace"
    : 'Combined Wedding Financial Dashboard';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Financial Separation Workspace Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34] mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Strict Side Financial Separation Active</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            {workspaceTitle}
          </h2>
          <p className="text-xs text-[#7A6B68]">
            {isGroomSide
              ? "Confidential groom-side budget, payments, and vendor ledger. Inaccessible to the bride's side."
              : isBrideSide
              ? "Confidential bride-side budget, jewellery, clothing, and vendor ledger. Inaccessible to the groom's side."
              : 'Master financial overview with separated side allocations and unified accounting.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Workspace Selector */}
          {user?.role === 'admin' && (
            <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
              <button
                onClick={() => setActiveSideWorkspace('combined')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeSideWorkspace === 'combined'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Combined
              </button>
              <button
                onClick={() => setActiveSideWorkspace('groom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeSideWorkspace === 'groom'
                    ? 'bg-amber-100 text-amber-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Groom Side
              </button>
              <button
                onClick={() => setActiveSideWorkspace('bride')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeSideWorkspace === 'bride'
                    ? 'bg-rose-100 text-rose-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Bride Side
              </button>
            </div>
          )}

          {canEditBudget && (
            <button
              onClick={() => setIsEditingBudgets(!isEditingBudgets)}
              className="py-2 px-3.5 rounded-xl border border-[#E8DEC8] bg-white text-xs font-semibold text-[#8C6D34] hover:bg-[#FAF5EB] transition cursor-pointer"
            >
              {isEditingBudgets ? 'Close Budget Settings' : 'Configure Budgets'}
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
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Editable Budget Settings Drawer with Separate Side Allocations */}
      {isEditingBudgets && canEditBudget && (
        <div className="p-5 rounded-2xl bg-[#FAF5EB] border border-[#E8DEC8] space-y-4 shadow-sm animate-in fade-in">
          <div className="font-serif font-bold text-sm text-[#2D2422]">
            Configure Independent Side Budgets & Ritual Allocations
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Groom Side Total Budget (₹)
              </label>
              <input
                type="number"
                value={groomBudgetInput}
                onChange={(e) => setGroomBudgetInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs font-semibold text-[#2D2422] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Bride Side Total Budget (₹)
              </label>
              <input
                type="number"
                value={brideBudgetInput}
                onChange={(e) => setBrideBudgetInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs font-semibold text-[#2D2422] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Engagement Ceremony Target (₹)
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
                Wedding & Reception Target (₹)
              </label>
              <input
                type="number"
                value={wedBudgetInput}
                onChange={(e) => setWedBudgetInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs font-semibold text-[#2D2422] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DEC8]">
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

      {/* 4 Financial Highlights (Calculated strictly for selected workspace) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs">
          <div className="text-xs text-[#7A6B68]">
            {isGroomSide ? "Groom's Planned Budget" : isBrideSide ? "Bride's Planned Budget" : 'Combined Total Budget'}
          </div>
          <div className="text-2xl font-serif font-bold text-[#2D2422] mt-1">
            {formatINR(displayedPlanned)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Remaining: <strong className="text-emerald-700">{formatINR(displayedRemaining)}</strong>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs">
          <div className="text-xs text-[#7A6B68]">Total Actual Committed</div>
          <div className="text-2xl font-serif font-bold text-[#8C6D34] mt-1">
            {formatINR(displayedActual)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            {displayedUtilization}% utilization of planned allocation
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs">
          <div className="text-xs text-[#7A6B68]">Total Amount Paid</div>
          <div className="text-2xl font-serif font-bold text-[#166534] mt-1">
            {formatINR(displayedPaid)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Cleared via UPI, Bank RTGS & Cards
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs">
          <div className="text-xs text-[#7A6B68]">Outstanding Amount Due</div>
          <div className="text-2xl font-serif font-bold text-[#A63A50] mt-1">
            {formatINR(displayedPending)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Pending to vendors & venues
          </div>
        </div>
      </div>

      {/* Utilization Warning if budget threshold exceeded */}
      {displayedUtilization >= 80 && (
        <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#F0C9CD] flex items-center gap-3 text-xs text-[#A63A50]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <strong className="font-semibold">Budget Utilization Alert:</strong> You have utilized{' '}
            {displayedUtilization}% of this workspace's planned allocation. Please review upcoming ceremony expenses carefully.
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by expense title, payee vendor, or category..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#9C8F8B] absolute left-3 top-2.5" />
        </div>

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

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
        >
          <option value="all">All Expense Categories</option>
          <option value="Venue">Venue</option>
          <option value="Catering">Catering</option>
          <option value="Decoration">Decoration</option>
          <option value="Clothing">Clothing</option>
          <option value="Jewellery">Jewellery</option>
          <option value="Photography">Photography</option>
          <option value="Travel & Stay">Travel & Stay</option>
          <option value="Gifts">Gifts</option>
          <option value="Invitations">Invitations</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Miscellaneous">Miscellaneous</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
        >
          <option value="all">All Payment Statuses</option>
          <option value="paid">Fully Cleared (Paid)</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="pending">Pending Payment</option>
        </select>
      </div>

      {/* Expenses Ledger Table */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#E8DEC8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF5EB] border-b border-[#E8DEC8] text-[#8C6D34] font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Expense Title</th>
                <th className="py-3 px-4">Owning Side</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payee / Vendor</th>
                <th className="py-3 px-4 text-right">Planned (₹)</th>
                <th className="py-3 px-4 text-right">Actual (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DD]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#8C7E7A]">
                    No expense records matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-[#FAF8F5]/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#2D2422]">{e.title}</div>
                      <div className="text-[10px] text-[#8C7E7A] uppercase tracking-wider mt-0.5">
                        {e.event} {e.paymentDate && `· ${formatDate(e.paymentDate)}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        e.owner === 'groom'
                          ? 'bg-amber-100 text-amber-900'
                          : e.owner === 'bride'
                          ? 'bg-rose-100 text-rose-900'
                          : 'bg-stone-100 text-stone-800'
                      }`}>
                        {e.owner || 'shared'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C4E4B]">{e.category}</td>
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
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          e.paymentStatus === 'paid'
                            ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                            : e.paymentStatus === 'partially_paid'
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                            : 'bg-[#FDF2F4] text-[#A63A50] border border-[#F0C9CD]'
                        }`}
                      >
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
                                const ok = await confirm({
                                  title: 'Delete Expense',
                                  message: `Are you sure you want to permanently delete "${e.title}"?`,
                                  confirmLabel: 'Delete Expense',
                                  isDestructive: true,
                                });
                                if (ok) {
                                  await deleteExpense(e.id);
                                  showToast(`Expense "${e.title}" deleted`, 'info');
                                }
                              }}
                              className="p-1 rounded text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4] cursor-pointer"
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
