import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers with large limits for image & document uploads
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Database file path
const dbPath = path.join(dataDir, 'wedding-database.json');

// Password hashing utility using Node crypto scrypt
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const check = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
  } catch {
    return false;
  }
}

// Persistent sessions map
interface Session {
  userId: string;
  token: string;
  createdAt: number;
}
const sessionsFilePath = path.join(dataDir, 'sessions.json');
function loadSessions(): Map<string, Session> {
  try {
    if (fs.existsSync(sessionsFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(sessionsFilePath, 'utf-8'));
      return new Map(Object.entries(parsed));
    }
  } catch (err) {
    console.error('Error reading sessions file:', err);
  }
  return new Map();
}
const sessions = loadSessions();

function saveSessions() {
  try {
    const obj = Object.fromEntries(sessions.entries());
    fs.writeFileSync(sessionsFilePath, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sessions file:', err);
  }
}

// Top-level helpers
function saveBase64Image(dataUrl: string, prefix = 'upload'): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl || null;
  try {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9/.-]+);base64,(.+)$/);
    if (!matches) return null;
    const mime = matches[1];
    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    const buffer = Buffer.from(matches[2], 'base64');
    const safeName = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${safeName}`;
  } catch (err) {
    console.error('Failed to save base64 image:', err);
    return null;
  }
}

function syncVendorAccounting(vendor: any, db: any) {
  if (!vendor) return;
  const vendorExpenses = (db.expenses || []).filter((e: any) => e.vendorId === vendor.id);
  const expensePaid = vendorExpenses.reduce((sum: number, e: any) => sum + (Number(e.amountPaid) || 0), 0);
  const advance = Number(vendor.advancePaid) || 0;
  const hasAdvanceExpense = vendorExpenses.some((e: any) => (e.title || '').toLowerCase().includes('advance'));
  const totalPaid = hasAdvanceExpense ? expensePaid : (advance + expensePaid);
  vendor.amountPaid = totalPaid;
  vendor.balanceDue = Math.max(0, (Number(vendor.agreedAmount || vendor.quotedAmount) || 0) - totalPaid);
}

function normalizePhone(p?: string): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeEmail(e?: string): string {
  return (e || '').trim().toLowerCase();
}

function computeGuestAnalytics(guests: any[]) {
  const all = guests || [];
  const groomGuests = all.filter((g: any) => g.side === 'groom' || g.owner === 'groom');
  const brideGuests = all.filter((g: any) => g.side === 'bride' || g.owner === 'bride');
  const mutualGuests = all.filter((g: any) => g.side === 'mutual' || g.owner === 'shared');

  const calcSideStats = (list: any[]) => ({
    totalPax: list.reduce((sum, g) => sum + (Number(g.headcount) || 1), 0),
    attendingPax: list.filter(g => g.rsvpStatus === 'attending').reduce((sum, g) => sum + (Number(g.headcount) || 1), 0),
    pendingPax: list.filter(g => g.rsvpStatus === 'pending' || !g.rsvpStatus).reduce((sum, g) => sum + (Number(g.headcount) || 1), 0),
    declinedPax: list.filter(g => g.rsvpStatus === 'declined').reduce((sum, g) => sum + (Number(g.headcount) || 1), 0),
    invitationsSent: list.filter(g => g.invitationSent).length,
  });

  // Cross-side duplicate detection
  const phoneMap = new Map<string, any[]>();
  const emailMap = new Map<string, any[]>();

  for (const g of all) {
    const p = normalizePhone(g.mobile);
    if (p && p.length >= 7) {
      if (!phoneMap.has(p)) phoneMap.set(p, []);
      phoneMap.get(p)!.push(g);
    }
    const e = normalizeEmail(g.email);
    if (e && e.includes('@') && !e.includes('.local')) {
      if (!emailMap.has(e)) emailMap.set(e, []);
      emailMap.get(e)!.push(g);
    }
  }

  const duplicateGroups: Array<{ sharedId: string; guests: any[]; matchedOn: string; confirmed: boolean }> = [];
  const processedGuestIds = new Set<string>();

  const checkMatches = (map: Map<string, any[]>, type: string) => {
    for (const [key, list] of map.entries()) {
      if (list.length > 1) {
        const hasGroom = list.some(g => g.side === 'groom' || g.owner === 'groom');
        const hasBride = list.some(g => g.side === 'bride' || g.owner === 'bride');
        if (hasGroom && hasBride) {
          const ids = list.map(g => g.id).sort().join('_');
          if (!processedGuestIds.has(ids)) {
            processedGuestIds.add(ids);
            const sharedId = list[0].sharedGuestId || `shared_grp_${key}`;
            const confirmed = list.some(g => g.isConfirmedShared === true);
            list.forEach(g => {
              if (!g.sharedGuestId) g.sharedGuestId = sharedId;
              if (confirmed) g.isConfirmedShared = true;
            });
            duplicateGroups.push({
              sharedId,
              guests: list,
              matchedOn: type,
              confirmed,
            });
          }
        }
      }
    }
  };

  checkMatches(phoneMap, 'phone');
  checkMatches(emailMap, 'email');

  // Combined Headcount Calculation Rule:
  // Each confirmed shared attendance group is counted only ONCE.
  let combinedPax = 0;
  const countedSharedGroups = new Set<string>();

  for (const g of all) {
    if (g.isConfirmedShared && g.sharedGuestId) {
      if (!countedSharedGroups.has(g.sharedGuestId)) {
        countedSharedGroups.add(g.sharedGuestId);
        const groupMembers = all.filter(item => item.sharedGuestId === g.sharedGuestId);
        const canonical = groupMembers.find(m => m.canonicalAttendanceGroupId)?.headcount ||
                          Math.max(...groupMembers.map(m => Number(m.headcount) || 1));
        combinedPax += canonical;
      }
    } else {
      combinedPax += (Number(g.headcount) || 1);
    }
  }

  const confirmedDuplicatesCount = duplicateGroups.filter(d => d.confirmed).length;

  return {
    groomSide: calcSideStats(groomGuests),
    brideSide: calcSideStats(brideGuests),
    mutualSide: calcSideStats(mutualGuests),
    combinedEventPax: combinedPax,
    uniqueGuestsCount: Math.max(0, all.length - confirmedDuplicatesCount),
    duplicateGroupCount: duplicateGroups.length,
    duplicateGroups,
  };
}

// Seed clean database with ONLY the platform administrator account
function getInitialData() {
  const superAdminAuth = hashPassword('Mayur@2107');

  return {
    masterWeddingId: '',
    weddings: [],
    users: [
      {
        id: 'usr_superadmin',
        weddingId: '',
        mobile: '9876543210',
        email: 'voyaramedia@gmail.com',
        username: 'voyaramedia',
        name: 'Mayur (Super Admin)',
        role: 'admin',
        relation: 'Super Administrator',
        passwordHash: superAdminAuth.hash,
        salt: superAdminAuth.salt,
        permissions: {
          canEditBudget: true,
          canManageVendors: true,
          canManageTasks: true,
          canManageGuests: true,
          canEditEvents: true,
          canManageUsers: true,
        },
        createdAt: new Date().toISOString(),
      }
    ],
    coupleProfile: {
      weddingId: '',
      weddingTitle: 'Our Wedding',
      preferredLanguage: 'English',
      preferredTimeZone: 'Asia/Kolkata (IST)',
      groom: {
        name: '',
        nickname: '',
        dob: '',
        mobile: '',
        email: '',
        bio: '',
        photoUrl: '',
      },
      bride: {
        name: '',
        nickname: '',
        dob: '',
        mobile: '',
        email: '',
        bio: '',
        photoUrl: '',
      },
      coverPhotoUrl: '',
      story: '',
      hashtag: '',
      engagementDate: '',
      engagementVenue: '',
      engagementAddress: '',
      engagementMapLink: '',
      weddingDate: '',
      weddingVenue: '',
      weddingAddress: '',
      weddingMapLink: '',
      primaryCurrency: 'INR',
    },
    events: [],
    budgetConfig: {
      engagementBudget: 0,
      weddingBudget: 0,
      combinedBudget: 0,
      groomBudget: 0,
      brideBudget: 0,
      categoryBudgets: {
        'Venue and decoration': 0,
        'Catering and food': 0,
        'Photography and videography': 0,
        'Outfits and accessories': 0,
        'Jewellery': 0,
        'Makeup and grooming': 0,
        'Invitations and printing': 0,
        'Gifts and return gifts': 0,
        'Travel and accommodation': 0,
        'Entertainment and music': 0,
        'Rituals and ceremonies': 0,
      },
      groomCategoryBudgets: {
        'Venue and decoration': 0,
        'Catering and food': 0,
        'Photography and videography': 0,
        'Outfits and accessories': 0,
        'Jewellery': 0,
        'Makeup and grooming': 0,
        'Invitations and printing': 0,
        'Gifts and return gifts': 0,
        'Travel and accommodation': 0,
        'Entertainment and music': 0,
        'Rituals and ceremonies': 0,
      },
      brideCategoryBudgets: {
        'Venue and decoration': 0,
        'Catering and food': 0,
        'Photography and videography': 0,
        'Outfits and accessories': 0,
        'Jewellery': 0,
        'Makeup and grooming': 0,
        'Invitations and printing': 0,
        'Gifts and return gifts': 0,
        'Travel and accommodation': 0,
        'Entertainment and music': 0,
        'Rituals and ceremonies': 0,
      },
    },
    expenses: [],
    tasks: [],
    checklists: [],
    vaultDocuments: [],
    vendors: [],
    guests: [],
    invitationCards: [],
    albums: [
      {
        id: 'album_eng',
        name: 'Engagement Ceremony',
        category: 'engagement',
        description: 'Cherished memories of our ring ceremony & promise celebration',
        owner: 'shared',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'album_wed',
        name: 'Sacred Wedding Day',
        category: 'wedding',
        description: 'Vows, sacred rituals, and the royal wedding celebration',
        owner: 'shared',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'album_prewed',
        name: 'Pre-Wedding & Romance',
        category: 'pre-wedding',
        description: 'Love story and photoshoot captures',
        owner: 'shared',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'album_bride',
        name: "Bride's Private Album",
        category: 'bride',
        description: 'Bridal attire, jewellery trials, and mehndi memories',
        owner: 'bride',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'album_groom',
        name: "Groom's Private Album",
        category: 'groom',
        description: 'Sherwani fitting, baraat, and groom preparations',
        owner: 'groom',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'album_reception',
        name: 'Reception & Family',
        category: 'reception',
        description: 'Family portraits and evening celebration',
        owner: 'shared',
        createdAt: new Date().toISOString(),
      },
    ],
    gallery: [],
    invitationHistory: [],
    canonicalAttendanceGroups: {},
    activityLogs: [
      {
        id: 'act_1',
        action: 'System initialized with clean slate. Super Admin voyaramedia ready.',
        category: 'System',
        userName: 'System',
        timestamp: new Date().toISOString(),
        details: 'All prefilled sample records cleared.',
      }
    ]
  };
}

// Read database safely
function readDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      const initial = getInitialData();
      fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(dbPath, 'utf-8');
    const data = JSON.parse(content);

    // If database contains old sample Arjun/Ananya records, purge them
    if (data.coupleProfile?.groom?.name === 'Arjun Sharma') {
      const fresh = getInitialData();
      fs.writeFileSync(dbPath, JSON.stringify(fresh, null, 2), 'utf-8');
      return fresh;
    }

    // Ensure albums array exists
    if (!data.albums || !Array.isArray(data.albums) || data.albums.length === 0) {
      data.albums = getInitialData().albums;
    }
    if (!data.invitationHistory) {
      data.invitationHistory = [];
    }
    if (!data.budgetConfig.groomCategoryBudgets) {
      data.budgetConfig.groomCategoryBudgets = { ...data.budgetConfig.categoryBudgets };
    }
    if (!data.budgetConfig.brideCategoryBudgets) {
      data.budgetConfig.brideCategoryBudgets = { ...data.budgetConfig.categoryBudgets };
    }

    return data;
  } catch (err) {
    console.error('Error reading database, creating clean initial data:', err);
    const initial = getInitialData();
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

// Write database atomically
function writeDB(data: any) {
  const tempPath = `${dbPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, dbPath);
}

