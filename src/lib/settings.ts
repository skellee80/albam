import 'server-only';

import { COL, db } from './firebase-admin';
import { DEFAULT_SETTINGS, type Settings } from './types';

const SETTINGS_DOC = 'config';

/**
 * 입금 계좌·연락처 설정.
 * 문서가 아직 없어도 기본값으로 화면이 뜨게 한다 — 시드 전에도 앱이 죽지 않도록.
 */
export async function getSettings(): Promise<Settings> {
  const doc = await db.collection(COL.settings).doc(SETTINGS_DOC).get();
  if (!doc.exists) return { ...DEFAULT_SETTINGS };
  const data = doc.data()!;
  return {
    bankName: data.bankName ?? DEFAULT_SETTINGS.bankName,
    bankAccount: data.bankAccount ?? DEFAULT_SETTINGS.bankAccount,
    bankHolder: data.bankHolder ?? DEFAULT_SETTINGS.bankHolder,
    contactPhone: data.contactPhone ?? DEFAULT_SETTINGS.contactPhone,
  };
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db
    .collection(COL.settings)
    .doc(SETTINGS_DOC)
    .set({ ...patch, updatedAt: Date.now() }, { merge: true });
}
