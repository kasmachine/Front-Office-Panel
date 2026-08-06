import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';

// Silence internal Firestore console log noise
setLogLevel('silent');
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { CashCountData, ReceiptSubstituteData, MonthlyRevenueData, RevenueHistoryRecord, RevenueCategories, FrontOfficeChecklistData, NewsItem, SOPItem } from '../types';

// Construct effective Firebase config (supports Vercel env vars or fallback to firebase-applet-config.json)
const effectiveFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(effectiveFirebaseConfig);

// Initialize Firestore with custom databaseId if specified in config
export const db = effectiveFirebaseConfig.firestoreDatabaseId && effectiveFirebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, effectiveFirebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Operational Error Logging Interface as required by Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

let isQuotaExceeded = false;

export function getIsQuotaExceeded(): boolean {
  return isQuotaExceeded;
}

export function resetQuotaExceeded(): void {
  isQuotaExceeded = false;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);
  if (
    errStr.includes('resource-exhausted') ||
    errStr.includes('Quota limit exceeded') ||
    errStr.includes('quota') ||
    errStr.includes('429')
  ) {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      console.warn('[Firebase] Write quota limit exceeded. Falling back to local storage.');
    }
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Test Connection on Boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or project unreachable.');
    }
    return false;
  }
}

// Anonymous Auth Helper
let authInitPromise: Promise<User | null> | null = null;

export const initAuth = (): Promise<User | null> => {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          try {
            const userCred = await signInAnonymously(auth);
            resolve(userCred.user);
          } catch (err) {
            // Anonymous auth disabled or restricted in Firebase project (auth/admin-restricted-operation)
            // Proceed as unauthenticated since Firestore security rules allow open access.
            resolve(null);
          }
        }
      });
    });
  }
  return authInitPromise;
};

// Collections
const CASH_COUNTS_COLLECTION = 'cash_counts';
const RECEIPTS_COLLECTION = 'receipt_substitutes';
const DRAFTS_COLLECTION = 'active_drafts';

/**
 * Save Cash Count Record to Firebase Firestore
 */