// Initialize database on startup
readDB();

// Helper to sanitize user object (strip passwordHash and salt)
function sanitizeUser(u: any) {
  if (!u) return null;
  const { passwordHash, salt, ...safeUser } = u;
  return safeUser;
}

// Auth Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  let session = sessions.get(token);
  if (!session) {
    const reloaded = loadSessions();
    session = reloaded.get(token);
    if (session) {
      sessions.set(token, session);
    }
  }

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.id === session.userId);
  if (!user) {
    sessions.delete(token);
    saveSessions();
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

// Optional Auth Middleware (attaches user if present, but doesn't block)
function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    const session = sessions.get(token);
    if (session) {
      const db = readDB();
      const user = db.users.find((u: any) => u.id === session.userId);
      if (user) {
        (req as any).user = user;
        (req as any).token = token;
      }
    }
  }
  next();
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Mobile number, email, or username and password are required' });
  }

  const db = readDB();
  const trimmed = identifier.trim().toLowerCase();

  const user = db.users.find((u: any) => {
    const uMobile = (u.mobile || '').trim();
    const uEmail = (u.email || '').trim().toLowerCase();
    const uUsername = (u.username || '').trim().toLowerCase();
    return uMobile === trimmed || uEmail === trimmed || uUsername === trimmed;
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid login credentials. User not found.' });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: user.id,
    token,
    createdAt: Date.now(),
  });
  saveSessions();

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `User signed in: ${user.name} (${user.role})`,
    category: 'Auth',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });
  writeDB(db);

  return res.json({
    token,
    user: sanitizeUser(user),
  });
});

// POST /api/auth/register-couple (SINGLE MASTER REGISTRATION FOR EACH COUPLE)
app.post('/api/auth/register-couple', (req: Request, res: Response) => {
  const {
    groomName,
    groomMobile,
    groomEmail,
    groomPassword,
    groomPhotoUrl,
    brideName,
    brideMobile,
    brideEmail,
    bridePassword,
    bridePhotoUrl,
    weddingTitle,
    preferredLanguage,
    preferredTimeZone,
    engagementDate,
    engagementTime,
    engagementVenue,
    engagementAddress,
    engagementMapLink,
    weddingDate,
    weddingTime,
    weddingVenue,
    weddingAddress,
    weddingMapLink,
  } = req.body;

  if (!groomName?.trim() || !groomMobile?.trim() || !groomPassword) {
    return res.status(400).json({ error: "Groom's name, mobile number, and password are required." });
  }

  if (!brideName?.trim() || !brideMobile?.trim() || !bridePassword) {
    return res.status(400).json({ error: "Bride's name, mobile number, and password are required." });
  }

  if (groomPassword.length < 6 || bridePassword.length < 6) {
    return res.status(400).json({ error: 'Passwords must be at least 6 characters long.' });
  }

  const db = readDB();
  const cleanGroomMobile = groomMobile.trim();
  const cleanBrideMobile = brideMobile.trim();
  const cleanGroomEmail = (groomEmail || '').trim().toLowerCase();
  const cleanBrideEmail = (brideEmail || '').trim().toLowerCase();

  const conflict = db.users.find((u: any) => 
    u.mobile === cleanGroomMobile || 
    u.mobile === cleanBrideMobile ||
    (cleanGroomEmail && u.email?.toLowerCase() === cleanGroomEmail) ||
    (cleanBrideEmail && u.email?.toLowerCase() === cleanBrideEmail)
  );

  if (conflict) {
    return res.status(409).json({ error: 'An account with this mobile number or email already exists in the system.' });
  }

  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const newWeddingId = `WED-2026-${randomSuffix}`;

  const groomAuth = hashPassword(groomPassword);
  const brideAuth = hashPassword(bridePassword);

  const groomId = 'usr_groom_' + Date.now();
  const brideId = 'usr_bride_' + (Date.now() + 1);

  const savedGroomPhoto = groomPhotoUrl ? (groomPhotoUrl.startsWith('data:') ? saveBase64Image(groomPhotoUrl, 'groom') : groomPhotoUrl) : '';
  const savedBridePhoto = bridePhotoUrl ? (bridePhotoUrl.startsWith('data:') ? saveBase64Image(bridePhotoUrl, 'bride') : bridePhotoUrl) : '';

  const groomUser = {
    id: groomId,
    weddingId: newWeddingId,
    mobile: cleanGroomMobile,
    email: cleanGroomEmail || `${cleanGroomMobile}@wedding.local`,
    name: groomName.trim(),
    role: 'groom',
    relation: 'Groom',
    avatarUrl: savedGroomPhoto || '',
    passwordHash: groomAuth.hash,
    salt: groomAuth.salt,
    permissions: {
      canEditBudget: true,
      canManageVendors: true,
      canManageTasks: true,
      canManageGuests: true,
      canEditEvents: true,
      canManageUsers: true,
    },
    createdAt: new Date().toISOString(),
  };

  const brideUser = {
    id: brideId,
    weddingId: newWeddingId,
    mobile: cleanBrideMobile,
    email: cleanBrideEmail || `${cleanBrideMobile}@wedding.local`,
    name: brideName.trim(),
    role: 'bride',
    relation: 'Bride',
    avatarUrl: savedBridePhoto || '',
    passwordHash: brideAuth.hash,
    salt: brideAuth.salt,
    permissions: {
      canEditBudget: true,
      canManageVendors: true,
      canManageTasks: true,
      canManageGuests: true,
      canEditEvents: true,
      canManageUsers: true,
    },
    createdAt: new Date().toISOString(),
  };

  db.users.push(groomUser, brideUser);

  const finalTitle = weddingTitle?.trim() || `${groomName.trim()} & ${brideName.trim()}'s Wedding`;
  const engDateFormatted = engagementDate ? `${engagementDate}T${engagementTime || '18:00'}:00` : '';
  const wedDateFormatted = weddingDate ? `${weddingDate}T${weddingTime || '19:30'}:00` : '';

  db.masterWeddingId = newWeddingId;
  db.coupleProfile = {
    weddingId: newWeddingId,
    weddingTitle: finalTitle,
    preferredLanguage: preferredLanguage || 'English',
    preferredTimeZone: preferredTimeZone || 'Asia/Kolkata (IST)',
    groom: {
      name: groomName.trim(),
      nickname: groomName.trim().split(' ')[0],
      mobile: cleanGroomMobile,
      email: cleanGroomEmail,
      bio: '',
      photoUrl: savedGroomPhoto || '',
    },
    bride: {
      name: brideName.trim(),
      nickname: brideName.trim().split(' ')[0],
      mobile: cleanBrideMobile,
      email: cleanBrideEmail,
      bio: '',
      photoUrl: savedBridePhoto || '',
    },
    coverPhotoUrl: '',
    story: '',
    hashtag: `#${groomName.trim().split(' ')[0]}Weds${brideName.trim().split(' ')[0]}`,
    engagementDate: engDateFormatted,
    engagementVenue: engagementVenue?.trim() || '',
    engagementAddress: engagementAddress?.trim() || '',
    engagementMapLink: engagementMapLink?.trim() || '',
    weddingDate: wedDateFormatted,
    weddingVenue: weddingVenue?.trim() || '',
    weddingAddress: weddingAddress?.trim() || '',
    weddingMapLink: weddingMapLink?.trim() || '',
    primaryCurrency: 'INR',
  };

  db.weddings = db.weddings || [];
  db.weddings.unshift({
    weddingId: newWeddingId,
    title: finalTitle,
    groomName: groomName.trim(),
    brideName: brideName.trim(),
    groomMobile: cleanGroomMobile,
    brideMobile: cleanBrideMobile,
    weddingDate: wedDateFormatted,
    weddingVenue: db.coupleProfile.weddingVenue,
    engagementDate: engDateFormatted,
    engagementVenue: db.coupleProfile.engagementVenue,
    totalExpenses: 0,
    totalGuests: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  });

  // If engagement ceremony was provided, add to events
  if (engDateFormatted) {
    db.events.push({
      id: 'evt_eng_' + Date.now(),
      weddingId: newWeddingId,
      title: 'Engagement Ceremony',
      type: 'engagement',
      dateTime: engDateFormatted,
      venue: db.coupleProfile.engagementVenue,
      address: db.coupleProfile.engagementAddress,
      mapLink: db.coupleProfile.engagementMapLink,
      owner: 'shared',
    });
  }

  // If wedding ceremony was provided, add to events
  if (wedDateFormatted) {
    db.events.push({
      id: 'evt_wed_' + (Date.now() + 1),
      weddingId: newWeddingId,
      title: 'Sacred Wedding Ceremony',
      type: 'wedding',
      dateTime: wedDateFormatted,
      venue: db.coupleProfile.weddingVenue,
      address: db.coupleProfile.weddingAddress,
      mapLink: db.coupleProfile.weddingMapLink,
      owner: 'shared',
    });
  }

  // Create session for Groom (default login upon registration)
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: groomUser.id,
    token,
    createdAt: Date.now(),
  });
  saveSessions();

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `New Wedding Registration: ${finalTitle} (Wedding ID: ${newWeddingId})`,
    category: 'Registration',
    userName: groomUser.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);

  return res.status(201).json({
    token,
    user: sanitizeUser(groomUser),
    weddingId: newWeddingId,
    message: `Wedding registration successful! Unique Wedding ID: ${newWeddingId}`,
  });
});

