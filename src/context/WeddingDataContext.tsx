import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  WeddingData,
  CoupleProfile,
  BudgetConfig,
  WeddingEvent,
  Expense,
  Task,
  ChecklistItem,
  VaultDocument,
  Vendor,
  Guest,
  InvitationCard,
  GalleryItem,
  SharedGuestStats,
} from '../types/index.ts';
import { api } from '../lib/api.ts';
import { useAuth } from './AuthContext.tsx';
import { fireCelebrationConfetti } from '../lib/utils.ts';

interface BudgetMetrics {
  totalPlanned: number;
  totalActual: number;
  totalPaid: number;
  totalPending: number;
  remainingBudget: number;
  utilizationPercent: number;
  engagementBudget: number;
  engagementSpent: number;
  weddingBudget: number;
  weddingSpent: number;
  groomSpent: number;
  brideSpent: number;
  sharedSpent: number;
}

interface WeddingDataContextType {
  data: WeddingData | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  
  // Profile & Config
  updateCoupleProfile: (updates: Partial<CoupleProfile>) => Promise<void>;
  updateBudgetConfig: (updates: Partial<BudgetConfig>) => Promise<void>;
  
  // Events
  addEvent: (event: Omit<WeddingEvent, 'id'>) => Promise<WeddingEvent>;
  updateEvent: (id: string, updates: Partial<WeddingEvent>) => Promise<WeddingEvent>;
  deleteEvent: (id: string) => Promise<void>;
  
  // Expenses
  addExpense: (expense: Partial<Expense>) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Tasks
  addTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;

  // Checklists
  addChecklistItem: (item: Partial<ChecklistItem>) => Promise<ChecklistItem>;
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => Promise<ChecklistItem>;
  deleteChecklistItem: (id: string) => Promise<void>;
  toggleChecklistItem: (id: string) => Promise<void>;

  // Document Vault
  addVaultDocument: (doc: Partial<VaultDocument>) => Promise<VaultDocument>;
  deleteVaultDocument: (id: string) => Promise<void>;
  
  // Vendors
  addVendor: (vendor: Partial<Vendor>) => Promise<Vendor>;
  updateVendor: (id: string, updates: Partial<Vendor>) => Promise<Vendor>;
  deleteVendor: (id: string) => Promise<void>;
  
  // Guests
  addGuest: (guest: Partial<Guest>) => Promise<Guest>;
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<Guest>;
  deleteGuest: (id: string) => Promise<void>;
  
  // Invitations
  uploadInvitationCard: (data: { title: string; imageUrl: string; event: string; messageTemplate?: string }) => Promise<InvitationCard>;
  sendInvitations: (payload: { guestIds: string[]; invitationCardId?: string; channel?: string; customMessage?: string }) => Promise<{ success: boolean; sentCount: number; message: string }>;
  
  // Gallery
  addGalleryPhoto: (data: Partial<GalleryItem>) => Promise<GalleryItem>;
  updateGalleryPhoto: (id: string, updates: Partial<GalleryItem>) => Promise<GalleryItem>;
  deleteGalleryPhoto: (id: string) => Promise<void>;
  adminDeletePhoto: (id: string) => Promise<void>;

  // Computed metrics
  budgetMetrics: BudgetMetrics;
  engagementTaskCompletionPercent: number;
  weddingTaskCompletionPercent: number;
  overallTaskCompletionPercent: number;
  groomTaskCompletionPercent: number;
  brideTaskCompletionPercent: number;
}

const WeddingDataContext = createContext<WeddingDataContextType | undefined>(undefined);

