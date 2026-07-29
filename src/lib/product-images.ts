import 'server-only';

import { readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * `public/products/` 에 들어 있는 사진 파일 목록.
 *
 * 관리자가 사진 주소를 타이핑하는 대신 **눌러서 고르게** 하려고 읽는다.
 * 주소를 손으로 적으면 오타 한 글자에 깨진 그림이 뜨는데, 아버지는 그게
 * 왜 안 나오는지 알 방법이 없다.
 *
 * 목록은 폴더를 그때그때 읽는다. 빌드 때 박아 두면 사진을 넣고 배포해도
 * 목록을 다시 만들기 전에는 안 보인다.
 */

const PRODUCTS_DIR = path.join(process.cwd(), 'public', 'products');

/** 브라우저가 그릴 수 있는 것만. 관리자 화면에 쓰레기 파일이 뜨지 않게 한다. */
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);

export type ProductImage = {
  /** 화면에 쓰는 주소 ("/products/대보.jpg") */
  url: string;
  /** 아버지가 알아볼 이름 ("대보") */
  label: string;
};

export async function listProductImages(): Promise<ProductImage[]> {
  try {
    const files = await readdir(PRODUCTS_DIR);

    return files
      .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .map((name) => ({
        url: `/products/${name}`,
        label: name.replace(/\.[^.]+$/, ''),
      }));
  } catch (err) {
    // 폴더를 못 읽어도 화면은 떠야 한다. 고르기만 못 할 뿐 주소는 직접 적을 수 있다.
    console.error('[listProductImages]', err);
    return [];
  }
}