// POST /api/auth/register (For family member registration)
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, mobile, email, password, role, relation } = req.body;

  if (!name || !mobile || !password) {
    return res.status(400).json({ error: 'Full name, mobile number, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const db = readDB();
  const cleanMobile = mobile.trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  const existing = db.users.find((u: any) => u.mobile === cleanMobile || (cleanEmail && u.email?.toLowerCase() === cleanEmail));
  if (existing) {
    return res.status(409).json({ error: 'An account with this mobile number or email already exists' });
  }

  const assignedRole = role === 'groom' || role === 'bride' || role === 'family' ? role : 'family';
  const { hash, salt } = hashPassword(password);

  const newUser = {
    id: 'usr_' + Date.now(),
    weddingId: db.masterWeddingId || '',
    mobile: cleanMobile,
    email: cleanEmail || `${cleanMobile}@wedding.local`,
    name: name.trim(),
    role: assignedRole,
    relation: relation || (assignedRole === 'groom' ? 'Groom' : assignedRole === 'bride' ? 'Bride' : 'Family Member'),
    passwordHash: hash,
    salt,
    permissions: {
      canEditBudget: assignedRole === 'groom' || assignedRole === 'bride',
      canManageVendors: assignedRole === 'groom' || assignedRole === 'bride',
      canManageTasks: true,
      canManageGuests: true,
      canEditEvents: assignedRole === 'groom' || assignedRole === 'bride',
      canManageUsers: false,
    },
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: newUser.id,
    token,
    createdAt: Date.now(),
  });
  saveSessions();

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `New user registered: ${newUser.name} (${assignedRole})`,
    category: 'Auth',
    userName: newUser.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);

  return res.status(201).json({
    token,
    user: sanitizeUser(newUser),
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user: sanitizeUser(user) });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    sessions.delete(token);
    saveSessions();
  }
  res.json({ success: true });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authMiddleware, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const currentUser = (req as any).user;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.id === currentUser.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (currentPassword) {
    const isValid = verifyPassword(currentPassword, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password does not match' });
    }
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.updatedAt = new Date().toISOString();

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Password updated for ${user.name}`,
    category: 'Security',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true, message: 'Password successfully updated' });
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { identifier, newPassword } = req.body;
  if (!identifier || !newPassword) {
    return res.status(400).json({ error: 'Mobile number or email and new password are required' });
  }

  const db = readDB();
  const trimmed = identifier.trim().toLowerCase();
  const user = db.users.find((u: any) => {
    return (u.mobile || '').trim() === trimmed || (u.email || '').trim().toLowerCase() === trimmed || (u.username || '').trim().toLowerCase() === trimmed;
  });

  if (!user) {
    return res.status(404).json({ error: 'No account found with this identifier' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.updatedAt = new Date().toISOString();

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Password reset performed for ${user.name}`,
    category: 'Security',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true, message: 'Password has been reset successfully. You can now login.' });
});

// -------------------------------------------------------------
// Core Wedding Data Endpoints
// -------------------------------------------------------------

// GET /api/wedding-data
app.get('/api/wedding-data', optionalAuth, (req: Request, res: Response) => {
  const db = readDB();
  const user = (req as any).user;

  const allGuests = db.guests || [];
  const guestAnalytics = computeGuestAnalytics(allGuests);

  const sharedGuestStats = {
    groomSide: guestAnalytics.groomSide,
    brideSide: guestAnalytics.brideSide,
    mutualSide: guestAnalytics.mutualSide,
    combinedEventPax: guestAnalytics.combinedEventPax,
    uniqueGuestsCount: guestAnalytics.uniqueGuestsCount,
    duplicateGroupCount: guestAnalytics.duplicateGroupCount,
  };

  const defaultAlbums = (db.albums || []).filter((a: any) => a.owner === 'shared');

  if (!user) {
    return res.json({
      weddingId: db.masterWeddingId || '',
      users: db.users.map(sanitizeUser),
      coupleProfile: db.coupleProfile,
      events: db.events.filter((e: any) => e.owner === 'shared' || !e.owner),
      budgetConfig: db.budgetConfig,
      expenses: db.expenses.filter((e: any) => e.owner === 'shared' || !e.owner),
      tasks: db.tasks.filter((t: any) => t.owner === 'shared' || !t.owner),
      checklists: (db.checklists || []).filter((c: any) => c.owner === 'shared'),
      vaultDocuments: (db.vaultDocuments || []).filter((d: any) => d.owner === 'shared'),
      vendors: db.vendors,
      guests: db.guests.filter((g: any) => g.owner === 'shared' || g.side === 'mutual'),
      sharedGuestStats,
      invitationCards: db.invitationCards || [],
      albums: defaultAlbums,
      gallery: (db.gallery || []).filter((g: any) => g.owner === 'shared'),
      activityLogs: db.activityLogs.slice(0, 50),
    });
  }

  const role = user.role;
  const isSuperAdmin = role === 'admin';
  const isGroom = role === 'groom';
  const isBride = role === 'bride';

  const filterByOwner = (items: any[]) => {
    if (!items) return [];
    if (isSuperAdmin) return items;
    return items.filter((item: any) => {
      const owner = item.owner || 'shared';
      if (owner === 'shared') return true;
      if (isGroom && owner === 'groom') return true;
      if (isBride && owner === 'bride') return true;
      return false;
    });
  };

  const filteredGuests = isSuperAdmin
    ? allGuests
    : allGuests.filter((g: any) => {
        if (g.side === 'mutual' || g.owner === 'shared') return true;
        if (isGroom && (g.side === 'groom' || g.owner === 'groom')) return true;
        if (isBride && (g.side === 'bride' || g.owner === 'bride')) return true;
        return false;
      });

  // Strict financial data separation:
  // Bride never sees groom private financial figures
  // Groom never sees bride private financial figures
  let userBudgetConfig = db.budgetConfig;
  if (isBride) {
    userBudgetConfig = {
      ...db.budgetConfig,
      groomBudget: 0,
      groomCategoryBudgets: {},
      categoryBudgets: db.budgetConfig.brideCategoryBudgets || db.budgetConfig.categoryBudgets,
    };
  } else if (isGroom) {
    userBudgetConfig = {
      ...db.budgetConfig,
      brideBudget: 0,
      brideCategoryBudgets: {},
      categoryBudgets: db.budgetConfig.groomCategoryBudgets || db.budgetConfig.categoryBudgets,
    };
  }

  return res.json({
    weddingId: db.masterWeddingId || '',
    users: db.users.map(sanitizeUser),
    coupleProfile: db.coupleProfile,
    events: filterByOwner(db.events),
    budgetConfig: userBudgetConfig,
    expenses: filterByOwner(db.expenses),
    tasks: filterByOwner(db.tasks),
    checklists: filterByOwner(db.checklists || []),
    vaultDocuments: filterByOwner(db.vaultDocuments || []),
    vendors: db.vendors,
    guests: filteredGuests,
    sharedGuestStats,
    invitationCards: db.invitationCards || [],
    albums: filterByOwner(db.albums || []),
    gallery: filterByOwner(db.gallery || []),
    activityLogs: db.activityLogs.slice(0, 50),
  });
});

