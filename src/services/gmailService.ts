import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Scopes required for Gmail integration
export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// In-memory token cache (never stored in localStorage or sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: FirebaseUser | null = null;

// Auth state listeners
type AuthStateCallback = (user: FirebaseUser | null, token: string | null) => void;
const listeners = new Set<AuthStateCallback>();

export function subscribeGmailAuth(callback: AuthStateCallback) {
  listeners.add(callback);
  callback(cachedGoogleUser, cachedAccessToken);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  listeners.forEach((cb) => cb(cachedGoogleUser, cachedAccessToken));
}

// Watch auth state changes
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
    cachedGoogleUser = null;
    notifyListeners();
  } else {
    cachedGoogleUser = user;
    notifyListeners();
  }
});

/**
 * Connect user's Google/Gmail account via official Google popup
 */
export async function connectGmail(): Promise<{ user: FirebaseUser; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  GMAIL_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Sign-In completed, but no Gmail access token was returned.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Failed to connect Gmail:', error);
    throw error;
  }
}

/**
 * Disconnect Gmail session and clear in-memory cache
 */
export async function disconnectGmail(): Promise<void> {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    cachedGoogleUser = null;
    notifyListeners();
  }
}

export function getGmailAccessToken(): string | null {
  return cachedAccessToken;
}

export function getGmailUser(): FirebaseUser | null {
  return cachedGoogleUser;
}

export function isGmailConnected(): boolean {
  return Boolean(cachedAccessToken && cachedGoogleUser);
}

export interface InvitationEmailPayload {
  toEmail: string;
  guestName: string;
  weddingTitle: string;
  groomName: string;
  brideName: string;
  invitationType: 'wedding' | 'engagement' | 'reception' | 'other' | string;
  customFunctionName?: string;
  ceremonyDate: string;
  ceremonyVenue: string;
  ceremonyLocation: string;
  ceremonyMapLink?: string;
  customMessage: string;
  digitalCardUrl?: string;
}

/**
 * Generates an elegant, high-converting royal HTML & plain-text email
 */
