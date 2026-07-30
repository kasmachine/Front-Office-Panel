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
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';

// Silence internal Firestore console log noise
setLogLevel('silent');
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { CashCountData, ReceiptSubstituteData } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if specified in config
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
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
  const q = query(collection(db, CASH_COUNTS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CashCountData[] = snapshot.docs.map((d) => d.data() as CashCountData);
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
  const q = query(collection(db, RECEIPTS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ReceiptSubstituteData[] = snapshot.docs.map((d) => d.data() as ReceiptSubstituteData);
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

const lastSavedDrafts: Record<string, string> = {};

/**
 * Realtime Active Draft Sync (Syncs draft state live across team members)
 */
export async function saveActiveDraftToFirebase(draftType: 'cashCount' | 'receiptSubstitute', data: any): Promise<void> {
  if (isQuotaExceeded) return;
  const serialized = JSON.stringify(data);
  if (lastSavedDrafts[draftType] === serialized) return;

  const path = `${DRAFTS_COLLECTION}/${draftType}`;
  try {
    await initAuth();
    const docRef = doc(db, DRAFTS_COLLECTION, draftType);
    await setDoc(docRef, { ...data, lastModifiedAt: new Date().toISOString() }, { merge: true });
    lastSavedDrafts[draftType] = serialized;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeActiveDraft(draftType: 'cashCount' | 'receiptSubstitute', callback: (data: any) => void) {
  const docRef = doc(db, DRAFTS_COLLECTION, draftType);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${DRAFTS_COLLECTION}/${draftType}`);
    }
  );
}

/**
 * Realtime Staff List Sync (Syncs staff names live across all devices)
 */
const CONFIG_COLLECTION = 'app_config';
const STAFF_DOC = 'staff_list';
let lastSavedStaffList = '';

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
      if (snapshot.exists() && Array.isArray(snapshot.data().list)) {
        callback(snapshot.data().list);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${CONFIG_COLLECTION}/${STAFF_DOC}`);
    }
  );
}