// PUT /api/couple-profile
app.put('/api/couple-profile', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const updates = req.body;

  const db = readDB();
  db.coupleProfile = {
    ...db.coupleProfile,
    ...updates,
    groom: {
      ...db.coupleProfile.groom,
      ...(updates.groom || {}),
    },
    bride: {
      ...db.coupleProfile.bride,
      ...(updates.bride || {}),
    },
  };

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: 'Couple profile & wedding details updated',
    category: 'Profile',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true, coupleProfile: db.coupleProfile });
});

// PUT /api/budget-config
app.put('/api/budget-config', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== 'admin' && user.role !== 'groom' && user.role !== 'bride' && !user.permissions?.canEditBudget) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to modify budget configuration.' });
  }

  const { engagementBudget, weddingBudget, combinedBudget, groomBudget, brideBudget, categoryBudgets } = req.body;

  const db = readDB();
  const eng = engagementBudget !== undefined ? Number(engagementBudget) : (db.budgetConfig.engagementBudget || 0);
  const wed = weddingBudget !== undefined ? Number(weddingBudget) : (db.budgetConfig.weddingBudget || 0);
  const comb = combinedBudget !== undefined ? Number(combinedBudget) : (eng + wed);

  db.budgetConfig = {
    engagementBudget: eng,
    weddingBudget: wed,
    combinedBudget: comb,
    groomBudget: groomBudget !== undefined ? Number(groomBudget) : (db.budgetConfig.groomBudget || 0),
    brideBudget: brideBudget !== undefined ? Number(brideBudget) : (db.budgetConfig.brideBudget || 0),
    categoryBudgets: categoryBudgets || db.budgetConfig.categoryBudgets || {},
  };

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: 'Wedding budgets updated',
    category: 'Budget',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true, budgetConfig: db.budgetConfig });
});

// -------------------------------------------------------------
// Ceremonies & Events Endpoints
// -------------------------------------------------------------

// POST /api/events
app.post('/api/events', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = readDB();

  const newEvent = {
    id: 'evt_' + Date.now(),
    weddingId: db.masterWeddingId || '',
    owner: req.body.owner || (user.role === 'groom' || user.role === 'bride' ? user.role : 'shared'),
    ...req.body,
  };

  db.events.push(newEvent);

  // If this is an engagement or wedding ceremony, sync to coupleProfile
  if (newEvent.type === 'engagement') {
    db.coupleProfile.engagementDate = newEvent.dateTime;
    db.coupleProfile.engagementVenue = newEvent.venue;
    if (newEvent.address) db.coupleProfile.engagementAddress = newEvent.address;
    if (newEvent.mapLink) db.coupleProfile.engagementMapLink = newEvent.mapLink;
  }
  if (newEvent.type === 'wedding') {
    db.coupleProfile.weddingDate = newEvent.dateTime;
    db.coupleProfile.weddingVenue = newEvent.venue;
    if (newEvent.address) db.coupleProfile.weddingAddress = newEvent.address;
    if (newEvent.mapLink) db.coupleProfile.weddingMapLink = newEvent.mapLink;
  }

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Added ceremony: ${newEvent.title}`,
    category: 'Events',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json(newEvent);
});

// PUT /api/events/:id
app.put('/api/events/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const db = readDB();
  let index = db.events.findIndex((e: any) => e.id === id);

  if (index === -1) {
    // Upsert new event for initial ceremonies (e.g. evt_eng, evt_wed)
    const newEvent = {
      id: id || ('evt_' + Date.now()),
      weddingId: db.masterWeddingId || '',
      owner: (user.role === 'groom' || user.role === 'bride') ? user.role : 'shared',
      title: req.body.title || (req.body.type === 'engagement' ? 'Ring Ceremony & Engagement' : 'Wedding Ceremony'),
      type: req.body.type || 'wedding',
      dateTime: req.body.dateTime || '',
      venue: req.body.venue || '',
      address: req.body.address || '',
      mapLink: req.body.mapLink || '',
      ...req.body,
    };
    db.events.push(newEvent);
    index = db.events.length - 1;
  } else {
    const event = db.events[index];
    if (user.role !== 'admin') {
      if (user.role === 'groom' && event.owner === 'bride') {
        return res.status(403).json({ error: "Access denied: You cannot modify bride's private event." });
      }
      if (user.role === 'bride' && event.owner === 'groom') {
        return res.status(403).json({ error: "Access denied: You cannot modify groom's private event." });
      }
    }
    db.events[index] = { ...db.events[index], ...req.body };
  }

  if (db.events[index].type === 'engagement') {
    if (req.body.dateTime !== undefined) db.coupleProfile.engagementDate = req.body.dateTime;
    if (req.body.venue !== undefined) db.coupleProfile.engagementVenue = req.body.venue;
    if (req.body.address !== undefined) db.coupleProfile.engagementAddress = req.body.address;
    if (req.body.mapLink !== undefined) db.coupleProfile.engagementMapLink = req.body.mapLink;
  }
  if (db.events[index].type === 'wedding') {
    if (req.body.dateTime !== undefined) db.coupleProfile.weddingDate = req.body.dateTime;
    if (req.body.venue !== undefined) db.coupleProfile.weddingVenue = req.body.venue;
    if (req.body.address !== undefined) db.coupleProfile.weddingAddress = req.body.address;
    if (req.body.mapLink !== undefined) db.coupleProfile.weddingMapLink = req.body.mapLink;
  }

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Updated event: ${db.events[index].title}`,
    category: 'Events',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json(db.events[index]);
});

// DELETE /api/events/:id
app.delete('/api/events/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const db = readDB();
  const event = db.events.find((e: any) => e.id === id);

  if (!event) {
    if (id === 'evt_eng' || id === 'engagement') {
      db.coupleProfile.engagementDate = '';
      db.coupleProfile.engagementVenue = '';
      db.coupleProfile.engagementAddress = '';
      db.coupleProfile.engagementMapLink = '';
      writeDB(db);
      return res.json({ success: true });
    }
    if (id === 'evt_wed' || id === 'wedding') {
      db.coupleProfile.weddingDate = '';
      db.coupleProfile.weddingVenue = '';
      db.coupleProfile.weddingAddress = '';
      db.coupleProfile.weddingMapLink = '';
      writeDB(db);
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Event not found' });
  }

  if (user.role !== 'admin') {
    if (user.role === 'groom' && event.owner === 'bride') {
      return res.status(403).json({ error: "Access denied: You cannot delete bride's private event." });
    }
    if (user.role === 'bride' && event.owner === 'groom') {
      return res.status(403).json({ error: "Access denied: You cannot delete groom's private event." });
    }
  }

  db.events = db.events.filter((e: any) => e.id !== id);

  // Only clean profile link if this was the primary event or no other event of this type remains
  if (event.type === 'engagement') {
    const remainingEng = db.events.filter((e: any) => e.type === 'engagement');
    if (id === 'evt_eng' || remainingEng.length === 0 || db.coupleProfile.engagementDate === event.dateTime) {
      db.coupleProfile.engagementDate = remainingEng[0]?.dateTime || '';
      db.coupleProfile.engagementVenue = remainingEng[0]?.venue || '';
      db.coupleProfile.engagementAddress = remainingEng[0]?.address || '';
      db.coupleProfile.engagementMapLink = remainingEng[0]?.mapLink || '';
    }
  }
  if (event.type === 'wedding') {
    const remainingWed = db.events.filter((e: any) => e.type === 'wedding');
    if (id === 'evt_wed' || remainingWed.length === 0 || db.coupleProfile.weddingDate === event.dateTime) {
      db.coupleProfile.weddingDate = remainingWed[0]?.dateTime || '';
      db.coupleProfile.weddingVenue = remainingWed[0]?.venue || '';
      db.coupleProfile.weddingAddress = remainingWed[0]?.address || '';
      db.coupleProfile.weddingMapLink = remainingWed[0]?.mapLink || '';
    }
  }

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Deleted event: ${event.title}`,
    category: 'Events',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Expenses Endpoints
// -------------------------------------------------------------

// POST /api/expenses
app.post('/api/expenses', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const expenseData = req.body;

  const actualAmount = Number(expenseData.actualAmount) || Number(expenseData.plannedAmount) || 0;
  const amountPaid = Number(expenseData.amountPaid) || 0;
  const remainingAmount = Math.max(0, actualAmount - amountPaid);
  const paymentStatus = amountPaid >= actualAmount ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'pending';

  const owner = expenseData.owner || (user.role === 'groom' || user.role === 'bride' ? user.role : 'shared');

  const newExpense = {
    id: 'exp_' + Date.now(),
    weddingId: readDB().masterWeddingId || '',
    ...expenseData,
    plannedAmount: Number(expenseData.plannedAmount) || actualAmount,
    actualAmount,
    amountPaid,
    remainingAmount,
    paymentStatus: expenseData.paymentStatus || paymentStatus,
    owner,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  };

  const db = readDB();
  db.expenses.unshift(newExpense);


  if (newExpense.vendorId) {
    const vendor = db.vendors.find((v: any) => v.id === newExpense.vendorId);
    if (vendor) {
      if (!vendor.linkedExpenseIds.includes(newExpense.id)) {
        vendor.linkedExpenseIds.push(newExpense.id);
      }
      syncVendorAccounting(vendor, db);
    }
  }

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Logged expense: ${newExpense.title} (₹${actualAmount.toLocaleString('en-IN')})`,
    category: 'Expense',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json(newExpense);
});