export function buildInvitationEmailContent(payload: InvitationEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    guestName,
    weddingTitle,
    groomName,
    brideName,
    invitationType,
    customFunctionName,
    ceremonyDate,
    ceremonyVenue,
    ceremonyLocation,
    ceremonyMapLink,
    customMessage,
    digitalCardUrl,
  } = payload;

  let ceremonyHeader = '';
  let ceremonyBadge = '';

  if (invitationType === 'engagement') {
    ceremonyHeader = `Engagement Invitation: ${groomName} & ${brideName}`;
    ceremonyBadge = 'ENGAGEMENT CEREMONY';
  } else if (invitationType === 'reception') {
    ceremonyHeader = `Wedding Reception: ${groomName} & ${brideName}`;
    ceremonyBadge = 'WEDDING RECEPTION';
  } else if (invitationType === 'other') {
    ceremonyHeader = `${customFunctionName || 'Ceremony'} Invitation: ${groomName} & ${brideName}`;
    ceremonyBadge = (customFunctionName || 'SPECIAL CEREMONY').toUpperCase();
  } else {
    ceremonyHeader = `Wedding Invitation: ${groomName} & ${brideName}`;
    ceremonyBadge = 'SACRED WEDDING CEREMONY';
  }

  const subject = `💌 ${ceremonyHeader} — Cordially Invited`;

  const mapButtonHtml = ceremonyMapLink
    ? `<div style="margin-top: 10px;">
        <a href="${ceremonyMapLink}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #F5EBE1; color: #8C6D34; border: 1px solid #D4AF37; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
          🧭 View Venue on Google Maps
        </a>
      </div>`
    : '';

  const digitalCardHtml = digitalCardUrl
    ? `<div style="text-align: center; margin: 30px 0 20px 0; padding: 24px; background-color: #FAF6EE; border: 1px dashed #D4AF37; border-radius: 16px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #7A6B68; font-weight: 500;">
          Your personalized interactive digital invitation is ready:
        </p>
        <a href="${digitalCardUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #C5A059 100%); color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: bold; border-radius: 30px; box-shadow: 0 4px 14px rgba(212,175,55,0.4); letter-spacing: 0.5px;">
          ✨ Open Digital Invitation & RSVP ✨
        </a>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ceremonyHeader}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F5EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2D2422;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F5EE; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; border: 1px solid #EADBCE; box-shadow: 0 10px 30px rgba(140, 109, 52, 0.08);">
          <!-- Top Royal Gold Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #741322 0%, #8C1D2F 50%, #5E0F1B 100%); padding: 35px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <div style="display: inline-block; padding: 4px 14px; background: rgba(212, 175, 55, 0.2); border: 1px solid #D4AF37; border-radius: 20px; color: #F5E6BE; font-size: 11px; font-weight: 700; letter-spacing: 2px; margin-bottom: 12px;">
                ${ceremonyBadge}
              </div>
              <h1 style="margin: 0; color: #FFFBF4; font-family: Georgia, serif; font-size: 26px; font-weight: normal; letter-spacing: 0.5px;">
                ${weddingTitle || `${groomName} & ${brideName}`}
              </h1>
              <p style="margin: 8px 0 0 0; color: #E8D3A7; font-size: 14px; font-style: italic;">
                Celebrating the Sacred Union of ${brideName} and ${groomName}
              </p>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 35px 30px 20px 30px; background-color: #FFFFFF;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #2D2422;">
                Dear ${guestName || 'Valued Guest'},
              </p>

              <div style="font-size: 15px; line-height: 1.7; color: #4A3E3D; white-space: pre-line; margin-bottom: 25px;">
${customMessage}
              </div>

              <!-- Ceremony Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FDFBF7; border: 1px solid #EBDCC6; border-radius: 16px; margin: 20px 0; padding: 20px;">
                <tr>
                  <td style="padding: 6px 12px; vertical-align: top; width: 30px; font-size: 20px;">
                    📅
                  </td>
                  <td style="padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 12px; text-transform: uppercase; color: #8C6D34; font-weight: 700; letter-spacing: 1px;">Date & Auspicious Timing</div>
                    <div style="font-size: 15px; font-weight: 600; color: #2D2422; margin-top: 3px;">${ceremonyDate}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px 6px 12px; vertical-align: top; width: 30px; font-size: 20px;">
                    📍
                  </td>
                  <td style="padding: 10px 12px 6px 12px; vertical-align: top;">
                    <div style="font-size: 12px; text-transform: uppercase; color: #8C6D34; font-weight: 700; letter-spacing: 1px;">Ceremony Venue</div>
                    <div style="font-size: 15px; font-weight: 600; color: #2D2422; margin-top: 3px;">${ceremonyVenue}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px 6px 12px; vertical-align: top; width: 30px; font-size: 20px;">
                    🗺️
                  </td>
                  <td style="padding: 10px 12px 6px 12px; vertical-align: top;">
                    <div style="font-size: 12px; text-transform: uppercase; color: #8C6D34; font-weight: 700; letter-spacing: 1px;">Venue Location</div>
                    <div style="font-size: 14px; color: #5C4E4B; margin-top: 3px; line-height: 1.5;">${ceremonyLocation || ceremonyVenue}</div>
                    ${mapButtonHtml}
                  </td>
                </tr>
              </table>

              ${digitalCardHtml}

              <p style="margin: 25px 0 6px 0; font-size: 14px; color: #6E5F5D; line-height: 1.6; text-align: center;">
                We eagerly await your gracious presence and heartfelt blessings on our memorable day!
              </p>

              <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #EFE6D8; text-align: center;">
                <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #8C6D34; font-weight: 600;">
                  With Warm Regards & Best Wishes
                </p>
                <p style="margin: 5px 0 0 0; font-family: Georgia, serif; font-size: 18px; color: #741322; font-weight: bold;">
                  ${groomName} & ${brideName} and Families
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F2; padding: 18px; text-align: center; border-top: 1px solid #EAE0D2;">
              <p style="margin: 0; font-size: 11px; color: #9C8F8D;">
                Sent with love from the ${weddingTitle || 'Royal Wedding'} Digital Invitation Portal.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${ceremonyHeader}

Dear ${guestName || 'Guest'},

${customMessage}

📅 Date: ${ceremonyDate}
📍 Venue: ${ceremonyVenue}
🗺️ Venue Location: ${ceremonyLocation || ceremonyVenue}
${ceremonyMapLink ? `🧭 Map Location: ${ceremonyMapLink}\n` : ''}
${digitalCardUrl ? `💌 Digital Invitation Card & RSVP: ${digitalCardUrl}\n` : ''}
We eagerly await your gracious presence and blessings!

Warm regards,
${groomName} & ${brideName} and Families`;

  return { subject, html, text };
}

/**
 * Sends a single email via user's authenticated Gmail API
 */
export async function sendGmailMessage(params: {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; messageId: string }> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Gmail is not connected. Please connect your Gmail account first.');
  }

  // Construct MIME RFC 2822 message
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`;

  const emailLines = [
    `To: ${params.toEmail}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.html,
    '',
    `--${boundary}--`,
  ];

  const rawMessage = emailLines.join('\r\n');
  const base64UrlRaw = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64UrlRaw }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      cachedAccessToken = null;
      notifyListeners();
      throw new Error('Gmail authorization has expired. Please reconnect your Gmail account.');
    }
    throw new Error(errData.error?.message || `Gmail API dispatch error (${response.status})`);
  }

  const result = await response.json();
  return { success: true, messageId: result.id };
}
