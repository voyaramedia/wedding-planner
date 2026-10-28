import React, { useState } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Task, TaskStatus, TaskPriority, EventType } from '../../types/index.ts';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  List,
  Columns,
  History,
  Edit3,
  Trash2,
} from 'lucide-react';
import { formatDate } from '../../lib/utils.ts';

interface TasksViewProps {
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onAddTask, onEditTask }) => {
  const {
    data,
    deleteTask,
    toggleTaskStatus,
    engagementTaskCompletionPercent,
    weddingTaskCompletionPercent,
    overallTaskCompletionPercent,
  } = useWeddingData();
  const { canManageTasks } = useAuth();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTaskHistory, setSelectedTaskHistory] = useState<Task | null>(null);

  const tasks = data?.tasks || [];
  const now = new Date().getTime();

  const filteredTasks = tasks.filter(t => {
    if (filterEvent !== 'all' && t.relatedEvent !== filterEvent) return false;
    if (filterAssignee !== 'all' && t.assignedTo !== filterAssignee) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchPerson = (t.assignedToName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchPerson) return false;
    }
    return true;
  });

  // Sort by deadline
  const sortedTasks = [...filteredTasks].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const overdueTasks = tasks.filter(
    t => t.status !== 'completed' && new Date(t.dueDate).getTime() < now
  );

  const kanbanColumns: { id: TaskStatus; label: string; bg: string }[] = [
    { id: 'not_started', label: 'Not Started', bg: 'bg-[#F9F7F4]' },
    { id: 'in_progress', label: 'In Progress', bg: 'bg-[#FAF5EB]' },
    { id: 'completed', label: 'Completed', bg: 'bg-[#F0FDF4]' },
    { id: 'on_hold', label: 'On Hold', bg: 'bg-[#FDF2F4]' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            Editable Task Management
          </h2>
          <p className="text-xs text-[#7A6B68]">
            Assign, schedule, and collaborate across groom, bride, and family members
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher: List vs Kanban */}
          <div className="flex items-center p-1 bg-white border border-[#E8DEC8] rounded-xl text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition ${
                viewMode === 'list' ? 'bg-[#FAF5EB] font-semibold text-[#8C6D34]' : 'text-[#7A6B68]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition ${
                viewMode === 'kanban' ? 'bg-[#FAF5EB] font-semibold text-[#8C6D34]' : 'text-[#7A6B68]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban View</span>
            </button>
          </div>

          {canManageTasks && (
            <button
              onClick={onAddTask}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Completion Metrics & Overdue Alert */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="flex items-center justify-between text-xs text-[#7A6B68] mb-1">
            <span>Engagement Tasks</span>
            <span className="font-semibold text-[#8C6D34]">{engagementTaskCompletionPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#E8DEC8]/50 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-[#F0C9CD] to-[#D4AF37] rounded-full"
              style={{ width: `${engagementTaskCompletionPercent}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="flex items-center justify-between text-xs text-[#7A6B68] mb-1">
            <span>Wedding & Rituals</span>
            <span className="font-semibold text-[#8C6D34]">{weddingTaskCompletionPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#E8DEC8]/50 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B38F4D] rounded-full"
              style={{ width: `${weddingTaskCompletionPercent}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="flex items-center justify-between text-xs text-[#7A6B68] mb-1">
            <span>Overall Readiness</span>
            <span className="font-semibold text-[#166534]">{overallTaskCompletionPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#E8DEC8]/50 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-[#166534] rounded-full"
              style={{ width: `${overallTaskCompletionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Overdue alert banner if any */}
      {overdueTasks.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#F0C9CD] flex items-center justify-between text-xs text-[#A63A50]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}:</strong> Please review and prioritize upcoming ceremony deadlines.
            </span>
          </div>
          <button
            onClick={() => { setFilterStatus('all'); setFilterPriority('all'); }}
            className="font-semibold underline ml-2"
          >
            Review Overdue
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, descriptions, or assigned person..."
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
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>

      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <div className="rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs overflow-hidden">
          <div className="divide-y divide-[#EFE8DD]">
            {sortedTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8C7E7A]">
                No tasks found matching current filters.
              </div>
            ) : (
              sortedTasks.map(t => {
                const isOverdue = t.status !== 'completed' && new Date(t.dueDate).getTime() < now;
                return (
                  <div
                    key={t.id}
                    className="p-4 hover:bg-[#FAF8F5]/80 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => toggleTaskStatus(t.id)}
                        className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition shrink-0 cursor-pointer ${
                          t.status === 'completed'
                            ? 'bg-[#166534] border-[#166534] text-white'
                            : 'border-[#D4AF37] hover:bg-[#FAF5EB] text-transparent'
                        }`}
                        title={t.status === 'completed' ? 'Mark incomplete' : 'Mark completed'}
                      >
                        ✓
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${
                            t.status === 'completed' ? 'line-through text-[#8C7E7A]' : 'text-[#2D2422]'
                          }`}>
                            {t.title}
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            t.priority === 'urgent'
                              ? 'bg-[#FDF2F4] text-[#A63A50]'
                              : t.priority === 'high'
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : 'bg-[#F3F4F6] text-[#6B7280]'
                          }`}>
                            {t.priority}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-[#7A6B68] mt-1 line-clamp-1">
                            {t.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8C7E7A] mt-1.5">
                          <span className="capitalize">{t.relatedEvent}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-[#B38F4D]" />
                            <span>{t.assignedToName}</span>
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#B38F4D]" />
                            <span className={isOverdue ? 'text-[#A63A50] font-semibold' : ''}>
                              Due {formatDate(t.dueDate)} {isOverdue && '(Overdue)'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {t.history && t.history.length > 0 && (
                        <button
                          onClick={() => setSelectedTaskHistory(t)}
                          className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB]"
                          title="View activity history"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}

                      {canManageTasks && (
                        <>
                          <button
                            onClick={() => onEditTask(t)}
                            className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB]"
                            title="Edit task"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={async () => {
                              if (confirm(`Delete task "${t.title}"?`)) {
                                await deleteTask(t.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4]"
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanColumns.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div
                key={col.id}
                className="rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] p-4 flex flex-col min-h-[450px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#E8DEC8] mb-3">
                  <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#5C4E4B]">
                    {col.label}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-10 text-xs text-[#8C7E7A] italic">
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map(t => (
                      <div
                        key={t.id}
                        className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE8DD] hover:border-[#D4AF37] transition shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs text-[#2D2422] line-clamp-2">
                            {t.title}
                          </span>
                          <button
                            onClick={() => toggleTaskStatus(t.id)}
                            className="text-[#D4AF37] hover:scale-110 transition shrink-0"
                            title="Toggle status"
                          >
                            {t.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-[#166534]" />
                            ) : (
                              <div className="w-4 h-4 rounded border border-[#D4AF37]" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#7A6B68]">
                          <span className="capitalize">{t.relatedEvent}</span>
                          <span className="font-medium text-[#5C4E4B]">{t.assignedToName}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#EFE8DD] text-[10px]">
                          <span className="text-[#8C7E7A]">Due {formatDate(t.dueDate)}</span>
                          {canManageTasks && (
                            <button
                              onClick={() => onEditTask(t)}
                              className="text-[#B38F4D] hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task History Modal */}
      {selectedTaskHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2] mb-3">
              <h4 className="font-serif font-bold text-sm text-[#2D2422]">
                Activity History: {selectedTaskHistory.title}
              </h4>
              <button
                onClick={() => setSelectedTaskHistory(null)}
                className="text-xs text-[#7A6B68] hover:text-[#2D2422]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {selectedTaskHistory.history?.map(h => (
                <div key={h.id} className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD] text-xs">
                  <div className="font-medium text-[#2D2422]">{h.action}</div>
                  <div className="flex items-center justify-between text-[10px] text-[#8C7E7A] mt-1">
                    <span>By: {h.userName}</span>
                    <span>{formatDate(h.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