// PUT /api/expenses/:id
app.put('/api/expenses/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const updates = req.body;

  const db = readDB();
  const index = db.expenses.findIndex((e: any) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  const current = db.expenses[index];

  if (user.role === 'groom' && current.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot view or edit bride's private expenses." });
  }
  if (user.role === 'bride' && current.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot view or edit groom's private expenses." });
  }

  const actualAmount = updates.actualAmount !== undefined ? Number(updates.actualAmount) : current.actualAmount;
  const amountPaid = updates.amountPaid !== undefined ? Number(updates.amountPaid) : current.amountPaid;
  const remainingAmount = Math.max(0, actualAmount - amountPaid);
  const paymentStatus = amountPaid >= actualAmount ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'pending';

  db.expenses[index] = {
    ...current,
    ...updates,
    actualAmount,
    amountPaid,
    remainingAmount,
    paymentStatus: updates.paymentStatus || paymentStatus,
    updatedAt: new Date().toISOString(),
  };

  const vendorId = db.expenses[index].vendorId;
  if (vendorId) {
    const vendor = db.vendors.find((v: any) => v.id === vendorId);
    if (vendor) {
      syncVendorAccounting(vendor, db);
    }
  }

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Updated expense: ${db.expenses[index].title}`,
    category: 'Expense',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json(db.expenses[index]);
});

// DELETE /api/expenses/:id
app.delete('/api/expenses/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const db = readDB();
  const expense = db.expenses.find((e: any) => e.id === id);
  if (!expense) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  if (user.role === 'groom' && expense.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot delete bride's private expenses." });
  }
  if (user.role === 'bride' && expense.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot delete groom's private expenses." });
  }

  db.expenses = db.expenses.filter((e: any) => e.id !== id);

  if (expense.vendorId) {
    const vendor = db.vendors.find((v: any) => v.id === expense.vendorId);
    if (vendor) {
      vendor.linkedExpenseIds = vendor.linkedExpenseIds.filter((eid: string) => eid !== id);
      syncVendorAccounting(vendor, db);
    }
  }

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Deleted expense: ${expense.title}`,
    category: 'Expense',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Tasks Endpoints
// -------------------------------------------------------------

// POST /api/tasks
app.post('/api/tasks', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const taskData = req.body;
  const owner = taskData.owner || (user.role === 'groom' || user.role === 'bride' ? user.role : 'shared');

  const newTask = {
    id: 'tsk_' + Date.now(),
    weddingId: readDB().masterWeddingId || '',
    ...taskData,
    owner,
    createdBy: user.id,
    createdByName: user.name,
    status: taskData.status || 'not_started',
    priority: taskData.priority || 'medium',
    estimatedCost: Number(taskData.estimatedCost) || 0,
    actualCost: Number(taskData.actualCost) || 0,
    history: [
      {
        id: 'h_' + Date.now(),
        action: 'Created task',
        userName: user.name,
        timestamp: new Date().toISOString(),
      }
    ],
    createdAt: new Date().toISOString(),
  };

  const db = readDB();
  db.tasks.unshift(newTask);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Created task: ${newTask.title}`,
    category: 'Tasks',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json(newTask);
});

// PUT /api/tasks/:id
app.put('/api/tasks/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const updates = req.body;

  const db = readDB();
  const index = db.tasks.findIndex((t: any) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const current = db.tasks[index];

  if (user.role === 'groom' && current.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot modify bride's private tasks." });
  }
  if (user.role === 'bride' && current.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot modify groom's private tasks." });
  }

  const history = current.history || [];
  if (updates.status && updates.status !== current.status) {
    history.unshift({
      id: 'h_' + Date.now(),
      action: `Status changed to ${updates.status}`,
      userName: user.name,
      timestamp: new Date().toISOString(),
    });
  }

  db.tasks[index] = {
    ...current,
    ...updates,
    history,
    updatedAt: new Date().toISOString(),
  };

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Updated task: ${current.title}`,
    category: 'Tasks',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json(db.tasks[index]);
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const db = readDB();
  const task = db.tasks.find((t: any) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (user.role === 'groom' && task.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot delete bride's private tasks." });
  }
  if (user.role === 'bride' && task.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot delete groom's private tasks." });
  }

  db.tasks = db.tasks.filter((t: any) => t.id !== id);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Deleted task: ${task.title}`,
    category: 'Tasks',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Checklists Endpoints
// -------------------------------------------------------------

// GET /api/checklists
app.get('/api/checklists', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = readDB();
  const checklists = db.checklists || [];

  if (user.role === 'admin') {
    return res.json(checklists);
  }

  const filtered = checklists.filter((c: any) => {
    if (c.owner === 'shared') return true;
    if (user.role === 'groom' && c.owner === 'groom') return true;
    if (user.role === 'bride' && c.owner === 'bride') return true;
    return false;
  });

  res.json(filtered);
});

// POST /api/checklists
app.post('/api/checklists', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, category, owner, dueDate, notes } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Checklist item title is required' });
  }

  const assignedOwner = owner || (user.role === 'groom' || user.role === 'bride' ? user.role : 'shared');

  const newItem = {
    id: 'chk_' + Date.now(),
    weddingId: readDB().masterWeddingId || '',
    title: title.trim(),
    category: category || 'General',
    completed: false,
    owner: assignedOwner,
    dueDate: dueDate || undefined,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  const db = readDB();
  db.checklists = db.checklists || [];
  db.checklists.unshift(newItem);

  writeDB(db);
  res.status(201).json(newItem);
});

// PUT /api/checklists/:id
app.put('/api/checklists/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const updates = req.body;

  const db = readDB();
  db.checklists = db.checklists || [];
  const index = db.checklists.findIndex((c: any) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  const current = db.checklists[index];
  if (user.role === 'groom' && current.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot modify bride's personal checklist." });
  }
  if (user.role === 'bride' && current.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot modify groom's personal checklist." });
  }

  db.checklists[index] = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeDB(db);
  res.json(db.checklists[index]);
});

// DELETE /api/checklists/:id
app.delete('/api/checklists/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const db = readDB();
  db.checklists = db.checklists || [];
  const item = db.checklists.find((c: any) => c.id === id);

  if (!item) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  if (user.role === 'groom' && item.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot delete bride's personal checklist." });
  }
  if (user.role === 'bride' && item.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot delete groom's personal checklist." });
  }

  db.checklists = db.checklists.filter((c: any) => c.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Document Vault Endpoints
// -------------------------------------------------------------

// GET /api/vault
app.get('/api/vault', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = readDB();
  const docs = db.vaultDocuments || [];

  if (user.role === 'admin') {
    return res.json(docs);
  }

  const filtered = docs.filter((d: any) => {
    if (d.owner === 'shared') return true;
    if (user.role === 'groom' && d.owner === 'groom') return true;
    if (user.role === 'bride' && d.owner === 'bride') return true;
    return false;
  });

  res.json(filtered);
});

// POST /api/vault
app.post('/api/vault', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, fileUrl, fileType, fileName, fileSize, category, owner, notes } = req.body;

  if (!title?.trim() || !fileUrl) {
    return res.status(400).json({ error: 'Document title and file are required.' });
  }

  const assignedOwner = owner || (user.role === 'groom' || user.role === 'bride' ? user.role : 'shared');

  const newDoc = {
    id: 'doc_' + Date.now(),
    weddingId: readDB().masterWeddingId || '',
    title: title.trim(),
    fileUrl,
    fileType: fileType || 'application/pdf',
    fileName: fileName || `${title.replace(/\s+/g, '_')}.pdf`,
    fileSize: fileSize || '1.0 MB',
    category: category || 'other',
    owner: assignedOwner,
    uploadedBy: user.id,
    uploadedByName: user.name,
    uploadedAt: new Date().toISOString(),
    notes: notes || '',
  };

  const db = readDB();
  db.vaultDocuments = db.vaultDocuments || [];
  db.vaultDocuments.unshift(newDoc);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Uploaded document to Vault: ${newDoc.title}`,
    category: 'Vault',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json(newDoc);
});

// DELETE /api/vault/:id
app.delete('/api/vault/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const db = readDB();
  db.vaultDocuments = db.vaultDocuments || [];
  const doc = db.vaultDocuments.find((d: any) => d.id === id);

  if (!doc) {
    return res.status(404).json({ error: 'Vault document not found' });
  }

  if (user.role === 'groom' && doc.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot delete bride's private documents." });
  }
  if (user.role === 'bride' && doc.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot delete groom's private documents." });
  }

  db.vaultDocuments = db.vaultDocuments.filter((d: any) => d.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Vendors Endpoints
// -------------------------------------------------------------

// POST /api/vendors
app.post('/api/vendors', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const vendorData = req.body;

  const agreedAmount = Number(vendorData.agreedAmount) || Number(vendorData.quotedAmount) || 0;
  const amountPaid = Number(vendorData.amountPaid) || Number(vendorData.advancePaid) || 0;
  const balanceDue = Math.max(0, agreedAmount - amountPaid);

  const newVendor = {
    id: 'vnd_' + Date.now(),
    weddingId: readDB().masterWeddingId || '',
    ...vendorData,
    quotedAmount: Number(vendorData.quotedAmount) || agreedAmount,
    agreedAmount,
    advancePaid: Number(vendorData.advancePaid) || 0,
    amountPaid,
    balanceDue,
    bookingStatus: vendorData.bookingStatus || 'shortlisted',
    linkedExpenseIds: vendorData.linkedExpenseIds || [],
  };

  const db = readDB();
  db.vendors.push(newVendor);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Added vendor: ${newVendor.name}`,
    category: 'Vendors',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json(newVendor);
});

// PUT /api/vendors/:id
app.put('/api/vendors/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const updates = req.body;

  const db = readDB();
  const index = db.vendors.findIndex((v: any) => v.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const current = db.vendors[index];
  const agreedAmount = updates.agreedAmount !== undefined ? Number(updates.agreedAmount) : current.agreedAmount;
  const amountPaid = updates.amountPaid !== undefined ? Number(updates.amountPaid) : current.amountPaid;
  const balanceDue = Math.max(0, agreedAmount - amountPaid);

  db.vendors[index] = {
    ...current,
    ...updates,
    agreedAmount,
    amountPaid,
    balanceDue,
  };

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Updated vendor: ${db.vendors[index].name}`,
    category: 'Vendors',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json(db.vendors[index]);
});

// DELETE /api/vendors/:id
app.delete('/api/vendors/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const db = readDB();
  const vendor = db.vendors.find((v: any) => v.id === id);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  db.vendors = db.vendors.filter((v: any) => v.id !== id);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Deleted vendor: ${vendor.name}`,
    category: 'Vendors',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Guests Endpoints
// -------------------------------------------------------------

// POST /api/guests
app.post('/api/guests', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const guestData = req.body;

  const side = guestData.side || (user.role === 'groom' ? 'groom' : user.role === 'bride' ? 'bride' : 'mutual');
  const owner = guestData.owner || (side === 'mutual' ? 'shared' : side);

  const db = readDB();
  db.guests = db.guests || [];

  const newGuest = {
    id: 'gst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    weddingId: db.masterWeddingId || '',
    srNo: db.guests.length + 1,
    ...guestData,
    side,
    owner,
    headcount: Math.max(1, Math.round(Number(guestData.headcount) || 1)),
    rsvpStatus: guestData.rsvpStatus || 'pending',
    eventsInvited: guestData.eventsInvited || ['wedding'],
    invitationType: guestData.invitationType || 'wedding',
    customFunctionName: guestData.customFunctionName || '',
    invitationSent: Boolean(guestData.invitationSent),
    invitationHistory: guestData.invitationHistory || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.guests.push(newGuest);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Added guest: ${newGuest.name} (${newGuest.headcount} pax, ${side} side)`,
    category: 'Guests',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json(newGuest);
});

// POST /api/guests/batch (Spreadsheet direct data entry / bulk paste / CSV save)
app.post('/api/guests/batch', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { guests } = req.body;

  if (!Array.isArray(guests)) {
    return res.status(400).json({ error: 'Expected an array of guest rows.' });
  }

  const db = readDB();
  db.guests = db.guests || [];

  const defaultSide = user.role === 'groom' ? 'groom' : user.role === 'bride' ? 'bride' : 'mutual';
  const defaultOwner = defaultSide === 'mutual' ? 'shared' : defaultSide;

  // Track existing IDs
  const existingMap = new Map<string, any>(db.guests.map((g: any) => [g.id, g]));
  const incomingIds = new Set<string>();

  guests.forEach((g: any, index: number) => {
    if (!g.name || !g.name.trim()) return; // skip empty rows

    const validHeadcount = Math.max(1, Math.round(Number(g.headcount) || 1));
    const side = g.side || defaultSide;
    const owner = g.owner || (side === 'mutual' ? 'shared' : side);

    if (g.id && existingMap.has(g.id)) {
      // Update existing
      const current = existingMap.get(g.id);
      // Enforce side access
      if (user.role === 'groom' && current.owner === 'bride') return;
      if (user.role === 'bride' && current.owner === 'groom') return;

      Object.assign(current, {
        srNo: index + 1,
        name: g.name.trim(),
        side,
        owner,
        relation: g.relation ? g.relation.trim() : current.relation,
        mobile: g.mobile ? g.mobile.trim() : current.mobile,
        email: g.email ? g.email.trim().toLowerCase() : current.email,
        headcount: validHeadcount,
        rsvpStatus: g.rsvpStatus || current.rsvpStatus || 'pending',
        dietary: g.dietary || current.dietary,
        eventsInvited: g.eventsInvited || current.eventsInvited || ['wedding'],
        invitationType: g.invitationType || current.invitationType || 'wedding',
        customFunctionName: g.customFunctionName || current.customFunctionName || '',
        notes: g.notes !== undefined ? g.notes : current.notes,
        updatedAt: new Date().toISOString(),
      });
      incomingIds.add(g.id);
    } else {
      // New row
      const newId = g.id || ('gst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
      const newRecord = {
        id: newId,
        weddingId: db.masterWeddingId || '',
        srNo: index + 1,
        name: g.name.trim(),
        side,
        owner,
        relation: g.relation ? g.relation.trim() : '',
        mobile: g.mobile ? g.mobile.trim() : '',
        email: g.email ? g.email.trim().toLowerCase() : '',
        headcount: validHeadcount,
        rsvpStatus: g.rsvpStatus || 'pending',
        dietary: g.dietary || 'Vegetarian',
        eventsInvited: g.eventsInvited || ['wedding'],
        invitationType: g.invitationType || 'wedding',
        customFunctionName: g.customFunctionName || '',
        invitationSent: Boolean(g.invitationSent),
        invitationHistory: [],
        notes: g.notes || '',
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.guests.push(newRecord);
      incomingIds.add(newId);
    }
  });

  // Re-sequence sequential serial numbers
  db.guests.forEach((g: any, i: number) => {
    g.srNo = i + 1;
  });

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Spreadsheet batch update: ${guests.length} guest rows synced`,
    category: 'Guests',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  const analytics = computeGuestAnalytics(db.guests);
  res.json({
    success: true,
    guests: db.guests,
    analytics,
    message: 'Guest spreadsheet successfully synchronized.',
  });
});

// POST /api/guests/match (Confirm/Link or Unlink Shared Guests between Bride & Groom)
app.post('/api/guests/match', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { guestId1, guestId2, confirm, canonicalHeadcount } = req.body;

  if (!guestId1 || !guestId2) {
    return res.status(400).json({ error: 'Both guest IDs are required to link shared attendance.' });
  }

  const db = readDB();
  const g1 = (db.guests || []).find((g: any) => g.id === guestId1);
  const g2 = (db.guests || []).find((g: any) => g.id === guestId2);

  if (!g1 || !g2) {
    return res.status(404).json({ error: 'One or both guest records were not found.' });
  }

  if (confirm) {
    const sharedId = g1.sharedGuestId || g2.sharedGuestId || `shared_${Date.now()}`;
    const headcountVal = canonicalHeadcount ? Math.max(1, Number(canonicalHeadcount)) : Math.max(g1.headcount, g2.headcount);

    g1.sharedGuestId = sharedId;
    g1.isConfirmedShared = true;
    g1.matchedGuestId = g2.id;
    g1.canonicalAttendanceGroupId = sharedId;

    g2.sharedGuestId = sharedId;
    g2.isConfirmedShared = true;
    g2.matchedGuestId = g1.id;
    g2.canonicalAttendanceGroupId = sharedId;

    db.canonicalAttendanceGroups = db.canonicalAttendanceGroups || {};
    db.canonicalAttendanceGroups[sharedId] = {
      confirmed: true,
      canonicalHeadcount: headcountVal,
    };

    db.activityLogs.unshift({
      id: 'act_' + Date.now(),
      action: `Confirmed shared attendance: ${g1.name} (Bride) & ${g2.name} (Groom)`,
      category: 'Guests',
      userName: user.name,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Unlink
    delete g1.isConfirmedShared;
    delete g1.matchedGuestId;
    delete g1.canonicalAttendanceGroupId;

    delete g2.isConfirmedShared;
    delete g2.matchedGuestId;
    delete g2.canonicalAttendanceGroupId;

    db.activityLogs.unshift({
      id: 'act_' + Date.now(),
      action: `Unlinked separate attendance: ${g1.name} & ${g2.name}`,
      category: 'Guests',
      userName: user.name,
      timestamp: new Date().toISOString(),
    });
  }

  writeDB(db);
  const analytics = computeGuestAnalytics(db.guests);
  res.json({
    success: true,
    message: confirm ? 'Shared guest attendance linked successfully.' : 'Guest records kept separate.',
    analytics,
  });
});

// PUT /api/guests/:id
app.put('/api/guests/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const updates = req.body;

  const db = readDB();
  const index = db.guests.findIndex((g: any) => g.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const current = db.guests[index];
  if (user.role === 'groom' && (current.owner === 'bride' || current.side === 'bride')) {
    return res.status(403).json({ error: "Access denied: You cannot view or modify bride's private guests." });
  }
  if (user.role === 'bride' && (current.owner === 'groom' || current.side === 'groom')) {
    return res.status(403).json({ error: "Access denied: You cannot view or modify groom's private guests." });
  }

  db.guests[index] = {
    ...current,
    ...updates,
    headcount: updates.headcount !== undefined ? Math.max(1, Math.round(Number(updates.headcount) || 1)) : current.headcount,
    updatedAt: new Date().toISOString(),
  };

  writeDB(db);
  res.json(db.guests[index]);
});

// DELETE /api/guests/:id
app.delete('/api/guests/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const db = readDB();
  const guest = db.guests.find((g: any) => g.id === id);
  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  if (user.role === 'groom' && (guest.owner === 'bride' || guest.side === 'bride')) {
    return res.status(403).json({ error: "Access denied: You cannot delete bride's private guest." });
  }
  if (user.role === 'bride' && (guest.owner === 'groom' || guest.side === 'groom')) {
    return res.status(403).json({ error: "Access denied: You cannot delete groom's private guest." });
  }

  db.guests = db.guests.filter((g: any) => g.id !== id);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Removed guest: ${guest.name}`,
    category: 'Guests',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Invitations & Dynamic Messages Endpoints
// -------------------------------------------------------------

// POST /api/invitations/card
app.post('/api/invitations/card', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, imageUrl, event, messageTemplate } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Invitation card image is required' });
  }

  const newCard = {
    id: 'inv_card_' + Date.now(),
    weddingId: readDB().masterWeddingId || '',
    title: title || 'Custom Invitation Card',
    imageUrl,
    event: event || 'wedding',
    messageTemplate: messageTemplate || '',
    owner: 'shared',
    uploadedAt: new Date().toISOString(),
  };

  const db = readDB();
  db.invitationCards = db.invitationCards || [];
  db.invitationCards.push(newCard);

  writeDB(db);
  res.status(201).json(newCard);
});

// POST /api/invitations/send (Dynamic message generation, history logging, and WhatsApp direct link)
app.post('/api/invitations/send', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { guestIds, invitationType = 'wedding', customFunctionName, customMessage, channel = 'whatsapp' } = req.body;

  if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
    return res.status(400).json({ error: 'Select at least one guest to dispatch invitations.' });
  }

  const db = readDB();
  const couple = db.coupleProfile;
  const groomName = couple.groom?.name || 'Groom';
  const brideName = couple.bride?.name || 'Bride';

  // Dynamic template based on invitationType
  let defaultMessage = '';
  if (invitationType === 'engagement') {
    const engDate = couple.engagementDate ? new Date(couple.engagementDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'our special day';
    const engVenue = couple.engagementVenue || 'the banquet hall';
    defaultMessage = `With great joy, we invite you to celebrate the engagement ceremony of ${brideName} and ${groomName} on ${engDate} at ${engVenue}. Your presence will make this occasion even more special.`;
  } else if (invitationType === 'reception') {
    const recVenue = couple.weddingVenue || 'our grand celebration venue';
    defaultMessage = `We cordially invite you to the wedding reception of ${brideName} and ${groomName} at ${recVenue}. Your presence and blessings are sincerely appreciated.`;
  } else if (invitationType === 'other') {
    const funcName = customFunctionName || 'our auspicious celebration';
    defaultMessage = `We warmly invite you to the sacred ${funcName} ceremony of ${brideName} and ${groomName}. We look forward to celebrating together.`;
  } else {
    // wedding
    const wedDate = couple.weddingDate ? new Date(couple.weddingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'our auspicious day';
    const wedVenue = couple.weddingVenue || 'the celebration venue';
    defaultMessage = `With the blessings of our families, we warmly invite you to the wedding ceremony of ${brideName} and ${groomName} on ${wedDate} at ${wedVenue}. We look forward to celebrating this special day with you.`;
  }

  const finalTemplate = (customMessage && customMessage.trim()) ? customMessage.trim() : defaultMessage;

  let updatedCount = 0;
  const directDispatchLinks: Array<{ guestId: string; name: string; mobile: string; whatsappUrl?: string }> = [];

  db.invitationHistory = db.invitationHistory || [];

  db.guests.forEach((g: any) => {
    if (guestIds.includes(g.id)) {
      // Personalize guest name if token exists or prepend name
      let personalized = finalTemplate;
      if (personalized.includes('[Guest Name]')) {
        personalized = personalized.replace(/\[Guest Name\]/g, g.name);
      } else {
        personalized = `Dear ${g.name},\n\n${personalized}`;
      }

      const invRecord = {
        id: 'inv_rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        invitationType,
        customFunctionName: customFunctionName || '',
        recipientName: g.name,
        recipientContact: g.mobile || g.email || 'Digital Invite',
        channel,
        message: personalized,
        sentBySide: user.role === 'groom' ? 'groom' : user.role === 'bride' ? 'bride' : (g.side === 'bride' ? 'bride' : 'groom'),
        sentByName: user.name,
        sentAt: new Date().toISOString(),
        status: 'sent',
      };

      g.invitationSent = true;
      g.invitationSentAt = new Date().toISOString();
      g.invitationSentBy = user.name;
      g.invitationType = invitationType;
      g.customFunctionName = customFunctionName;
      g.invitationHistory = g.invitationHistory || [];
      g.invitationHistory.push(invRecord);

      db.invitationHistory.push(invRecord);

      const cleanMobile = (g.mobile || '').replace(/\D/g, '');
      const waUrl = cleanMobile ? `https://wa.me/${cleanMobile}?text=${encodeURIComponent(personalized)}` : undefined;

      directDispatchLinks.push({
        guestId: g.id,
        name: g.name,
        mobile: g.mobile,
        whatsappUrl: waUrl,
      });

      updatedCount++;
    }
  });

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Dispatched ${invitationType.toUpperCase()} invitations to ${updatedCount} guests via ${channel}`,
    category: 'Invitations',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({
    success: true,
    sentCount: updatedCount,
    invitationType,
    messageTemplate: finalTemplate,
    directDispatchLinks,
    message: `Invitations recorded for ${updatedCount} guests!`,
  });
});

// -------------------------------------------------------------
// Photo Albums & Gallery Management Endpoints
// -------------------------------------------------------------

// GET /api/albums
app.get('/api/albums', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = readDB();
  const allAlbums = db.albums || [];
  const allPhotos = db.gallery || [];

  const isSuperAdmin = user.role === 'admin';
  const isGroom = user.role === 'groom';
  const isBride = user.role === 'bride';

  const filteredAlbums = isSuperAdmin
    ? allAlbums
    : allAlbums.filter((a: any) => {
        const owner = a.owner || 'shared';
        if (owner === 'shared') return true;
        if (isGroom && owner === 'groom') return true;
        if (isBride && owner === 'bride') return true;
        return false;
      });

  // Calculate photo count for each album
  const albumsWithCount = filteredAlbums.map((a: any) => ({
    ...a,
    photoCount: allPhotos.filter((p: any) => p.albumId === a.id).length,
  }));

  res.json(albumsWithCount);
});

// POST /api/albums (Create custom or ceremony album)
app.post('/api/albums', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, description, category, owner } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Album name is required.' });
  }

  const assignedOwner = owner || (user.role === 'groom' ? 'groom' : user.role === 'bride' ? 'bride' : 'shared');

  const newAlbum = {
    id: 'album_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    weddingId: readDB().masterWeddingId || '',
    name: name.trim(),
    description: description ? description.trim() : '',
    category: category || 'custom',
    owner: assignedOwner,
    createdAt: new Date().toISOString(),
  };

  const db = readDB();
  db.albums = db.albums || [];
  db.albums.push(newAlbum);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Created photo album: "${newAlbum.name}" (${newAlbum.category})`,
    category: 'Gallery',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json(newAlbum);
});

// PUT /api/albums/:id (Rename or update album)
app.put('/api/albums/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { name, description, category, owner } = req.body;

  const db = readDB();
  const index = (db.albums || []).findIndex((a: any) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Album not found.' });
  }

  const current = db.albums[index];
  if (user.role === 'groom' && current.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot edit bride's private album." });
  }
  if (user.role === 'bride' && current.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot edit groom's private album." });
  }

  if (name) current.name = name.trim();
  if (description !== undefined) current.description = description.trim();
  if (category) current.category = category;
  if (owner && (user.role === 'admin')) current.owner = owner;

  writeDB(db);
  res.json(current);
});

// DELETE /api/albums/:id (Delete album, preserves photos by unassigning them)
app.delete('/api/albums/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const db = readDB();
  const album = (db.albums || []).find((a: any) => a.id === id);
  if (!album) {
    return res.status(404).json({ error: 'Album not found.' });
  }

  if (user.role === 'groom' && album.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot delete bride's private album." });
  }
  if (user.role === 'bride' && album.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot delete groom's private album." });
  }

  // Preserve photos: unassign them from this album rather than deleting
  (db.gallery || []).forEach((p: any) => {
    if (p.albumId === id) {
      p.albumId = '';
    }
  });

  db.albums = (db.albums || []).filter((a: any) => a.id !== id);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Deleted album: "${album.name}" (Photos preserved in Unassigned)`,
    category: 'Gallery',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true, message: `Album "${album.name}" deleted. Photos preserved.` });
});

// GET /api/gallery (Filtered by user role & optional albumId)
app.get('/api/gallery', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { albumId } = req.query;
  const db = readDB();
  let photos = db.gallery || [];

  const isSuperAdmin = user.role === 'admin';
  const isGroom = user.role === 'groom';
  const isBride = user.role === 'bride';

  photos = photos.filter((p: any) => {
    const owner = p.owner || 'shared';
    if (isSuperAdmin) return true;
    if (owner === 'shared') return true;
    if (isGroom && owner === 'groom') return true;
    if (isBride && owner === 'bride') return true;
    return false;
  });

  if (albumId) {
    photos = photos.filter((p: any) => p.albumId === albumId);
  }

  res.json(photos);
});

// POST /api/gallery (Upload single photo)
app.post('/api/gallery', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, imageUrl, albumId, category, caption, description, date, owner } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Photo image is required' });
  }

  const assignedOwner = owner || (user.role === 'groom' ? 'groom' : user.role === 'bride' ? 'bride' : 'shared');

  const newItem = {
    id: 'gal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    weddingId: readDB().masterWeddingId || '',
    albumId: albumId || '',
    title: title ? title.trim() : 'Celebration Memory',
    imageUrl,
    category: category || 'wedding',
    caption: caption ? caption.trim() : '',
    description: description ? description.trim() : '',
    date: date || new Date().toISOString().split('T')[0],
    owner: assignedOwner,
    uploadedBy: user.id,
    uploadedByName: user.name,
    createdAt: new Date().toISOString(),
  };

  const db = readDB();
  db.gallery = db.gallery || [];
  db.gallery.unshift(newItem);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Uploaded photo: "${newItem.title}"`,
    category: 'Gallery',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json(newItem);
});

