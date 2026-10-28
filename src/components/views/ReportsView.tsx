import React, { useRef } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Wallet,
  CheckSquare,
  Users,
  Store,
} from 'lucide-react';
import { formatINR, formatDate, formatTime, downloadCSV } from '../../lib/utils.ts';

export const ReportsView: React.FC = () => {
  const { data, budgetMetrics } = useWeddingData();
  const printRef = useRef<HTMLDivElement>(null);

  const couple = data?.coupleProfile;
  const groomName = couple?.groom?.name || 'Groom';
  const brideName = couple?.bride?.name || 'Bride';
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const exportExpensesCSV = () => {
    const headers = ['Title', 'Ceremony', 'Category', 'Planned (INR)', 'Actual (INR)', 'Paid (INR)', 'Outstanding (INR)', 'Status', 'Payee'];
    const rows = (data?.expenses || []).map(e => [
      e.title,
      e.event,
      e.category,
      e.plannedAmount,
      e.actualAmount,
      e.amountPaid,
      e.remainingAmount,
      e.paymentStatus,
      e.vendorName || '',
    ]);
    downloadCSV(`wedding_expenses_report_${todayStr}`, headers, rows);
  };

  const exportTasksCSV = () => {
    const headers = ['Task Title', 'Ceremony', 'Priority', 'Status', 'Assigned To', 'Due Date', 'Estimated Cost', 'Actual Cost'];
    const rows = (data?.tasks || []).map(t => [
      t.title,
      t.relatedEvent,
      t.priority,
      t.status,
      t.assignedToName,
      t.dueDate,
      t.estimatedCost,
      t.actualCost,
    ]);
    downloadCSV(`wedding_tasks_checklist_${todayStr}`, headers, rows);
  };

  const exportVendorsCSV = () => {
    const headers = ['Vendor Name', 'Category', 'Contact Person', 'Mobile', 'Agreed Amount (INR)', 'Amount Paid (INR)', 'Balance Due (INR)', 'Status'];
    const rows = (data?.vendors || []).map(v => [
      v.name,
      v.category,
      v.contactPerson,
      v.mobile,
      v.agreedAmount || v.quotedAmount,
      v.amountPaid,
      v.balanceDue,
      v.bookingStatus,
    ]);
    downloadCSV(`wedding_vendors_summary_${todayStr}`, headers, rows);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            Reports & Celebration Exports
          </h2>
          <p className="text-xs text-[#7A6B68]">
            Printable preparation checklists, financial ledgers, and vendor balance summaries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-[#D4AF37] bg-[#FAF5EB] text-xs font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] transition cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report / PDF</span>
          </button>
        </div>
      </div>

      {/* Quick Download Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <button
          onClick={exportExpensesCSV}
          className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] hover:border-[#D4AF37] transition text-left flex items-center justify-between group shadow-2xs"
        >
          <div>
            <div className="text-xs font-bold text-[#2D2422]">Complete Expense Ledger</div>
            <div className="text-[11px] text-[#7A6B68] mt-0.5">Download full CSV statement</div>
          </div>
          <Download className="w-4 h-4 text-[#B38F4D] group-hover:translate-y-0.5 transition" />
        </button>

        <button
          onClick={exportTasksCSV}
          className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] hover:border-[#D4AF37] transition text-left flex items-center justify-between group shadow-2xs"
        >
          <div>
            <div className="text-xs font-bold text-[#2D2422]">Wedding Tasks & Deadlines</div>
            <div className="text-[11px] text-[#7A6B68] mt-0.5">Checklist with assignees</div>
          </div>
          <Download className="w-4 h-4 text-[#B38F4D] group-hover:translate-y-0.5 transition" />
        </button>

        <button
          onClick={exportVendorsCSV}
          className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] hover:border-[#D4AF37] transition text-left flex items-center justify-between group shadow-2xs"
        >
          <div>
            <div className="text-xs font-bold text-[#2D2422]">Vendor Payment Summary</div>
            <div className="text-[11px] text-[#7A6B68] mt-0.5">Balances & agreements</div>
          </div>
          <Download className="w-4 h-4 text-[#B38F4D] group-hover:translate-y-0.5 transition" />
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div
        ref={printRef}
        className="p-8 md:p-12 rounded-3xl bg-white border border-[#E8DEC8] shadow-sm space-y-8 text-xs text-[#2D2422]"
      >
        {/* Printable Header */}
        <div className="text-center pb-6 border-b-2 border-[#E8DEC8] space-y-1">
          <div className="font-serif text-3xl font-bold tracking-tight text-[#2D2422]">
            Our Wedding Preparation Report
          </div>
          <div className="text-base font-serif text-[#8C6D34]">
            {groomName} & {brideName} · {couple?.hashtag || '#OurWedding'}
          </div>
          <div className="text-xs text-[#7A6B68] pt-1">
            Generated on {todayStr} · Currency: INR (₹)
          </div>
        </div>

        {/* 1. Executive Financial Summary */}
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-base text-[#2D2422] uppercase tracking-wider pb-1 border-b border-[#F0E6D2]">
            1. Executive Financial Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[#7A6B68]">Planned Combined Budget</div>
              <div className="text-lg font-serif font-bold text-[#2D2422] mt-1">{formatINR(budgetMetrics.totalPlanned)}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[#7A6B68]">Total Actual Committed</div>
              <div className="text-lg font-serif font-bold text-[#8C6D34] mt-1">{formatINR(budgetMetrics.totalActual)}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[#7A6B68]">Total Amount Paid</div>
              <div className="text-lg font-serif font-bold text-[#166534] mt-1">{formatINR(budgetMetrics.totalPaid)}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[#7A6B68]">Outstanding Balance</div>
              <div className="text-lg font-serif font-bold text-[#A63A50] mt-1">{formatINR(budgetMetrics.totalPending)}</div>
            </div>
          </div>
        </div>

        {/* 2. Ceremony Schedules */}
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-base text-[#2D2422] uppercase tracking-wider pb-1 border-b border-[#F0E6D2]">
            2. Ceremonies & Muhurat Schedules
          </h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF5EB] text-[#5C4E4B]">
                <th className="p-2">Ceremony</th>
                <th className="p-2">Date & Time</th>
                <th className="p-2">Venue & Location</th>
                <th className="p-2">Dress Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DD]">
              {data?.events.map(ev => (
                <tr key={ev.id}>
                  <td className="p-2 font-semibold">{ev.title} ({ev.type})</td>
                  <td className="p-2">{formatDate(ev.dateTime)} at {formatTime(ev.dateTime)}</td>
                  <td className="p-2">{ev.venue}</td>
                  <td className="p-2">{ev.dressCode || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3. Vendor Settlement Summary */}
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-base text-[#2D2422] uppercase tracking-wider pb-1 border-b border-[#F0E6D2]">
            3. Vendor Contracts & Payment Status
          </h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF5EB] text-[#5C4E4B]">
                <th className="p-2">Vendor Name</th>
                <th className="p-2">Category</th>
                <th className="p-2">Contact Person</th>
                <th className="p-2 text-right">Agreed (₹)</th>
                <th className="p-2 text-right">Paid (₹)</th>
                <th className="p-2 text-right">Balance Due (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DD]">
              {data?.vendors.map(v => (
                <tr key={v.id}>
                  <td className="p-2 font-semibold">{v.name}</td>
                  <td className="p-2">{v.category}</td>
                  <td className="p-2">{v.contactPerson} ({v.mobile})</td>
                  <td className="p-2 text-right">{formatINR(v.agreedAmount || v.quotedAmount)}</td>
                  <td className="p-2 text-right text-[#166534]">{formatINR(v.amountPaid)}</td>
                  <td className="p-2 text-right text-[#A63A50] font-semibold">{formatINR(v.balanceDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Preparation Checklist */}
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-base text-[#2D2422] uppercase tracking-wider pb-1 border-b border-[#F0E6D2]">
            4. Master Preparation Checklist
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data?.tasks.map(t => (
              <div key={t.id} className="p-2 rounded-lg border border-[#EFE8DD] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded border text-[9px] flex items-center justify-center ${
                    t.status === 'completed' ? 'bg-[#166534] text-white' : 'border-[#AAA09D]'
                  }`}>
                    {t.status === 'completed' ? '✓' : ''}
                  </span>
                  <span className={t.status === 'completed' ? 'line-through text-[#8C7E7A]' : 'font-medium'}>
                    {t.title}
                  </span>
                </div>
                <span className="text-[10px] text-[#7A6B68] shrink-0">
                  {formatDate(t.dueDate)} ({t.assignedToName})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Signature */}
        <div className="pt-8 border-t border-[#E8DEC8] flex items-center justify-between text-[#8C7E7A]">
          <span>Our Wedding Planner Suite · {couple?.hashtag}</span>
          <span>Verified by Family Administrator</span>
        </div>
      </div>
    </div>
  );
};
