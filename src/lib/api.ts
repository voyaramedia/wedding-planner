import {
  WeddingData,
  User,
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
  CoupleRegistrationPayload,
  RegisteredWeddingSummary,
} from '../types/index.ts';

const TOKEN_KEY = 'wedding_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Authentication
  login: (identifier: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  registerCouple: (data: CoupleRegistrationPayload) =>
    request<{ token: string; user: User; weddingId: string; message: string }>('/api/auth/register-couple', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: {
    name: string;
    mobile: string;
    email?: string;
    password: string;
    role: string;
    relation?: string;
    groomName?: string;
    brideName?: string;
  }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<{ user: User }>('/api/auth/me'),

  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      clearStoredToken();
    }
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  forgotPassword: (identifier: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, newPassword }),
    }),

  // Core Wedding Data
  fetchWeddingData: () => request<WeddingData>('/api/wedding-data'),

  updateCoupleProfile: (data: Partial<CoupleProfile>) =>
    request<{ success: boolean; coupleProfile: CoupleProfile }>('/api/couple-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateBudgetConfig: (data: Partial<BudgetConfig>) =>
    request<{ success: boolean; budgetConfig: BudgetConfig }>('/api/budget-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Events & Ceremonies
  addEvent: (data: Omit<WeddingEvent, 'id'>) =>
    request<WeddingEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEvent: (id: string, data: Partial<WeddingEvent>) =>
    request<WeddingEvent>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteEvent: (id: string) =>
    request<{ success: boolean }>(`/api/events/${id}`, {
      method: 'DELETE',
    }),

  // Expenses
  addExpense: (data: Partial<Expense>) =>
    request<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateExpense: (id: string, data: Partial<Expense>) =>
    request<Expense>(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteExpense: (id: string) =>
    request<{ success: boolean }>(`/api/expenses/${id}`, {
      method: 'DELETE',
    }),

  // Tasks
  addTask: (data: Partial<Task>) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: Partial<Task>) =>
    request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (id: string) =>
    request<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),

  // Checklists
  fetchChecklists: () => request<ChecklistItem[]>('/api/checklists'),

  addChecklistItem: (data: Partial<ChecklistItem>) =>
    request<ChecklistItem>('/api/checklists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateChecklistItem: (id: string, data: Partial<ChecklistItem>) =>
    request<ChecklistItem>(`/api/checklists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteChecklistItem: (id: string) =>
    request<{ success: boolean }>(`/api/checklists/${id}`, {
      method: 'DELETE',
    }),

  // Document & Invitation Vault
  fetchVaultDocuments: () => request<VaultDocument[]>('/api/vault'),

  addVaultDocument: (data: Partial<VaultDocument>) =>
    request<VaultDocument>('/api/vault', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteVaultDocument: (id: string) =>
    request<{ success: boolean }>(`/api/vault/${id}`, {
      method: 'DELETE',
    }),

  // Vendors
  addVendor: (data: Partial<Vendor>) =>
    request<Vendor>('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateVendor: (id: string, data: Partial<Vendor>) =>
    request<Vendor>(`/api/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteVendor: (id: string) =>
    request<{ success: boolean }>(`/api/vendors/${id}`, {
      method: 'DELETE',
    }),

  // Guests
  addGuest: (data: Partial<Guest>) =>
    request<Guest>('/api/guests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateGuest: (id: string, data: Partial<Guest>) =>
    request<Guest>(`/api/guests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteGuest: (id: string) =>
    request<{ success: boolean }>(`/api/guests/${id}`, {
      method: 'DELETE',
    }),

  // Invitations
  uploadInvitationCard: (data: { title: string; imageUrl: string; event: string; messageTemplate?: string }) =>
    request<InvitationCard>('/api/invitations/card', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendInvitations: (payload: { guestIds: string[]; invitationCardId?: string; channel?: string; customMessage?: string }) =>
    request<{ success: boolean; sentCount: number; message: string }>('/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Gallery
  addGalleryPhoto: (data: Partial<GalleryItem>) =>
    request<GalleryItem>('/api/gallery', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateGalleryPhoto: (id: string, data: Partial<GalleryItem>) =>
    request<GalleryItem>(`/api/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteGalleryPhoto: (id: string) =>
    request<{ success: boolean }>(`/api/gallery/${id}`, {
      method: 'DELETE',
    }),

  adminDeletePhoto: (id: string) =>
    request<{ success: boolean; message?: string }>(`/api/admin/photos/${id}`, {
      method: 'DELETE',
    }),

  // Super Admin
  fetchAdminWeddings: () =>
    request<{ weddings: RegisteredWeddingSummary[]; totalWeddings: number; totalUsers: number; activityLogs: any[] }>(
      '/api/admin/weddings'
    ),

  // User Management (Admin)
  getUsers: () => request<User[]>('/api/users'),

  addUser: (data: any) =>
    request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id: string, data: any) =>
    request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteUser: (id: string) =>
    request<{ success: boolean }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  // File & Image Upload
  uploadFile: (dataUrl: string, filename?: string) =>
    request<{ url: string; size: number; fileName: string; mimeType: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, filename }),
    }),

  uploadImage: (dataUrl: string, filename?: string) =>
    request<{ url: string; size: number; fileName: string; mimeType: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, filename }),
    }),
};