// POST /api/gallery/batch (Upload multiple photos into an album)
app.post('/api/gallery/batch', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { photos, albumId, category } = req.body;

  if (!Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: 'At least one photo is required.' });
  }

  const db = readDB();
  db.gallery = db.gallery || [];
  const defaultOwner = user.role === 'groom' ? 'groom' : user.role === 'bride' ? 'bride' : 'shared';

  const createdItems: any[] = [];

  photos.forEach((p: any) => {
    if (!p.imageUrl) return;
    const item = {
      id: 'gal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      weddingId: db.masterWeddingId || '',
      albumId: albumId || p.albumId || '',
      title: p.title ? p.title.trim() : 'Celebration Photo',
      imageUrl: p.imageUrl,
      category: category || p.category || 'wedding',
      caption: p.caption ? p.caption.trim() : '',
      description: p.description ? p.description.trim() : '',
      date: p.date || new Date().toISOString().split('T')[0],
      owner: p.owner || defaultOwner,
      uploadedBy: user.id,
      uploadedByName: user.name,
      createdAt: new Date().toISOString(),
    };
    db.gallery.unshift(item);
    createdItems.push(item);
  });

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Batch uploaded ${createdItems.length} photos`,
    category: 'Gallery',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json({ success: true, count: createdItems.length, items: createdItems });
});

// PUT /api/gallery/:id (Update photo title, albumId, caption, description, replace image)
app.put('/api/gallery/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { title, albumId, category, caption, description, date, imageUrl, owner } = req.body;

  const db = readDB();
  const index = (db.gallery || []).findIndex((g: any) => g.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Gallery photo not found' });
  }

  const current = db.gallery[index];
  if (user.role === 'groom' && current.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot modify bride's private photo." });
  }
  if (user.role === 'bride' && current.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot modify groom's private photo." });
  }

  if (title !== undefined) current.title = title.trim();
  if (albumId !== undefined) current.albumId = albumId;
  if (category !== undefined) current.category = category;
  if (caption !== undefined) current.caption = caption.trim();
  if (description !== undefined) current.description = description.trim();
  if (date !== undefined) current.date = date;
  if (imageUrl !== undefined) current.imageUrl = imageUrl;
  if (owner !== undefined && (user.role === 'admin')) current.owner = owner;

  writeDB(db);
  res.json(current);
});

// DELETE /api/gallery/:id
app.delete('/api/gallery/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const db = readDB();

  const current = (db.gallery || []).find((g: any) => g.id === id);
  if (!current) {
    return res.status(404).json({ error: 'Photo not found.' });
  }

  if (user.role === 'groom' && current.owner === 'bride') {
    return res.status(403).json({ error: "Access denied: You cannot delete bride's private photo." });
  }
  if (user.role === 'bride' && current.owner === 'groom') {
    return res.status(403).json({ error: "Access denied: You cannot delete groom's private photo." });
  }

  db.gallery = (db.gallery || []).filter((g: any) => g.id !== id);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Deleted photo: "${current.title}"`,
    category: 'Gallery',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true });
});

