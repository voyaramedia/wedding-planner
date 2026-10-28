import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import {
  Lock,
  ShieldCheck,
  CheckSquare,
  Wallet,
  Users,
  FolderLock,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  FileText,
  Upload,
  Download,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { formatINR, formatDate } from '../../lib/utils.ts';
import { ChecklistItem, VaultDocument, Task, Expense, Guest } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface PersonalWorkspaceViewProps {
  ownerRole: 'groom' | 'bride';
  onAddTask: () => void;
  onAddExpense: () => void;
  onAddGuest: () => void;
}

export const PersonalWorkspaceView: React.FC<PersonalWorkspaceViewProps> = ({
  ownerRole,
  onAddTask,
  onAddExpense,
  onAddGuest,
}) => {
  const { user } = useAuth();
  const {
    data,
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
    addVaultDocument,
    deleteVaultDocument,
    toggleTaskStatus,
    deleteTask,
    deleteExpense,
    deleteGuest,
  } = useWeddingData();

  const isGroom = ownerRole === 'groom';
  const couple = data?.coupleProfile;
  const person = isGroom ? couple?.groom : couple?.bride;
  const otherRoleName = isGroom ? "Bride" : "Groom";

  // Check if current logged in user has access
  const hasAccess = user?.role === 'admin' || user?.role === ownerRole;

  const [activeTab, setActiveTab] = useState<'checklists' | 'tasks' | 'expenses' | 'guests' | 'vault'>('checklists');

  // New checklist item state
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState(isGroom ? 'Groom Wardrobe' : 'Bridal Wardrobe');

  // New Vault Document state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<'invitation' | 'contract' | 'outfit' | 'id_proof' | 'itinerary' | 'other'>('outfit');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filtered private records
  const checklists = (data?.checklists || []).filter(c => c.owner === ownerRole);
  const tasks = (data?.tasks || []).filter(t => t.owner === ownerRole);
  const expenses = (data?.expenses || []).filter(e => e.owner === ownerRole);
  const guests = (data?.guests || []).filter(g => g.owner === ownerRole || g.side === ownerRole);
  const vaultDocs = (data?.vaultDocuments || []).filter(d => d.owner === ownerRole);

  const totalExpenseActual = expenses.reduce((sum, e) => sum + (Number(e.actualAmount) || 0), 0);
  const totalTasksCompleted = tasks.filter(t => t.status === 'completed').length;
  const totalChecklistsCompleted = checklists.filter(c => c.completed).length;

  // Handle privacy block if logged in user is the other side
  if (!hasAccess) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#FAF5EB] border border-[#E8DEC8] text-[#8C6D34] flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Lock className="w-8 h-8 text-[#C5A059]" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
          {isGroom ? "Groom's" : "Bride's"} Private Workspace
        </h2>
        <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-[#FAF5EB] border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34]">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
          <span>Strict Server-Side Privacy Active</span>
        </div>
        <p className="text-xs sm:text-sm text-[#7A6B68] max-w-md mx-auto mt-3 leading-relaxed">
          In accordance with privacy rules, {otherRoleName} cannot view, edit, or download {isGroom ? "Groom's" : "Bride's"} personal checklists, private budgets, outfit files, or personal notes.
        </p>
        <div className="mt-6 p-4 rounded-2xl bg-white border border-[#E8DEC8] max-w-sm mx-auto text-left text-xs text-[#5C4E4B]">
          <div className="font-semibold text-[#2D2422] mb-1">To access this workspace:</div>
          <div>Log out and log in with {isGroom ? "Groom" : "Bride"} credentials or contact the Super Administrator.</div>
        </div>
      </div>
    );
  }

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    await addChecklistItem({
      title: newChecklistTitle.trim(),
      category: newChecklistCategory,
      owner: ownerRole,
    });
    setNewChecklistTitle('');
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newDocTitle.trim()) {
      setUploadError('Please provide a document title before choosing a file.');
      return;
    }

    try {
      setIsUploadingDoc(true);
      setUploadError(null);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await api.uploadFile(dataUrl, file.name);
          await addVaultDocument({
            title: newDocTitle.trim(),
            fileUrl: res.url,
            fileType: file.type || 'application/pdf',
            fileName: file.name,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            category: newDocCategory,
            owner: ownerRole,
          });
          setNewDocTitle('');
        } catch (err: any) {
          setUploadError(err.message || 'Failed to upload document');
        } finally {
          setIsUploadingDoc(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || 'File read error');
      setIsUploadingDoc(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Workspace Header Banner */}
      <div className={`relative rounded-3xl p-5 sm:p-7 md:p-8 border shadow-sm overflow-hidden ${
        isGroom
          ? 'bg-gradient-to-r from-[#FFFDF9] via-[#FAF5EB] to-[#F5EFE6] border-[#D4AF37]/40'
          : 'bg-gradient-to-r from-[#FFFDF9] via-[#FFF5F6] to-[#FAF0F2] border-[#F0C9CD]'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={person?.photoUrl || (isGroom ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400')}
                alt={person?.name}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 shadow-md ${
                  isGroom ? 'border-[#D4AF37]/50 ring-4 ring-[#FAF5EB]' : 'border-[#F0C9CD] ring-4 ring-[#FFF5F6]'
                }`}
              />
              <span className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs ${
                isGroom ? 'bg-[#D4AF37]' : 'bg-[#E8A5AC]'
              }`}>
                {isGroom ? 'Groom' : 'Bride'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isGroom ? 'bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]' : 'bg-[#FFF0F2] text-[#A63A50] border border-[#F0C9CD]'
                }`}>
                  Private Workspace
                </span>
                <span className="text-xs text-[#8C7E7A] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#B38F4D]" />
                  <span>Hidden from {otherRoleName}</span>
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-[#2D2422] mt-1">
                {person?.name || (isGroom ? 'Groom' : 'Bride')}'s Workspace
              </h2>
              <p className="text-xs sm:text-sm text-[#7A6B68] font-light mt-0.5">
                Master Wedding ID: <strong className="font-mono font-semibold text-[#8C6D34]">{data?.weddingId}</strong>
              </p>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-white/80 border border-[#E8DEC8] px-3.5 py-2 rounded-xl text-center shadow-2xs">
              <div className="text-[10px] uppercase font-semibold text-[#8C7E7A]">Private Expenses</div>
              <div className="text-sm font-serif font-bold text-[#2D2422]">{formatINR(totalExpenseActual)}</div>
            </div>
            <div className="bg-white/80 border border-[#E8DEC8] px-3.5 py-2 rounded-xl text-center shadow-2xs">
              <div className="text-[10px] uppercase font-semibold text-[#8C7E7A]">Checklist</div>
              <div className="text-sm font-serif font-bold text-[#2D2422]">
                {totalChecklistsCompleted} / {checklists.length}
              </div>
            </div>
            <div className="bg-white/80 border border-[#E8DEC8] px-3.5 py-2 rounded-xl text-center shadow-2xs">
              <div className="text-[10px] uppercase font-semibold text-[#8C7E7A]">Vault Files</div>
              <div className="text-sm font-serif font-bold text-[#2D2422]">{vaultDocs.length} Docs</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 pt-4 border-t border-[#E8DEC8]/60 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('checklists')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'checklists'
                ? 'bg-[#2D2422] text-white shadow-xs'
                : 'bg-white/80 text-[#5C4E4B] hover:bg-white border border-[#E8DEC8]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Personal Checklists ({checklists.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-[#2D2422] text-white shadow-xs'
                : 'bg-white/80 text-[#5C4E4B] hover:bg-white border border-[#E8DEC8]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Private Tasks ({tasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-[#2D2422] text-white shadow-xs'
                : 'bg-white/80 text-[#5C4E4B] hover:bg-white border border-[#E8DEC8]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Private Expenses ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guests')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'guests'
                ? 'bg-[#2D2422] text-white shadow-xs'
                : 'bg-white/80 text-[#5C4E4B] hover:bg-white border border-[#E8DEC8]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isGroom ? "Groom's Side" : "Bride's Side"} Guests ({guests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-[#2D2422] text-white shadow-xs'
                : 'bg-white/80 text-[#5C4E4B] hover:bg-white border border-[#E8DEC8]'
            }`}
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span>Document Vault ({vaultDocs.length})</span>
          </button>
        </div>
      </div>

      {/* 1. PERSONAL CHECKLISTS TAB */}
      {activeTab === 'checklists' && (
        <div className="space-y-4">
          {/* Quick Add Checklist Form */}
          <form onSubmit={handleAddChecklist} className="p-4 bg-white rounded-2xl border border-[#E8DEC8] flex flex-col sm:flex-row items-center gap-2.5 shadow-2xs">
            <input
              type="text"
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              placeholder={`Add new personal checklist item for ${person?.name}...`}
              className="flex-1 w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] outline-none focus:border-[#D4AF37]"
            />
            <select
              value={newChecklistCategory}
              onChange={(e) => setNewChecklistCategory(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
            >
              {isGroom ? (
                <>
                  <option value="Groom Wardrobe">Groom Wardrobe</option>
                  <option value="Baraat & Logistics">Baraat & Logistics</option>
                  <option value="Groom Favors">Groom Favors</option>
                  <option value="Groom Grooming">Groom Grooming</option>
                  <option value="Other">Other Personal</option>
                </>
              ) : (
                <>
                  <option value="Bridal Wardrobe">Bridal Wardrobe</option>
                  <option value="Bridal Jewellery">Bridal Jewellery</option>
                  <option value="Mehendi & Henna">Mehendi & Henna</option>
                  <option value="Bridal Accessories">Bridal Accessories</option>
                  <option value="Other">Other Personal</option>
                </>
              )}
            </select>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#D4AF37] text-white text-xs font-semibold hover:brightness-105 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </form>

          {/* Checklist Items List */}
          <div className="bg-white rounded-3xl border border-[#E8DEC8] divide-y divide-[#F0E6D2] overflow-hidden shadow-xs">
            {checklists.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8C7E7A]">
                No checklist items yet. Add your personal preparations above!
              </div>
            ) : (
              checklists.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#FAF8F5] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                        item.completed
                          ? 'bg-[#166534] border-[#166534] text-white'
                          : 'border-[#C5A059] hover:bg-[#FAF5EB]'
                      }`}
                    >
                      {item.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div className="min-w-0">
                      <div className={`text-xs font-medium truncate ${
                        item.completed ? 'line-through text-[#8C7E7A]' : 'text-[#2D2422]'
                      }`}>
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#7A6B68] mt-0.5">
                        <span className="font-semibold text-[#8C6D34]">{item.category}</span>
                        {item.dueDate && <span>· Due {formatDate(item.dueDate)}</span>}
                        {item.notes && <span className="truncate">· {item.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="p-1.5 text-[#AAA09D] hover:text-[#A63A50] hover:bg-[#FDF2F4] rounded-lg transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. PRIVATE TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#7A6B68]">
              Private milestones only visible inside this workspace
            </div>
            <button
              onClick={onAddTask}
              className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-[#D4AF37] text-white text-xs font-semibold hover:brightness-105 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Private Task</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {tasks.length === 0 ? (
              <div className="col-span-full p-8 text-center text-xs text-[#8C7E7A] bg-white rounded-2xl border border-[#E8DEC8]">
                No private tasks assigned yet.
              </div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-white border border-[#E8DEC8] hover:border-[#D4AF37] transition shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => toggleTaskStatus(t.id)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center text-xs transition cursor-pointer shrink-0 ${
                          t.status === 'completed'
                            ? 'bg-[#166534] border-[#166534] text-white'
                            : 'border-[#C5A059] hover:bg-[#FAF5EB]'
                        }`}
                      >
                        {t.status === 'completed' ? '✓' : ''}
                      </button>
                      <h4 className={`text-xs font-bold truncate ${
                        t.status === 'completed' ? 'line-through text-[#8C7E7A]' : 'text-[#2D2422]'
                      }`}>
                        {t.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => deleteTask(t.id)}
                      className="p-1 text-[#AAA09D] hover:text-[#A63A50] rounded-lg transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-[11px] text-[#7A6B68] line-clamp-2">{t.description}</p>

                  <div className="flex items-center justify-between text-[10px] text-[#8C7E7A] pt-2 border-t border-[#F5EFE6]">
                    <span>Due: {formatDate(t.dueDate)}</span>
                    <span className="font-semibold text-[#8C6D34]">₹{t.estimatedCost.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. PRIVATE EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#5C4E4B]">
                Total Logged: {formatINR(totalExpenseActual)}
              </span>
            </div>
            <button
              onClick={onAddExpense}
              className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-[#D4AF37] text-white text-xs font-semibold hover:brightness-105 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Private Expense</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8DEC8] divide-y divide-[#F0E6D2] overflow-hidden shadow-xs">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8C7E7A]">
                No private expenses recorded yet.
              </div>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="p-4 flex items-center justify-between gap-3 hover:bg-[#FAF8F5] transition">
                  <div>
                    <div className="text-xs font-bold text-[#2D2422]">{exp.title}</div>
                    <div className="flex items-center gap-2 text-[10px] text-[#7A6B68] mt-0.5">
                      <span className="font-medium text-[#8C6D34]">{exp.category}</span>
                      <span>·</span>
                      <span className="capitalize">{exp.event}</span>
                      {exp.paymentDate && <span>· Paid on {formatDate(exp.paymentDate)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#2D2422]">{formatINR(exp.actualAmount)}</div>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        exp.paymentStatus === 'paid' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}>
                        {exp.paymentStatus}
                      </span>
                    </div>

                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="p-1.5 text-[#AAA09D] hover:text-[#A63A50] rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. PRIVATE GUESTS TAB */}
      {activeTab === 'guests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#7A6B68]">
              {isGroom ? "Groom's Side Guest Roster" : "Bride's Side Guest Roster"}
            </div>
            <button
              onClick={onAddGuest}
              className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-[#D4AF37] text-white text-xs font-semibold hover:brightness-105 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Guest</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8DEC8] divide-y divide-[#F0E6D2] overflow-hidden shadow-xs">
            {guests.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8C7E7A]">
                No guests added to your private roster yet.
              </div>
            ) : (
              guests.map((g) => (
                <div key={g.id} className="p-4 flex items-center justify-between gap-3 hover:bg-[#FAF8F5] transition">
                  <div>
                    <div className="text-xs font-bold text-[#2D2422]">
                      {g.name} <span className="text-[10px] font-normal text-[#8C7E7A]">({g.headcount} pax)</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#7A6B68] mt-0.5">
                      <span>{g.relation || 'Relative'}</span>
                      <span>·</span>
                      <span>{g.mobile}</span>
                      {g.email && <span>· {g.email}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      g.rsvpStatus === 'attending' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FAF5EB] text-[#8C6D34]'
                    }`}>
                      {g.rsvpStatus}
                    </span>

                    <button
                      onClick={() => deleteGuest(g.id)}
                      className="p-1.5 text-[#AAA09D] hover:text-[#A63A50] rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. DOCUMENT VAULT TAB */}
      {activeTab === 'vault' && (
        <div className="space-y-4">
          {/* Document Upload Card */}
          <div className="p-4 bg-white rounded-2xl border border-[#E8DEC8] shadow-2xs space-y-3">
            <div className="text-xs font-bold text-[#8C6D34] flex items-center gap-1.5 uppercase tracking-wider">
              <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
              Upload Document to Vault (PDF, DOCX, JPG, PNG)
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-[#FDF2F4] border border-[#F0C9CD] text-[#A63A50] text-xs">
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Document title (e.g. Sabyasachi Lehenga Receipt, Tailoring Specs)..."
                className="sm:col-span-6 px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />

              <select
                value={newDocCategory}
                onChange={(e) => setNewDocCategory(e.target.value as any)}
                className="sm:col-span-3 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
              >
                <option value="outfit">Outfit & Measurements</option>
                <option value="contract">Vendor Contract</option>
                <option value="invitation">Invitation Proof</option>
                <option value="id_proof">ID / Travel Proof</option>
                <option value="other">Other Document</option>
              </select>

              <label className="sm:col-span-3 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#D4AF37] text-white text-xs font-semibold hover:brightness-105 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingDoc ? 'Uploading...' : 'Choose File'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf,.docx"
                  onChange={handleDocUpload}
                  disabled={isUploadingDoc}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Vault Documents Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {vaultDocs.length === 0 ? (
              <div className="col-span-full p-8 text-center text-xs text-[#8C7E7A] bg-white rounded-2xl border border-[#E8DEC8]">
                Your document vault is currently empty. Upload important contracts, fittings, or invitations above.
              </div>
            ) : (
              vaultDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-white border border-[#E8DEC8] hover:border-[#D4AF37] transition shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#FAF5EB] text-[#8C6D34]">
                        {doc.category}
                      </span>
                      <button
                        onClick={() => deleteVaultDocument(doc.id)}
                        className="text-[#AAA09D] hover:text-[#A63A50] transition"
                        title="Delete from Vault"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-xs font-bold text-[#2D2422] mt-2 line-clamp-1">{doc.title}</h4>
                    <p className="text-[10px] text-[#8C7E7A] mt-0.5">{doc.fileName || 'Document File'}</p>
                  </div>

                  <div className="pt-2 border-t border-[#F5EFE6] flex items-center justify-between text-[10px]">
                    <span className="text-[#AAA09D]">{doc.fileSize || '1.5 MB'}</span>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#8C6D34] hover:underline"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View File</span>
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
