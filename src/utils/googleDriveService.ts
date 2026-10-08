import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance cleanly without duplicates
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize Auth listener
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const driveGoogleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được Access Token từ Google Authentication');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[GoogleDrive] Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const driveLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Extract Folder ID or File ID from Google Drive Folder/Sheet/Doc URL
 * Examples:
 * https://drive.google.com/drive/folders/1A2B3C4D5E6F...
 * https://drive.google.com/drive/u/0/folders/1A2B3C4D5E6F...
 * https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F...
 * https://drive.google.com/open?id=1A2B3C4D5E6F...
 */
export const extractFolderIdFromUrl = (rawUrl: string): string | null => {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();

  // 1. Matched /folders/ID
  const matchFolder = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (matchFolder && matchFolder[1]) {
    return matchFolder[1];
  }

  // 2. Matched id=ID in query string (e.g., https://drive.google.com/open?id=1A2B...)
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return matchId[1];
  }

  // 3. Matched /d/ID/ (e.g. Google Sheets or Google Docs or file link)
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) {
    return matchD[1];
  }

  // 4. Raw Folder ID or File ID string (e.g., 1A2B3C4D5E6F7G8H)
  if (/^[a-zA-Z0-9_-]{15,100}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
};

/**
 * Upload an Excel file (5 sheets) directly to Google Drive via Drive REST API v3
 */
export const uploadExcelToGoogleDrive = async (
  excelBuffer: ArrayBuffer,
  fileName: string,
  folderUrl?: string
): Promise<{ id: string; name: string; webViewLink?: string }> => {
  let token = getDriveAccessToken();

  if (!token) {
    // If not signed in, trigger Google Sign-In Popup
    const authRes = await driveGoogleSignIn();
    if (!authRes?.accessToken) {
      throw new Error('Bạn cần đăng nhập Google để đẩy file lên Drive');
    }
    token = authRes.accessToken;
  }

  const folderId = folderUrl ? extractFolderIdFromUrl(folderUrl) : null;

  // Metadata
  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  // Build Multipart Form Body
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `${delimiter}Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

  // Convert ArrayBuffer to Base64
  const bytes = new Uint8Array(excelBuffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const multipartBody = metadataPart + mediaHeader + base64Data + closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    console.error('[GoogleDrive API Error]:', errorJson);
    throw new Error(errorJson?.error?.message || `Lỗi tải file lên Drive (Mã lỗi ${response.status})`);
  }

  const result = await response.json();
  return result;
};