export async function saveCashCountToFirebase(data: CashCountData): Promise<string> {
  const docId = data.id || `cash-${Date.now()}`;
  if (isQuotaExceeded) return docId;
  await initAuth();
  const path = `${CASH_COUNTS_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, CASH_COUNTS_COLLECTION, docId);
    const payload = {
      ...data,
      id: docId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return docId;
  }
}

/**
 * Realtime listener for Cash Count Records from Firestore
 */
export function subscribeCashCounts(callback: (items: CashCountData[]) => void) {
  return onSnapshot(
    collection(db, CASH_COUNTS_COLLECTION),
    (snapshot) => {
      const list: CashCountData[] = snapshot.docs.map((d) => d.data() as CashCountData);
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, CASH_COUNTS_COLLECTION);
    }
  );
}

/**
 * Fetch all Cash Counts from Firestore
 */
export async function fetchCashCountsFromFirebase(): Promise<CashCountData[]> {
  await initAuth();
  try {
    const q = query(collection(db, CASH_COUNTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as CashCountData);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, CASH_COUNTS_COLLECTION);
    return [];
  }
}

/**
 * Delete Cash Count from Firestore
 */
export async function deleteCashCountFromFirebase(docId: string): Promise<void> {
  if (isQuotaExceeded) return;
  await initAuth();
  const path = `${CASH_COUNTS_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, CASH_COUNTS_COLLECTION, docId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Save Receipt Substitute Record to Firebase Firestore
 */
export async function saveReceiptToFirebase(data: ReceiptSubstituteData): Promise<string> {
  const docId = data.id || `receipt-${Date.now()}`;
  if (isQuotaExceeded) return docId;
  await initAuth();
  const path = `${RECEIPTS_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, RECEIPTS_COLLECTION, docId);
    const payload = {
      ...data,
      id: docId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return docId;
  }
}

/**
 * Realtime listener for Receipt Substitute Records from Firestore
 */
export function subscribeReceipts(callback: (items: ReceiptSubstituteData[]) => void) {
  return onSnapshot(
    collection(db, RECEIPTS_COLLECTION),
    (snapshot) => {
      const list: ReceiptSubstituteData[] = snapshot.docs.map((d) => d.data() as ReceiptSubstituteData);
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, RECEIPTS_COLLECTION);
    }
  );
}

/**
 * Fetch all Receipts from Firestore
 */
export async function fetchReceiptsFromFirebase(): Promise<ReceiptSubstituteData[]> {
  await initAuth();
  try {
    const q = query(collection(db, RECEIPTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as ReceiptSubstituteData);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, RECEIPTS_COLLECTION);
    return [];
  }
}

/**
 * Delete Receipt Substitute from Firestore
 */
export async function deleteReceiptFromFirebase(docId: string): Promise<void> {
  if (isQuotaExceeded) return;
  await initAuth();
  const path = `${RECEIPTS_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, RECEIPTS_COLLECTION, docId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  const pairs = keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`);
  return '{' + pairs.join(',') + '}';
}

const lastSentDrafts: Record<string, string> = {};
const pendingWrites: Record<string, { inProgress: boolean; nextData?: any }> = {
  cashCount: { inProgress: false },
  receiptSubstitute: { inProgress: false },
};

export function updateLastSavedDraftCache(draftType: 'cashCount' | 'receiptSubstitute', data: any) {
  if (!data) return;
  const { lastModifiedAt, ...cleanData } = data;
  lastSentDrafts[draftType] = canonicalStringify(cleanData);
}

// Multi-tab instant BroadcastChannel sync
let draftBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    draftBroadcastChannel = new BroadcastChannel('nan_seasons_realtime_draft_v1');
  } catch (e) {
    draftBroadcastChannel = null;
  }
}

export function broadcastDraftUpdate(draftType: 'cashCount' | 'receiptSubstitute', data: any) {
  if (draftBroadcastChannel && data) {
    try {
      const { lastModifiedAt, ...cleanData } = data;
      draftBroadcastChannel.postMessage({ draftType, data: cleanData, time: Date.now() });
    } catch (e) { /* ignore */ }
  }
}

export function subscribeBroadcastDraft(
  callback: (draftType: 'cashCount' | 'receiptSubstitute', data: any) => void
) {
  if (!draftBroadcastChannel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data && event.data.draftType && event.data.data) {
      callback(event.data.draftType, event.data.data);
    }
  };
  draftBroadcastChannel.addEventListener('message', handler);
  return () => {
    draftBroadcastChannel?.removeEventListener('message', handler);
  };
}

export async function fetchActiveDraftFromFirebase(draftType: 'cashCount' | 'receiptSubstitute') {
  try {
    await initAuth();
    const docRef = doc(db, DRAFTS_COLLECTION, draftType);
    const snap = await getDocFromServer(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    try {
      const docRef = doc(db, DRAFTS_COLLECTION, draftType);
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data();
    } catch (e) { /* ignore */ }
  }
  return null;
}

/**
 * Realtime Active Draft Sync (Syncs draft state live across team members)
 */
export async function saveActiveDraftToFirebase(draftType: 'cashCount' | 'receiptSubstitute', data: any): Promise<void> {
  if (isQuotaExceeded || !data) return;
  const { lastModifiedAt, ...cleanData } = data;
  const serialized = canonicalStringify(cleanData);

  // Instantly notify other tabs on the same device via BroadcastChannel
  broadcastDraftUpdate(draftType, cleanData);

  if (lastSentDrafts[draftType] === serialized) return;

  const state = pendingWrites[draftType] || { inProgress: false };
  pendingWrites[draftType] = state;

  if (state.inProgress) {
    state.nextData = cleanData;
    return;
  }

  state.inProgress = true;
  const path = `${DRAFTS_COLLECTION}/${draftType}`;
  try {
    await initAuth();
    const docRef = doc(db, DRAFTS_COLLECTION, draftType);
    await setDoc(docRef, { ...cleanData, lastModifiedAt: new Date().toISOString() });
    lastSentDrafts[draftType] = serialized;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  } finally {
    state.inProgress = false;
    if (state.nextData) {
      const next = state.nextData;
      state.nextData = undefined;
      saveActiveDraftToFirebase(draftType, next);
    }
  }
}

export function subscribeActiveDraft(
  draftType: 'cashCount' | 'receiptSubstitute',
  callback: (data: any, hasPendingWrites: boolean) => void
) {
  initAuth().catch(() => {});
  const docRef = doc(db, DRAFTS_COLLECTION, draftType);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (!snapshot.metadata.hasPendingWrites) {
          updateLastSavedDraftCache(draftType, data);
        }
        callback(data, snapshot.metadata.hasPendingWrites);
      } else {
        callback(null, false);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${DRAFTS_COLLECTION}/${draftType}`);
      callback(null, false);
    }
  );
}

/**
 * Realtime Staff List Sync (Syncs staff names live across all devices)
 */
const CONFIG_COLLECTION = 'app_config';
const STAFF_DOC = 'staff_list';
let lastSavedStaffList = '';

