import 'server-only';

import { COL, db } from './firebase-admin';

/**
 * 그룹(품종) 목록과 그 차례.
 *
 * ## 왜 따로 저장하는가
 *
 * 예전에는 그룹을 저장하지 않고 **상품 이름 맨 앞 낱말에서 읽어냈다.**
 * "대보 중 4kg" 의 그룹은 "대보". 이름 하나만 고치면 그룹도 따라 움직여서
 * 어긋날 자리가 없다는 것이 이유였는데, 실제로는 두 가지가 망가졌다.
 *
 * 1. **크기 이름이 목록(중·대·특)에 없으면 그룹이 갈라졌다.**
 *    "대보 소 8kg" 은 "소" 를 크기로 못 알아보니 "대보 소" 가 통째로 품종이 되어
 *    대보 옆에 새 그룹이 하나 더 생겼다. 아버지는 왜 그런지 알 방법이 없다.
 * 2. **상품이 없는 그룹을 만들 수 없었다.** 그룹이 상품에서 읽히니, 상품이 없으면
 *    그룹도 없다. "그룹만 먼저 만들어 두고 상품은 나중에" 가 안 됐다.
 *
 * 그래서 그룹은 이제 **적어 둔 목록이 진짜다.** 상품에도 어느 그룹인지 함께 적는다.
 *
 * ## 차례
 *
 * 이 배열의 **순서가 곧 그룹의 차례다.** 상품 문서의 `groupOrder` 는 여기서 베낀
 * 사본이다 — 손님 화면이 상품만 읽고 정렬할 수 있게 하려고 둔 것이고,
 * 목록이 바뀔 때마다 다시 베껴 넣는다.
 */

const GROUPS_DOC = 'productGroups';

async function readNames(): Promise<string[]> {
  const doc = await db.collection(COL.settings).doc(GROUPS_DOC).get();
  if (!doc.exists) return [];
  const names = doc.data()?.names;
  if (!Array.isArray(names)) return [];
  return names.map((n) => String(n).trim()).filter(Boolean);
}

export async function writeGroupNames(names: string[]): Promise<void> {
  await db
    .collection(COL.settings)
    .doc(GROUPS_DOC)
    .set({ names, updatedAt: Date.now() }, { merge: true });
}

/**
 * 적어 둔 목록에 **상품에만 있고 목록에 빠진 그룹을 뒤에 이어 붙여** 돌려준다.
 *
 * 이 화면이 생기기 전에 만들어진 상품들은 목록에 올라간 적이 없다.
 * 읽을 때마다 기워 넣으면 따로 옮겨 심는 작업 없이도 저절로 맞아 들어간다.
 * (기운 결과는 그룹을 옮기거나 새로 만들 때 파일에 적힌다)
 */
export function mergeGroupNames(stored: string[], fromProducts: string[]): string[] {
  const merged = stored.filter((name) => name);
  for (const name of fromProducts) {
    if (name && !merged.includes(name)) merged.push(name);
  }
  return merged;
}

export async function listStoredGroupNames(): Promise<string[]> {
  return readNames();
}

/**
 * 그룹을 새로 만든다 — **상품 없이도 만들어진다.**
 * 이미 있으면 오류. 이름이 겹치면 어느 쪽에 상품을 넣는지 알 수 없다.
 */
export async function addGroupName(name: string, existing: string[]): Promise<string[]> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('그룹 이름을 넣어 주세요.');
  if (trimmed.includes(' ')) {
    throw new Error('그룹 이름은 띄어쓰기 없이 한 낱말로 넣어 주세요. (예: 대보)');
  }
  if (existing.includes(trimmed)) throw new Error(`"${trimmed}" 그룹은 이미 있습니다.`);

  const next = [...existing, trimmed];
  await writeGroupNames(next);
  return next;
}
