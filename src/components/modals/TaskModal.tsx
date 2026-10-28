import React, { useState, useEffect } from 'react';
import { Task, EventType, TaskPriority, TaskStatus, User } from '../../types/index.ts';
import { X, Calendar, User as UserIcon, AlertCircle, DollarSign } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => Promise<void>;
  task?: Task | null;
  users?: User[];
  defaultEvent?: EventType | 'all';
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  task,
  users = [],
  defaultEvent = 'all',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [relatedEvent, setRelatedEvent] = useState<EventType | 'all'>(defaultEvent);
  const [category, setCategory] = useState('General');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [actualCost, setActualCost] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setRelatedEvent(task.relatedEvent || 'all');
      setCategory(task.category || 'General');
      setAssignedTo(task.assignedTo || '');
      setAssignedToName(task.assignedToName || '');
      setStartDate(task.startDate ? task.startDate.split('T')[0] : '');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'not_started');
      setEstimatedCost(task.estimatedCost || 0);
      setActualCost(task.actualCost || 0);
      setNotes(task.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setRelatedEvent(defaultEvent);
      setCategory('General');
      setAssignedTo(users[0]?.id || '');
      setAssignedToName(users[0]?.name || '');
      setStartDate(new Date().toISOString().split('T')[0]);
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 14);
      setDueDate(defaultDue.toISOString().split('T')[0]);
      setPriority('medium');
      setStatus('not_started');
      setEstimatedCost(0);
      setActualCost(0);
      setNotes('');
    }
  }, [task, defaultEvent, users, isOpen]);

  const handleAssigneeChange = (uId: string) => {
    setAssignedTo(uId);
    const found = users.find(u => u.id === uId);
    if (found) {
      setAssignedToName(found.name);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      alert('Please enter a task title and due date.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        title: title.trim(),
        description: description.trim(),
        relatedEvent,
        category: category.trim() || 'General',
        assignedTo,
        assignedToName: assignedToName || 'Unassigned',
        startDate: startDate || undefined,
        dueDate,
        priority,
        status,
        estimatedCost: Number(estimatedCost) || 0,
        actualCost: Number(actualCost) || 0,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0E6D2]">
          <h3 className="font-serif font-bold text-lg text-[#2D2422]">
            {task ? 'Edit Task' : 'Create New Task'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Confirm guest transportation fleet from airport"
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed instructions, requirements, deliverables..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Related Ceremony
              </label>
              <select
                value={relatedEvent}
                onChange={(e) => setRelatedEvent(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="all">All / Entire Celebration</option>
                <option value="engagement">Engagement</option>
                <option value="wedding">Wedding (Pheras)</option>
                <option value="haldi">Haldi</option>
                <option value="mehendi">Mehendi</option>
                <option value="sangeet">Sangeet</option>
                <option value="reception">Reception</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Logistics, Outfits, Venue"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Assigned Person
              </label>
              <select
                value={assignedTo}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.relation || u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Due Date (Deadline) *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Estimated Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                value={estimatedCost || ''}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Checklist & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reminders, contact numbers, special instructions..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-[#F0E6D2]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-[#E5DFD7] text-xs font-medium text-[#5C4E4B] hover:bg-[#FAF8F5] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