const DEFAULT_STAFF_LIST = [
  'Aan',
  'Belle',
  'Kas',
  'Kwan',
  'Macc',
  'Nhum',
  'Ooh',
  'Pam',
  'Teung',
];

export async function saveStaffListToFirebase(staffList: string[]): Promise<void> {
  if (isQuotaExceeded) return;
  const serialized = JSON.stringify(staffList);
  if (lastSavedStaffList === serialized) return;

  const path = `${CONFIG_COLLECTION}/${STAFF_DOC}`;
  try {
    await initAuth();
    const docRef = doc(db, CONFIG_COLLECTION, STAFF_DOC);
    await setDoc(docRef, { list: staffList, updatedAt: new Date().toISOString() });
    lastSavedStaffList = serialized;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeStaffList(callback: (staffList: string[]) => void) {
  const docRef = doc(db, CONFIG_COLLECTION, STAFF_DOC);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists() && Array.isArray(snapshot.data().list) && snapshot.data().list.length > 0) {
        callback(snapshot.data().list);
      } else {
        saveStaffListToFirebase(DEFAULT_STAFF_LIST);
        callback(DEFAULT_STAFF_LIST);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${CONFIG_COLLECTION}/${STAFF_DOC}`);
    }
  );
}

/**
 * Realtime Category List Sync (Syncs expense/income categories live across all devices)
 */
const CATEGORIES_DOC = 'expense_categories';
let lastSavedCategories = '';

const DEFAULT_CATEGORIES = {
  minus: [
    '-แสงรุ่งต้ม',
    '-ตลาดเช้า (ผัก ผลไม้ และอาหารต่างๆ)',
    '-ตลาดเย็น (ผัก ผลไม้ และอาหารต่างๆ)',
    '-น้ำแข็ง',
    '-น้ำถัง',
    '-น้ำมันเครื่องตัดหญ้า',
    '-อุปกรณ์ช่าง/งานสวน',
    '-Kas paid out',
  ],
  plus: [
    '+Guest paid in',
    '+Kas paid in',
  ],
};

export async function saveCategoriesToFirebase(categories: { minus: string[]; plus: string[] }): Promise<void> {
  if (isQuotaExceeded) return;
  const serialized = JSON.stringify(categories);
  if (lastSavedCategories === serialized) return;

  const path = `${CONFIG_COLLECTION}/${CATEGORIES_DOC}`;
  try {
    await initAuth();
    const docRef = doc(db, CONFIG_COLLECTION, CATEGORIES_DOC);
    await setDoc(docRef, { ...categories, updatedAt: new Date().toISOString() });
    lastSavedCategories = serialized;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeCategories(callback: (categories: { minus: string[]; plus: string[] }) => void) {
  const docRef = doc(db, CONFIG_COLLECTION, CATEGORIES_DOC);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.minus) && Array.isArray(data.plus) && (data.minus.length > 0 || data.plus.length > 0)) {
          callback({ minus: data.minus, plus: data.plus });
        } else {
          saveCategoriesToFirebase(DEFAULT_CATEGORIES);
          callback(DEFAULT_CATEGORIES);
        }
      } else {
        saveCategoriesToFirebase(DEFAULT_CATEGORIES);
        callback(DEFAULT_CATEGORIES);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${CONFIG_COLLECTION}/${CATEGORIES_DOC}`);
    }
  );
}

/**
 * Realtime Monthly Revenue Sync (Salesplan and Targets)
 */
const REVENUE_COLLECTION = 'monthly_revenues';
let lastSavedRevenueMap: Record<string, string> = {};

export function createRevenueHistoryRecord(data: MonthlyRevenueData): RevenueHistoryRecord {
  const MONTH_TH = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const totalRev = (Object.values(data.days || {}) as RevenueCategories[]).reduce((acc: number, item: RevenueCategories): number => {
    return acc + (item.rooms || 0) + (item.foodBeverage || 0) + (item.shop || 0) +
           (item.toursEtc || 0) + (item.massage || 0) + (item.laundryOthers || 0);
  }, 0);

  const now = new Date();
  const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear() + 543} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} น.`;

  const monthStr = String(data.month).padStart(2, '0');
  const monthId = `rev-hist-${data.year}-${monthStr}`;

  return {
    id: monthId,
    docId: data.id || `revenue-${data.year}-${monthStr}`,
    year: data.year,
    month: data.month,
    monthName: `${MONTH_TH[(data.month || 1) - 1]} ${(data.year || 2026) + 543}`,
    updatedAt: formattedDate,
    totalRevenue: totalRev,
    data: data,
    createdAt: Date.now(),
  };
}

export async function saveMonthlyRevenueToFirebase(data: MonthlyRevenueData): Promise<void> {
  if (isQuotaExceeded || !data.id) return;
  const serialized = JSON.stringify(data);
  if (lastSavedRevenueMap[data.id] === serialized) return;

  const path = `${REVENUE_COLLECTION}/${data.id}`;
  try {
    await initAuth();
    const docRef = doc(db, REVENUE_COLLECTION, data.id);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    lastSavedRevenueMap[data.id] = serialized;

    // Automatically create a history snapshot whenever monthly revenue is saved
    const historyItem = createRevenueHistoryRecord(data);
    await saveRevenueHistoryToFirebase(historyItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeMonthlyRevenue(docId: string, callback: (data: MonthlyRevenueData | null) => void) {
  if (!docId) return () => {};
  const docRef = doc(db, REVENUE_COLLECTION, docId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as MonthlyRevenueData;
        callback(data);
        if (data && data.year && data.month) {
          const histItem = createRevenueHistoryRecord(data);
          saveRevenueHistoryToFirebase(histItem);
        }
      } else {
        callback(null);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${REVENUE_COLLECTION}/${docId}`);
      callback(null);
    }
  );
}

