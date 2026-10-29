export type UserRole = 'admin' | 'groom' | 'bride' | 'family';
export type RecordOwner = 'groom' | 'bride' | 'shared';

export interface UserPermissions {
  canEditBudget: boolean;
  canManageVendors: boolean;
  canManageTasks: boolean;
  canManageGuests: boolean;
  canEditEvents: boolean;
  canManageUsers: boolean;
}

export interface User {
  id: string;
  weddingId?: string;
  username?: string;
  mobile: string;
  email: string;
  name: string;
  role: UserRole;
  relation?: string;
  permissions: UserPermissions;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface PersonProfile {
  name: string;
  nickname?: string;
  dob?: string;
  mobile: string;
  email?: string;
  bio: string;
  photoUrl: string;
}

export interface CoupleProfile {
  weddingId: string;
  weddingTitle: string;
  preferredLanguage?: string;
  preferredTimeZone?: string;
  groom: PersonProfile;
  bride: PersonProfile;
  coverPhotoUrl: string;
  story: string;
  hashtag: string;
  engagementDate: string;
  engagementVenue: string;
  engagementAddress?: string;
  engagementMapLink?: string;
  weddingDate: string;
  weddingVenue: string;
  weddingAddress?: string;
  weddingMapLink?: string;
  primaryCurrency: string;
}

export type EventType = 'engagement' | 'wedding' | 'haldi' | 'mehendi' | 'sangeet' | 'reception' | 'other';

export interface WeddingEvent {
  id: string;
  weddingId?: string;
  title: string;
  type: EventType;
  dateTime: string;
  endDateTime?: string;
  venue: string;
  address?: string;
  mapLink?: string;
  dressCode?: string;
  personResponsible?: string;
  notes?: string;
  owner?: RecordOwner;
  visibility?: RecordOwner;
}

export interface BudgetConfig {
  engagementBudget: number;
  weddingBudget: number;
  combinedBudget: number;
  groomBudget: number;
  brideBudget: number;
  categoryBudgets: Record<string, number>;
  groomCategoryBudgets?: Record<string, number>;
  brideCategoryBudgets?: Record<string, number>;
}

export type PaymentStatus = 'pending' | 'partially_paid' | 'paid';

export interface Expense {
  id: string;
  weddingId?: string;
  title: string;
  event: EventType;
  category: string;
  plannedAmount: number;
  actualAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  vendorId?: string;
  vendorName?: string;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  receiptUrl?: string;
  responsiblePerson?: string;
  owner?: RecordOwner;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';

export interface TaskHistoryItem {
  id: string;
  action: string;
  userName: string;
  timestamp: string;
}

export interface Task {
  id: string;
  weddingId?: string;
  title: string;
  description: string;
  relatedEvent: EventType | 'all';
  category: string;
  assignedTo: string;
  assignedToName: string;
  createdBy: string;
  createdByName: string;
  startDate?: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedCost: number;
  actualCost: number;
  notes?: string;
  owner?: RecordOwner;
  history: TaskHistoryItem[];
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  weddingId?: string;
  title: string;
  category: string;
  completed: boolean;
  owner: RecordOwner;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface VaultDocument {
  id: string;
  weddingId?: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileName?: string;
  fileSize?: string;
  category: 'invitation' | 'contract' | 'outfit' | 'id_proof' | 'itinerary' | 'other';
  owner: RecordOwner;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  notes?: string;
}

export type VendorStatus = 'in_discussion' | 'shortlisted' | 'booked' | 'completed' | 'cancelled';

export interface Vendor {
  id: string;
  weddingId?: string;
  name: string;
  category: string;
  contactPerson: string;
  mobile: string;
  email: string;
  quotedAmount: number;
  agreedAmount: number;
  advancePaid: number;
  amountPaid: number;
  balanceDue: number;
  event: EventType | 'all';
  bookingStatus: VendorStatus;
  attachmentUrl?: string;
  notes?: string;
  owner?: RecordOwner;
  linkedExpenseIds: string[];
}

export type GuestSide = 'groom' | 'bride' | 'mutual';
export type RSVPStatus = 'attending' | 'declined' | 'pending' | 'tentative';
export type InvitationType = 'engagement' | 'wedding' | 'reception' | 'other';

export interface GuestInvitationRecord {
  id: string;
  invitationType: InvitationType;
  customFunctionName?: string;
  recipientName: string;
  recipientContact: string;
  channel: 'whatsapp' | 'email' | 'digital';
  message: string;
  sentBySide: 'bride' | 'groom';
  sentByName: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed';
}

export interface Guest {
  id: string;
  weddingId?: string;
  srNo?: number;
  name: string;
  side: GuestSide;
  relation?: string;
  mobile: string;
  email: string;
  headcount: number;
  rsvpStatus: RSVPStatus;
  dietary?: string;
  eventsInvited: string[];
  invitationType?: InvitationType;
  customFunctionName?: string;
  invitationSent: boolean;
  invitationSentAt?: string;
  invitationSentBy?: string;
  invitationMethod?: 'whatsapp' | 'email' | 'digital' | 'both';
  invitationCardId?: string;
  notes?: string;
  owner?: RecordOwner;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;

