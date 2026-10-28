import React, { useState } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Vendor } from '../../types/index.ts';
import {
  Store,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Trash2,
  DollarSign,
} from 'lucide-react';
import { formatINR } from '../../lib/utils.ts';

interface VendorsViewProps {
  onAddVendor: () => void;
  onEditVendor: (vendor: Vendor) => void;
  onPayVendor: (vendor: Vendor) => void;
}

export const VendorsView: React.FC<VendorsViewProps> = ({
  onAddVendor,
  onEditVendor,
  onPayVendor,
}) => {
  const { data, deleteVendor } = useWeddingData();
  const { canManageVendors } = useAuth();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const vendors = data?.vendors || [];

  const filteredVendors = vendors.filter(v => {
    if (filterCategory !== 'all' && v.category !== filterCategory) return false;
    if (filterStatus !== 'all' && v.bookingStatus !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = v.name.toLowerCase().includes(q);
      const matchContact = v.contactPerson.toLowerCase().includes(q);
      const matchCat = v.category.toLowerCase().includes(q);
      if (!matchName && !matchContact && !matchCat) return false;
    }
    return true;
  });

  const totalAgreed = vendors.reduce((sum, v) => sum + (v.agreedAmount || v.quotedAmount || 0), 0);
  const totalPaid = vendors.reduce((sum, v) => sum + (v.amountPaid || 0), 0);
  const totalBalanceDue = vendors.reduce((sum, v) => sum + (v.balanceDue || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            Vendor Management Directory
          </h2>
          <p className="text-xs text-[#7A6B68]">
            Manage venues, decorators, caterers, photographers, artists, and contracts
          </p>
        </div>

        {canManageVendors && (
          <button
            onClick={onAddVendor}
            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendor</span>
          </button>
        )}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Total Contracted Value</div>
          <div className="text-2xl font-serif font-bold text-[#2D2422] mt-1">
            {formatINR(totalAgreed)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Across {vendors.length} royal partners
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Total Advances Cleared</div>
          <div className="text-2xl font-serif font-bold text-[#166534] mt-1">
            {formatINR(totalPaid)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Paid & accounted in ledger
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Pending Vendor Balances</div>
          <div className="text-2xl font-serif font-bold text-[#A63A50] mt-1">
            {formatINR(totalBalanceDue)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            To be settled upon ceremony completion
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vendor agency, contact person, category..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#9C8F8B] absolute left-3 top-2.5" />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
        >
          <option value="all">All Booking Statuses</option>
          <option value="booked">Booked (Confirmed)</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="in_discussion">In Discussion</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[#8C7E7A] bg-[#FFFDF9] rounded-3xl border border-[#E8DEC8]">
            No vendors found matching your filter criteria.
          </div>
        ) : (
          filteredVendors.map(v => (
            <div
              key={v.id}
              className="p-5 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] hover:border-[#D4AF37]/60 transition shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#2D2422]">
                      {v.name}
                    </h4>
                    <span className="text-[11px] font-semibold text-[#8C6D34] uppercase tracking-wider">
                      {v.category}
                    </span>
                  </div>

                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    v.bookingStatus === 'booked'
                      ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
                      : v.bookingStatus === 'completed'
                      ? 'bg-[#FAF5EB] text-[#8C6D34] border-[#E8DEC8]'
                      : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                  }`}>
                    {v.bookingStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-[#5C4E4B]">
                  {v.contactPerson && (
                    <div className="font-medium text-[#2D2422]">
                      Contact: {v.contactPerson}
                    </div>
                  )}
                  {v.mobile && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#B38F4D]" />
                      <span>{v.mobile}</span>
                    </div>
                  )}
                  {v.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#B38F4D]" />
                      <span className="truncate">{v.email}</span>
                    </div>
                  )}
                </div>

                {/* Financial Summary Box */}
                <div className="mt-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE8DD] space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[#7A6B68]">
                    <span>Agreed Contract:</span>
                    <span className="font-semibold text-[#2D2422]">{formatINR(v.agreedAmount || v.quotedAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#166534]">
                    <span>Amount Paid:</span>
                    <span className="font-semibold">{formatINR(v.amountPaid)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#E8DEC8]/60 text-[#A63A50]">
                    <span className="font-medium">Balance Due:</span>
                    <span className="font-bold">{formatINR(v.balanceDue)}</span>
                  </div>
                </div>

                {v.notes && (
                  <p className="mt-2 text-[11px] text-[#7A6B68] italic line-clamp-2">
                    "{v.notes}"
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-[#F0E6D2] flex items-center justify-between text-xs">
                <div>
                  {v.attachmentUrl && (
                    <a
                      href={v.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#B38F4D] hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Contract</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPayVendor(v)}
                    className="py-1 px-2.5 rounded-lg bg-[#FAF5EB] hover:bg-[#F3EAD5] border border-[#E8DEC8] text-[11px] font-semibold text-[#8C6D34] transition"
                  >
                    Log Payment
                  </button>

                  {canManageVendors && (
                    <>
                      <button
                        onClick={() => onEditVendor(v)}
                        className="p-1 rounded text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete vendor "${v.name}"?`)) {
                            await deleteVendor(v.id);
                          }
                        }}
                        className="p-1 rounded text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