export async function fetchMonthlyRevenueFromFirebase(docId: string): Promise<MonthlyRevenueData | null> {
  await initAuth();
  try {
    const docRef = doc(db, REVENUE_COLLECTION, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as MonthlyRevenueData;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${REVENUE_COLLECTION}/${docId}`);
  }
  return null;
}

export function subscribeAllMonthlyRevenues(callback: (items: MonthlyRevenueData[]) => void) {
  return onSnapshot(
    collection(db, REVENUE_COLLECTION),
    (snapshot) => {
      const list: MonthlyRevenueData[] = snapshot.docs.map((d) => d.data() as MonthlyRevenueData);
      list.forEach((data) => {
        if (data && data.year && data.month) {
          const hist = createRevenueHistoryRecord(data);
          saveRevenueHistoryToFirebase(hist);
        }
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, REVENUE_COLLECTION);
    }
  );
}

/**
  * Realtime Revenue History Sync
  */
const REVENUE_HISTORY_COLLECTION = 'revenue_history';
let lastSavedRevenueHistoryMap: Record<string, string> = {};

export async function saveRevenueHistoryToFirebase(historyItem: RevenueHistoryRecord): Promise<void> {
  if (isQuotaExceeded || !historyItem.id) return;
  const serialized = JSON.stringify(historyItem.data);
  if (lastSavedRevenueHistoryMap[historyItem.id] === serialized) return;

  const path = `${REVENUE_HISTORY_COLLECTION}/${historyItem.id}`;
  try {
    await initAuth();
    const docRef = doc(db, REVENUE_HISTORY_COLLECTION, historyItem.id);
    await setDoc(docRef, { ...historyItem, createdAt: Date.now() });
    lastSavedRevenueHistoryMap[historyItem.id] = serialized;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeRevenueHistory(callback: (items: RevenueHistoryRecord[]) => void) {
  return onSnapshot(
    collection(db, REVENUE_HISTORY_COLLECTION),
    (snapshot) => {
      const rawList: RevenueHistoryRecord[] = snapshot.docs.map((d) => d.data() as RevenueHistoryRecord);
      const map = new Map<string, { record: RevenueHistoryRecord; legacyDocIds: string[] }>();

      for (const item of rawList) {
        if (!item || !item.year || !item.month) continue;
        const monthKey = `${item.year}-${String(item.month).padStart(2, '0')}`;
        const canonicalId = `rev-hist-${monthKey}`;
        const existing = map.get(monthKey);

        if (!existing) {
          map.set(monthKey, {
            record: item,
            legacyDocIds: item.id && item.id !== canonicalId ? [item.id] : [],
          });
        } else {
          const existingTime = existing.record.createdAt || 0;
          const itemTime = item.createdAt || 0;

          if (itemTime >= existingTime) {
            const newLegacy = [...existing.legacyDocIds];
            if (existing.record.id && existing.record.id !== canonicalId) {
              newLegacy.push(existing.record.id);
            }
            if (item.id && item.id !== canonicalId) {
              newLegacy.push(item.id);
            }
            map.set(monthKey, { record: item, legacyDocIds: newLegacy });
          } else {
            if (item.id && item.id !== canonicalId) {
              existing.legacyDocIds.push(item.id);
            }
          }
        }
      }

      // Automatically clean up old duplicate snapshot documents in Firebase
      map.forEach((value) => {
        if (value.legacyDocIds.length > 0 && !isQuotaExceeded) {
          value.legacyDocIds.forEach((dupId) => {
            if (dupId) deleteRevenueHistoryFromFirebase(dupId).catch(() => {});
          });
        }
      });

      const list = Array.from(map.values()).map((v) => v.record);
      list.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });

      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, REVENUE_HISTORY_COLLECTION);
    }
  );
}

export async function deleteRevenueHistoryFromFirebase(historyId: string): Promise<void> {
  if (isQuotaExceeded) return;
  await initAuth();
  const path = `${REVENUE_HISTORY_COLLECTION}/${historyId}`;
  try {
    const docRef = doc(db, REVENUE_HISTORY_COLLECTION, historyId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Realtime Front Office Checklist Persistence & Live Synchronization
 */
const CHECKLIST_COLLECTION = 'front_office_checklists';

export async function saveChecklistToFirebase(data: FrontOfficeChecklistData): Promise<void> {
  if (isQuotaExceeded || !data) return;
  const path = `${CHECKLIST_COLLECTION}/${data.id}`;
  try {
    await initAuth();
    const docRef = doc(db, CHECKLIST_COLLECTION, data.id);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeChecklist(
  dateDocId: string,
  callback: (data: FrontOfficeChecklistData | null, hasPendingWrites: boolean) => void
) {
  initAuth().catch(() => {});
  const docRef = doc(db, CHECKLIST_COLLECTION, dateDocId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as FrontOfficeChecklistData, snapshot.metadata.hasPendingWrites);
      } else {
        callback(null, false);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${CHECKLIST_COLLECTION}/${dateDocId}`);
      callback(null, false);
    }
  );
}

