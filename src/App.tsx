import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { WeddingDataProvider, useWeddingData } from './context/WeddingDataContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { Sidebar, ActivePage } from './components/layout/Sidebar.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { MobileBottomNav } from './components/layout/MobileBottomNav.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';

// Views
import { DashboardView } from './components/views/DashboardView.tsx';
import { PersonalWorkspaceView } from './components/views/PersonalWorkspaceView.tsx';
import { SuperAdminView } from './components/views/SuperAdminView.tsx';
import { EngagementPlannerView } from './components/views/EngagementPlannerView.tsx';
import { WeddingPlannerView } from './components/views/WeddingPlannerView.tsx';
import { TasksView } from './components/views/TasksView.tsx';
import { ExpensesBudgetView } from './components/views/ExpensesBudgetView.tsx';
import { GuestsView } from './components/views/GuestsView.tsx';
import { VendorsView } from './components/views/VendorsView.tsx';
import { CalendarView } from './components/views/CalendarView.tsx';
import { CoupleProfileView } from './components/views/CoupleProfileView.tsx';
import { GalleryView } from './components/views/GalleryView.tsx';
import { FamilyPermissionsView } from './components/views/FamilyPermissionsView.tsx';
import { ReportsView } from './components/views/ReportsView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';

// Modals
import { EditEventModal } from './components/modals/EditEventModal.tsx';
import { ExpenseModal } from './components/modals/ExpenseModal.tsx';
import { TaskModal } from './components/modals/TaskModal.tsx';
import { GuestModal } from './components/modals/GuestModal.tsx';
import { SendInviteModal } from './components/modals/SendInviteModal.tsx';
import { VendorModal } from './components/modals/VendorModal.tsx';

import { WeddingEvent, Expense, Task, Guest, Vendor } from './types/index.ts';
import { Heart } from 'lucide-react';