export const WeddingDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [data, setData] = useState<WeddingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.fetchWeddingData();
      setData(res);
    } catch (err: any) {
      console.error('Failed to fetch wedding data:', err);
      setError(err.message || 'Failed to load wedding details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData, user]);

  // Couple Profile
  const updateCoupleProfile = async (updates: Partial<CoupleProfile>) => {
    const res = await api.updateCoupleProfile(updates);
    setData(prev => prev ? { ...prev, coupleProfile: res.coupleProfile } : null);
  };

  // Budget Config
  const updateBudgetConfig = async (updates: Partial<BudgetConfig>) => {
    const res = await api.updateBudgetConfig(updates);
    setData(prev => prev ? { ...prev, budgetConfig: res.budgetConfig } : null);
  };

  // Events
  const addEvent = async (eventData: Omit<WeddingEvent, 'id'>) => {
    const created = await api.addEvent(eventData);
    setData(prev => prev ? { ...prev, events: [...prev.events, created] } : null);
    return created;
  };

  const updateEvent = async (id: string, updates: Partial<WeddingEvent>) => {
    const updated = await api.updateEvent(id, updates);
    setData(prev => {
      if (!prev) return null;
      const exists = prev.events.some(e => e.id === id || e.id === updated.id);
      const newEvents = exists
        ? prev.events.map(e => (e.id === id || e.id === updated.id) ? updated : e)
        : [...prev.events, updated];
      return {
        ...prev,
        events: newEvents,
        coupleProfile: {
          ...prev.coupleProfile,
          ...(updated.type === 'engagement' ? {
            ...(updated.dateTime !== undefined ? { engagementDate: updated.dateTime } : {}),
            ...(updated.venue !== undefined ? { engagementVenue: updated.venue } : {}),
            ...(updated.address !== undefined ? { engagementAddress: updated.address } : {}),
            ...(updated.mapLink !== undefined ? { engagementMapLink: updated.mapLink } : {}),
          } : {}),
          ...(updated.type === 'wedding' ? {
            ...(updated.dateTime !== undefined ? { weddingDate: updated.dateTime } : {}),
            ...(updated.venue !== undefined ? { weddingVenue: updated.venue } : {}),
            ...(updated.address !== undefined ? { weddingAddress: updated.address } : {}),
            ...(updated.mapLink !== undefined ? { weddingMapLink: updated.mapLink } : {}),
          } : {}),
        }
      };
    });
    return updated;
  };

  const deleteEvent = async (id: string) => {
    await api.deleteEvent(id);
    setData(prev => {
      if (!prev) return null;
      const target = prev.events.find(e => e.id === id);
      const isEng = id === 'evt_eng' || id === 'engagement' || target?.type === 'engagement';
      const isWed = id === 'evt_wed' || id === 'wedding' || target?.type === 'wedding';
      return {
        ...prev,
        events: prev.events.filter(e => e.id !== id),
        coupleProfile: {
          ...prev.coupleProfile,
          ...(isEng ? { engagementDate: '', engagementVenue: '', engagementAddress: '', engagementMapLink: '' } : {}),
          ...(isWed ? { weddingDate: '', weddingVenue: '', weddingAddress: '', weddingMapLink: '' } : {}),
        }
      };
    });
  };

  // Expenses
  const addExpense = async (expenseData: Partial<Expense>) => {
    const created = await api.addExpense(expenseData);
    setData(prev => {
      if (!prev) return null;
      return { ...prev, expenses: [created, ...prev.expenses] };
    });
    return created;
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const updated = await api.updateExpense(id, updates);
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        expenses: prev.expenses.map(e => e.id === id ? updated : e),
      };
    });
    return updated;
  };

  const deleteExpense = async (id: string) => {
    await api.deleteExpense(id);
    setData(prev => prev ? { ...prev, expenses: prev.expenses.filter(e => e.id !== id) } : null);
  };

  // Tasks
  const addTask = async (taskData: Partial<Task>) => {
    const created = await api.addTask(taskData);
    setData(prev => prev ? { ...prev, tasks: [created, ...prev.tasks] } : null);
    return created;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const updated = await api.updateTask(id, updates);
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === id ? updated : t),
      };
    });
    return updated;
  };

  const deleteTask = async (id: string) => {
    await api.deleteTask(id);
    setData(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== id) } : null);
  };

  const toggleTaskStatus = async (id: string) => {
    if (!data) return;
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    if (newStatus === 'completed') {
      fireCelebrationConfetti();
    }
    await updateTask(id, { status: newStatus });
  };

  // Checklists
  const addChecklistItem = async (itemData: Partial<ChecklistItem>) => {
    const created = await api.addChecklistItem(itemData);
    setData(prev => prev ? { ...prev, checklists: [created, ...(prev.checklists || [])] } : null);
    return created;
  };

  const updateChecklistItem = async (id: string, updates: Partial<ChecklistItem>) => {
    const updated = await api.updateChecklistItem(id, updates);
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        checklists: (prev.checklists || []).map(c => c.id === id ? updated : c),
      };
    });
    return updated;
  };

  const deleteChecklistItem = async (id: string) => {
    await api.deleteChecklistItem(id);
    setData(prev => prev ? { ...prev, checklists: (prev.checklists || []).filter(c => c.id !== id) } : null);
  };

  const toggleChecklistItem = async (id: string) => {
    if (!data) return;
    const item = (data.checklists || []).find(c => c.id === id);
    if (!item) return;
    const newCompleted = !item.completed;
    if (newCompleted) {
      fireCelebrationConfetti();
    }
    await updateChecklistItem(id, { completed: newCompleted });
  };

  // Document Vault
  const addVaultDocument = async (docData: Partial<VaultDocument>) => {
    const created = await api.addVaultDocument(docData);
    setData(prev => prev ? { ...prev, vaultDocuments: [created, ...(prev.vaultDocuments || [])] } : null);
    return created;
  };

  const deleteVaultDocument = async (id: string) => {
    await api.deleteVaultDocument(id);
    setData(prev => prev ? { ...prev, vaultDocuments: (prev.vaultDocuments || []).filter(d => d.id !== id) } : null);
  };

  // Vendors
  const addVendor = async (vendorData: Partial<Vendor>) => {
    const created = await api.addVendor(vendorData);
    setData(prev => prev ? { ...prev, vendors: [...prev.vendors, created] } : null);
    return created;
  };

  const updateVendor = async (id: string, updates: Partial<Vendor>) => {
    const updated = await api.updateVendor(id, updates);
    setData(prev => prev ? { ...prev, vendors: prev.vendors.map(v => v.id === id ? updated : v) } : null);
    return updated;
  };

  const deleteVendor = async (id: string) => {
    await api.deleteVendor(id);
    setData(prev => prev ? { ...prev, vendors: prev.vendors.filter(v => v.id !== id) } : null);
  };

  // Guests
  const addGuest = async (guestData: Partial<Guest>) => {
    const created = await api.addGuest(guestData);
    setData(prev => prev ? { ...prev, guests: [...prev.guests, created] } : null);
    return created;
  };

  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    const updated = await api.updateGuest(id, updates);
    setData(prev => prev ? { ...prev, guests: prev.guests.map(g => g.id === id ? updated : g) } : null);
    return updated;
  };

  const deleteGuest = async (id: string) => {
    await api.deleteGuest(id);
    setData(prev => prev ? { ...prev, guests: prev.guests.filter(g => g.id !== id) } : null);
  };

  // Invitations
  const uploadInvitationCard = async (cardData: { title: string; imageUrl: string; event: string; messageTemplate?: string }) => {
    const created = await api.uploadInvitationCard(cardData);
    setData(prev => prev ? { ...prev, invitationCards: [created, ...prev.invitationCards] } : null);
    return created;
  };

  const sendInvitations = async (payload: { guestIds: string[]; invitationCardId?: string; channel?: string; customMessage?: string }) => {
    const res = await api.sendInvitations(payload);
    fireCelebrationConfetti();
    await refreshData();
    return res;
  };

  // Gallery
  const addGalleryPhoto = async (photoData: Partial<GalleryItem>) => {
    const created = await api.addGalleryPhoto(photoData);
    setData(prev => prev ? { ...prev, gallery: [created, ...prev.gallery] } : null);
    return created;
  };

  const updateGalleryPhoto = async (id: string, updates: Partial<GalleryItem>) => {
    const updated = await api.updateGalleryPhoto(id, updates);
    setData(prev => prev ? { ...prev, gallery: prev.gallery.map(g => g.id === id ? updated : g) } : null);
    return updated;
  };

  const deleteGalleryPhoto = async (id: string) => {
    await api.deleteGalleryPhoto(id);
    setData(prev => prev ? { ...prev, gallery: prev.gallery.filter(g => g.id !== id) } : null);
  };

  const adminDeletePhoto = async (id: string) => {
    await api.adminDeletePhoto(id);
    await refreshData();
  };

  // Calculations
  const expenses = data?.expenses || [];
  const budgetConfig = data?.budgetConfig;

  const totalPlanned = Number(budgetConfig?.combinedBudget) || 0;
  const totalActual = expenses.reduce((sum, e) => sum + (Number(e.actualAmount) || 0), 0);
  const totalPaid = expenses.reduce((sum, e) => sum + (Number(e.amountPaid) || 0), 0);
  const totalPending = expenses.reduce((sum, e) => sum + (Number(e.remainingAmount) || 0), 0);
  const remainingBudget = Math.max(0, totalPlanned - totalActual);
  const utilizationPercent = totalPlanned > 0 ? Math.min(100, Math.round((totalActual / totalPlanned) * 100)) : 0;

  const engagementExpenses = expenses.filter(e => e.event === 'engagement');
  const engagementSpent = engagementExpenses.reduce((sum, e) => sum + (Number(e.actualAmount) || 0), 0);
  const engagementBudget = Number(budgetConfig?.engagementBudget) || 0;

  const weddingExpenses = expenses.filter(e => e.event === 'wedding' || e.event === 'haldi' || e.event === 'mehendi' || e.event === 'sangeet' || e.event === 'reception');
  const weddingSpent = weddingExpenses.reduce((sum, e) => sum + (Number(e.actualAmount) || 0), 0);
  const weddingBudget = Number(budgetConfig?.weddingBudget) || 0;

  const groomSpent = expenses.filter(e => e.owner === 'groom').reduce((sum, e) => sum + (Number(e.actualAmount) || 0), 0);
  const brideSpent = expenses.filter(e => e.owner === 'bride').reduce((sum, e) => sum + (Number(e.actualAmount) || 0), 0);
  const sharedSpent = expenses.filter(e => e.owner === 'shared' || !e.owner).reduce((sum, e) => sum + (Number(e.actualAmount) || 0), 0);

  const budgetMetrics: BudgetMetrics = {
    totalPlanned,
    totalActual,
    totalPaid,
    totalPending,
    remainingBudget,
    utilizationPercent,
    engagementBudget,
    engagementSpent,
    weddingBudget,
    weddingSpent,
    groomSpent,
    brideSpent,
    sharedSpent,
  };

  // Task completion percentages
  const tasks = data?.tasks || [];
  const engagementTasks = tasks.filter(t => t.relatedEvent === 'engagement');
  const weddingTasks = tasks.filter(t => t.relatedEvent === 'wedding' || t.relatedEvent === 'all');

  const engagementCompleted = engagementTasks.filter(t => t.status === 'completed').length;
  const engagementTaskCompletionPercent = engagementTasks.length > 0 ? Math.round((engagementCompleted / engagementTasks.length) * 100) : 0;

  const weddingCompleted = weddingTasks.filter(t => t.status === 'completed').length;
  const weddingTaskCompletionPercent = weddingTasks.length > 0 ? Math.round((weddingCompleted / weddingTasks.length) * 100) : 0;

  const overallCompleted = tasks.filter(t => t.status === 'completed').length;
  const overallTaskCompletionPercent = tasks.length > 0 ? Math.round((overallCompleted / tasks.length) * 100) : 0;

  const groomTasks = tasks.filter(t => t.owner === 'groom');
  const groomCompleted = groomTasks.filter(t => t.status === 'completed').length;
  const groomTaskCompletionPercent = groomTasks.length > 0 ? Math.round((groomCompleted / groomTasks.length) * 100) : 0;

  const brideTasks = tasks.filter(t => t.owner === 'bride');
  const brideCompleted = brideTasks.filter(t => t.status === 'completed').length;
  const brideTaskCompletionPercent = brideTasks.length > 0 ? Math.round((brideCompleted / brideTasks.length) * 100) : 0;

  return (
    <WeddingDataContext.Provider
      value={{
        data,
        isLoading,
        error,
        refreshData,
        updateCoupleProfile,
        updateBudgetConfig,
        addEvent,
        updateEvent,
        deleteEvent,
        addExpense,
        updateExpense,
        deleteExpense,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        addChecklistItem,
        updateChecklistItem,
        deleteChecklistItem,
        toggleChecklistItem,
        addVaultDocument,
        deleteVaultDocument,
        addVendor,
        updateVendor,
        deleteVendor,
        addGuest,
        updateGuest,
        deleteGuest,
        uploadInvitationCard,
        sendInvitations,
        addGalleryPhoto,
        updateGalleryPhoto,
        deleteGalleryPhoto,
        adminDeletePhoto,
        budgetMetrics,
        engagementTaskCompletionPercent,
        weddingTaskCompletionPercent,
        overallTaskCompletionPercent,
        groomTaskCompletionPercent,
        brideTaskCompletionPercent,
      }}
    >
      {children}
    </WeddingDataContext.Provider>
  );
};

export function useWeddingData() {
  const context = useContext(WeddingDataContext);
  if (!context) {
    throw new Error('useWeddingData must be used within a WeddingDataProvider');
  }
  return context;
}