export async function fetchChecklistFromFirebase(dateDocId: string): Promise<FrontOfficeChecklistData | null> {
  try {
    await initAuth();
    const docRef = doc(db, CHECKLIST_COLLECTION, dateDocId);
    const snap = await getDocFromServer(docRef);
    if (snap.exists()) {
      return snap.data() as FrontOfficeChecklistData;
    }
  } catch (err) {
    try {
      const docRef = doc(db, CHECKLIST_COLLECTION, dateDocId);
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as FrontOfficeChecklistData;
    } catch (e) { /* ignore */ }
  }
  return null;
}

/**
 * News & Announcements Realtime Firestore Sync
 */
const NEWS_COLLECTION = 'nan_seasons_news';

export async function saveNewsItemToFirebase(item: NewsItem): Promise<void> {
  if (isQuotaExceeded || !item) return;
  const path = `${NEWS_COLLECTION}/${item.id}`;
  try {
    await initAuth();
    const docRef = doc(db, NEWS_COLLECTION, item.id);
    await setDoc(docRef, {
      ...item,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteNewsItemFromFirebase(newsId: string): Promise<void> {
  if (isQuotaExceeded || !newsId) return;
  const path = `${NEWS_COLLECTION}/${newsId}`;
  try {
    await initAuth();
    const docRef = doc(db, NEWS_COLLECTION, newsId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeNewsList(callback: (news: NewsItem[] | null) => void) {
  initAuth().catch(() => {});
  const q = query(collection(db, NEWS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: NewsItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as NewsItem);
      });
      callback(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, NEWS_COLLECTION);
      callback(null);
    }
  );
}

/**
 * Front Office Manual (SOPs) Realtime Firestore Sync
 */
const SOP_COLLECTION = 'front_office_sops';

export async function saveSOPToFirebase(item: SOPItem): Promise<void> {
  if (isQuotaExceeded || !item || !item.id) return;
  const path = `${SOP_COLLECTION}/${item.id}`;
  try {
    await initAuth();
    const docRef = doc(db, SOP_COLLECTION, item.id);
    await setDoc(docRef, {
      ...item,
      updatedAt: new Date().toISOString(),
      createdAt: item.createdAt || Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSOPFromFirebase(sopId: string): Promise<void> {
  if (isQuotaExceeded || !sopId) return;
  const path = `${SOP_COLLECTION}/${sopId}`;
  try {
    await initAuth();
    const docRef = doc(db, SOP_COLLECTION, sopId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveAllSOPsToFirebase(sops: SOPItem[]): Promise<void> {
  if (isQuotaExceeded || !sops) return;
  await initAuth();
  for (const item of sops) {
    await saveSOPToFirebase(item);
  }
}

export function subscribeSOPs(callback: (sops: SOPItem[] | null, hasPendingWrites: boolean) => void) {
  initAuth().catch(() => {});
  const q = query(collection(db, SOP_COLLECTION), orderBy('code', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SOPItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as SOPItem);
      });
      callback(items, snapshot.metadata.hasPendingWrites);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, SOP_COLLECTION);
      callback(null, false);
    }
  );
}