// DELETE /api/admin/photos/:id (Super Admin delete ANY photo)
app.delete('/api/admin/photos/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Super Administrator access required.' });
  }

  const { id } = req.params;
  const db = readDB();

  if (id === 'groom_photo') {
    db.coupleProfile.groom.photoUrl = '';
  } else if (id === 'bride_photo') {
    db.coupleProfile.bride.photoUrl = '';
  } else if (id === 'cover_photo') {
    db.coupleProfile.coverPhotoUrl = '';
  } else {
    db.gallery = (db.gallery || []).filter((g: any) => g.id !== id);
  }

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Super Admin deleted media: ${id}`,
    category: 'Media',
    userName: user.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.json({ success: true, message: `Photo ${id} deleted successfully.` });
});

// -------------------------------------------------------------
// Super Admin Platform Management Endpoint
// -------------------------------------------------------------

// GET /api/admin/weddings (Only Super Admin voyaramedia)
app.get('/api/admin/weddings', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Super Administrator access required.' });
  }

  const db = readDB();
  res.json({
    weddings: db.weddings || [],
    totalWeddings: (db.weddings || []).length,
    totalUsers: db.users.length,
    activityLogs: db.activityLogs.slice(0, 100),
  });
});

// -------------------------------------------------------------
// User Management Endpoints
// -------------------------------------------------------------

// GET /api/users
app.get('/api/users', authMiddleware, (req: Request, res: Response) => {
  const db = readDB();
  res.json(db.users.map(sanitizeUser));
});

// POST /api/users (Add family member)
app.post('/api/users', authMiddleware, (req: Request, res: Response) => {
  const adminUser = (req as any).user;
  if (adminUser.role !== 'admin' && !adminUser.permissions?.canManageUsers) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to manage users.' });
  }

  const { name, mobile, email, password, role, relation, permissions } = req.body;

  if (!name || !mobile || !password) {
    return res.status(400).json({ error: 'Name, mobile number, and password are required' });
  }

  const db = readDB();
  const cleanMobile = mobile.trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  const existing = db.users.find((u: any) => u.mobile === cleanMobile || (cleanEmail && u.email?.toLowerCase() === cleanEmail));
  if (existing) {
    return res.status(409).json({ error: 'A user with this mobile number or email already exists' });
  }

  const { hash, salt } = hashPassword(password);
  const newUser = {
    id: 'usr_' + Date.now(),
    weddingId: db.masterWeddingId || '',
    mobile: cleanMobile,
    email: cleanEmail || `${cleanMobile}@wedding.local`,
    name: name.trim(),
    role: role || 'family',
    relation: relation || 'Family Member',
    passwordHash: hash,
    salt,
    permissions: permissions || {
      canEditBudget: false,
      canManageVendors: false,
      canManageTasks: true,
      canManageGuests: true,
      canEditEvents: false,
      canManageUsers: false,
    },
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  db.activityLogs.unshift({
    id: 'act_' + Date.now(),
    action: `Added family member: ${newUser.name}`,
    category: 'Users',
    userName: adminUser.name,
    timestamp: new Date().toISOString(),
  });

  writeDB(db);
  res.status(201).json(sanitizeUser(newUser));
});

// PUT /api/users/:id
app.put('/api/users/:id', authMiddleware, (req: Request, res: Response) => {
  const adminUser = (req as any).user;
  const { id } = req.params;

  if (adminUser.role !== 'admin' && !adminUser.permissions?.canManageUsers && adminUser.id !== id) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to edit user profile.' });
  }

  const { name, mobile, email, role, relation, permissions, password } = req.body;

  const db = readDB();
  const index = db.users.findIndex((u: any) => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const target = db.users[index];

  if (password && password.trim().length >= 6) {
    const { hash, salt } = hashPassword(password.trim());
    target.passwordHash = hash;
    target.salt = salt;
  }

  if (name) target.name = name.trim();
  if (mobile) target.mobile = mobile.trim();
  if (email !== undefined) target.email = email.trim().toLowerCase();
  if (role && (adminUser.role === 'admin' || adminUser.permissions?.canManageUsers)) target.role = role;
  if (relation !== undefined) target.relation = relation;
  if (permissions && (adminUser.role === 'admin' || adminUser.permissions?.canManageUsers)) {
    target.permissions = { ...target.permissions, ...permissions };
  }
  target.updatedAt = new Date().toISOString();

  writeDB(db);
  res.json(sanitizeUser(target));
});

// DELETE /api/users/:id
app.delete('/api/users/:id', authMiddleware, (req: Request, res: Response) => {
  const adminUser = (req as any).user;
  if (adminUser.role !== 'admin' && !adminUser.permissions?.canManageUsers) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to delete users.' });
  }

  const { id } = req.params;

  if (id === adminUser.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.username === 'voyaramedia') {
    return res.status(403).json({ error: 'Super Admin voyaramedia cannot be deleted' });
  }

  db.users = db.users.filter((u: any) => u.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Image / Document Upload Endpoint
// -------------------------------------------------------------
app.post('/api/upload', optionalAuth, (req: Request, res: Response) => {
  const { dataUrl, filename } = req.body;

  if (!dataUrl) {
    return res.status(400).json({ error: 'No data URL provided for upload' });
  }

  try {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9/.-]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid base64 upload data' });
    }

    const mime = matches[1];
    let ext = 'bin';
    if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('pdf')) ext = 'pdf';
    else if (mime.includes('word') || mime.includes('docx')) ext = 'docx';

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'File exceeds maximum 25MB limit' });
    }

    const safeName = `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeName}`;
    res.json({ url: publicUrl, size: buffer.length, mimeType: mime, fileName: filename || safeName });
  } catch (err: any) {
    console.error('File upload failed:', err);
    res.status(500).json({ error: 'Failed to process file upload' });
  }
});

// -------------------------------------------------------------
// Vite dev / Production static serving setup
// -------------------------------------------------------------
async function setupServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wedding Planner server running at http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Fatal server boot error:', err);
});