  // Shared Guest Deduplication & Attendance Group Synchronization
  sharedGuestId?: string;
  canonicalAttendanceGroupId?: string;
  isConfirmedShared?: boolean;
  matchedGuestId?: string;
  invitationHistory?: GuestInvitationRecord[];
}

export interface SharedGuestStats {
  groomSide: {
    totalPax: number;
    attendingPax: number;
    pendingPax: number;
    declinedPax: number;
    invitationsSent: number;
  };
  brideSide: {
    totalPax: number;
    attendingPax: number;
    pendingPax: number;
    declinedPax: number;
    invitationsSent: number;
  };
  mutualSide: {
    totalPax: number;
    attendingPax: number;
    pendingPax: number;
    declinedPax: number;
    invitationsSent: number;
  };
  combinedEventPax: number;
  uniqueGuestsCount: number;
  duplicateGroupCount: number;
}

export interface InvitationCard {
  id: string;
  weddingId?: string;
  title: string;
  imageUrl: string;
  event: string;
  messageTemplate: string;
  owner?: RecordOwner;
  uploadedAt: string;
}

export type GalleryCategory =
  | 'groom'
  | 'bride'
  | 'family'
  | 'ceremony'
  | 'engagement'
  | 'wedding'
  | 'pre-wedding'
  | 'reception'
  | 'custom'
  | 'other';

export interface PhotoAlbum {
  id: string;
  weddingId?: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  category: 'engagement' | 'wedding' | 'pre-wedding' | 'family' | 'reception' | 'custom';
  owner: RecordOwner;
  createdAt: string;
  photoCount?: number;
}

export interface GalleryItem {
  id: string;
  weddingId?: string;
  albumId?: string;
  title: string;
  imageUrl: string;
  category: GalleryCategory;
  date: string;
  caption?: string;
  description?: string;
  owner?: RecordOwner;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  category: string;
  userName: string;
  timestamp: string;
  details?: string;
}

export interface WeddingData {
  weddingId: string;
  users: User[];
  coupleProfile: CoupleProfile;
  events: WeddingEvent[];
  budgetConfig: BudgetConfig;
  expenses: Expense[];
  tasks: Task[];
  checklists: ChecklistItem[];
  vaultDocuments: VaultDocument[];
  vendors: Vendor[];
  guests: Guest[];
  sharedGuestStats: SharedGuestStats;
  invitationCards: InvitationCard[];
  albums: PhotoAlbum[];
  gallery: GalleryItem[];
  activityLogs: ActivityLog[];
}

export interface CoupleRegistrationPayload {
  groomName: string;
  groomMobile: string;
  groomEmail: string;
  groomPassword: string;
  groomPhotoUrl?: string;

  brideName: string;
  brideMobile: string;
  brideEmail: string;
  bridePassword: string;
  bridePhotoUrl?: string;

  weddingTitle?: string;
  preferredLanguage?: string;
  preferredTimeZone?: string;

  engagementDate: string;
  engagementTime: string;
  engagementVenue: string;
  engagementAddress?: string;
  engagementMapLink?: string;

  weddingDate: string;
  weddingTime: string;
  weddingVenue: string;
  weddingAddress?: string;
  weddingMapLink?: string;
}

export interface RegisteredWeddingSummary {
  weddingId: string;
  title: string;
  groomName: string;
  brideName: string;
  groomMobile: string;
  brideMobile: string;
  weddingDate: string;
  weddingVenue: string;
  engagementDate: string;
  engagementVenue: string;
  totalExpenses: number;
  totalGuests: number;
  status: 'active' | 'archived';
  createdAt: string;
}