function MainApp() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    data,
    isLoading: dataLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    addExpense,
    updateExpense,
    addTask,
    updateTask,
    addGuest,
    updateGuest,
    uploadInvitationCard,
    sendInvitations,
    addVendor,
    updateVendor,
  } = useWeddingData();

  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal States
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WeddingEvent | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const [isSendInviteModalOpen, setIsSendInviteModalOpen] = useState(false);

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // If user is not logged in, show AuthModal
  if (!user && !authLoading) {
    return <AuthModal isOpen={true} onSuccess={() => {}} />;
  }

  // Global Loading State
  if (authLoading || (dataLoading && !data)) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center space-y-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#E8DEC8] animate-ping" />
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#C5A059] flex items-center justify-center text-white shadow-lg">
            <Heart className="w-6 h-6 fill-white" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="font-serif font-bold text-lg text-[#2D2422]">
            Our Wedding Planner
          </h2>
          <p className="text-xs text-[#8C7E7A] mt-1 font-light tracking-wide">
            Preparing your royal celebration dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Quick Action Handler from Navbar or Dashboard
  const handleQuickAction = (action: 'add_expense' | 'add_task' | 'add_event' | 'add_guest') => {
    if (action === 'add_expense') {
      setSelectedExpense(null);
      setIsExpenseModalOpen(true);
    } else if (action === 'add_task') {
      setSelectedTask(null);
      setIsTaskModalOpen(true);
    } else if (action === 'add_event') {
      setSelectedEvent(null);
      setIsEventModalOpen(true);
    } else if (action === 'add_guest') {
      setSelectedGuest(null);
      setIsGuestModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FAF8F5] text-[#2D2422]">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onOpenMobileMenu={() => setIsSidebarOpen(true)}
          onQuickAction={handleQuickAction}
        />

        <main className="flex-1 p-3.5 sm:p-5 md:p-8 pb-24 md:pb-8 overflow-y-auto">
          {activePage === 'dashboard' && (
            <DashboardView
              setActivePage={setActivePage}
              onQuickAction={handleQuickAction}
              onEditEvent={(event) => {
                setSelectedEvent(event);
                setIsEventModalOpen(true);
              }}
            />
          )}

          {activePage === 'groom_workspace' && (
            <PersonalWorkspaceView
              ownerRole="groom"
              onAddTask={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
              onAddExpense={() => {
                setSelectedExpense(null);
                setIsExpenseModalOpen(true);
              }}
              onAddGuest={() => {
                setSelectedGuest(null);
                setIsGuestModalOpen(true);
              }}
            />
          )}

          {activePage === 'bride_workspace' && (
            <PersonalWorkspaceView
              ownerRole="bride"
              onAddTask={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
              onAddExpense={() => {
                setSelectedExpense(null);
                setIsExpenseModalOpen(true);
              }}
              onAddGuest={() => {
                setSelectedGuest(null);
                setIsGuestModalOpen(true);
              }}
            />
          )}

          {activePage === 'superadmin' && <SuperAdminView />}

          {activePage === 'engagement' && (
            <EngagementPlannerView
              setActivePage={setActivePage}
              onAddExpense={() => {
                setSelectedExpense(null);
                setIsExpenseModalOpen(true);
              }}
              onAddTask={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
              onEditEvent={(event) => {
                setSelectedEvent(event);
                setIsEventModalOpen(true);
              }}
            />
          )}

          {activePage === 'wedding' && (
            <WeddingPlannerView
              setActivePage={setActivePage}
              onAddExpense={() => {
                setSelectedExpense(null);
                setIsExpenseModalOpen(true);
              }}
              onAddTask={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
              onEditEvent={(event) => {
                setSelectedEvent(event);
                setIsEventModalOpen(true);
              }}
            />
          )}

          {activePage === 'tasks' && (
            <TasksView
              onAddTask={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
              onEditTask={(task) => {
                setSelectedTask(task);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {activePage === 'expenses' && (
            <ExpensesBudgetView
              onAddExpense={() => {
                setSelectedExpense(null);
                setIsExpenseModalOpen(true);
              }}
              onEditExpense={(expense) => {
                setSelectedExpense(expense);
                setIsExpenseModalOpen(true);
              }}
            />
          )}

          {activePage === 'guests' && (
            <GuestsView
              onAddGuest={() => {
                setSelectedGuest(null);
                setIsGuestModalOpen(true);
              }}
              onEditGuest={(guest) => {
                setSelectedGuest(guest);
                setIsGuestModalOpen(true);
              }}
              onOpenSendInvite={() => setIsSendInviteModalOpen(true)}
            />
          )}

          {activePage === 'vendors' && (
            <VendorsView
              onAddVendor={() => {
                setSelectedVendor(null);
                setIsVendorModalOpen(true);
              }}
              onEditVendor={(vendor) => {
                setSelectedVendor(vendor);
                setIsVendorModalOpen(true);
              }}
              onPayVendor={(vendor) => {
                setSelectedExpense({
                  id: '',
                  title: `${vendor.name} Milestone Settlement`,
                  event: (vendor.event === 'all' ? 'wedding' : vendor.event) as any,
                  category: vendor.category,
                  plannedAmount: vendor.balanceDue,
                  actualAmount: vendor.balanceDue,
                  amountPaid: 0,
                  remainingAmount: vendor.balanceDue,
                  paymentStatus: 'pending',
                  vendorId: vendor.id,
                  vendorName: vendor.name,
                  createdBy: '',
                  createdAt: '',
                });
                setIsExpenseModalOpen(true);
              }}
            />
          )}

          {activePage === 'calendar' && (
            <CalendarView
              onAddEvent={() => {
                setSelectedEvent(null);
                setIsEventModalOpen(true);
              }}
              onEditEvent={(event) => {
                setSelectedEvent(event);
                setIsEventModalOpen(true);
              }}
            />
          )}

          {activePage === 'couple' && <CoupleProfileView />}
          {activePage === 'gallery' && <GalleryView />}

          {activePage === 'family' && <FamilyPermissionsView />}

          {activePage === 'reports' && <ReportsView />}

          {activePage === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Modals Container */}
      <EditEventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={async (eventData) => {
          if (selectedEvent) {
            await updateEvent(selectedEvent.id, eventData);
          } else {
            await addEvent(eventData as any);
          }
        }}
        onDelete={async (id) => {
          await deleteEvent(id);
        }}
        event={selectedEvent}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
        onSave={async (expenseData) => {
          if (selectedExpense && selectedExpense.id) {
            await updateExpense(selectedExpense.id, expenseData);
          } else {
            await addExpense(expenseData);
          }
        }}
        expense={selectedExpense}
        vendors={data?.vendors || []}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={async (taskData) => {
          if (selectedTask) {
            await updateTask(selectedTask.id, taskData);
          } else {
            await addTask(taskData);
          }
        }}
        task={selectedTask}
        users={data?.users || []}
      />

      <GuestModal
        isOpen={isGuestModalOpen}
        onClose={() => {
          setIsGuestModalOpen(false);
          setSelectedGuest(null);
        }}
        onSave={async (guestData) => {
          if (selectedGuest) {
            await updateGuest(selectedGuest.id, guestData);
          } else {
            await addGuest(guestData);
          }
        }}
        guest={selectedGuest}
      />

      <SendInviteModal
        isOpen={isSendInviteModalOpen}
        onClose={() => setIsSendInviteModalOpen(false)}
        guests={data?.guests || []}
        invitationCards={data?.invitationCards || []}
        onUploadCard={uploadInvitationCard}
        onSend={sendInvitations}
      />

      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => {
          setIsVendorModalOpen(false);
          setSelectedVendor(null);
        }}
        onSave={async (vendorData) => {
          if (selectedVendor) {
            await updateVendor(selectedVendor.id, vendorData);
          } else {
            await addVendor(vendorData);
          }
        }}
        vendor={selectedVendor}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenMoreMenu={() => setIsSidebarOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <WeddingDataProvider>
          <MainApp />
        </WeddingDataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
