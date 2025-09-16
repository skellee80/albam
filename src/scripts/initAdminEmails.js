// Firebase Admin SDK를 사용하여 관리자 이메일 초기화 스크립트
// Node.js 환경에서 실행

const admin = require('firebase-admin');

// Firebase Admin SDK 초기화 (서비스 계정 키 필요)
// const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.applicationDefault(), // 또는 서비스 계정 키 사용
  projectId: 'bamshop-ce59b'
});

const db = admin.firestore();

async function initializeAdminEmails() {
  try {
    // 관리자 이메일 목록 설정
    const adminEmails = [
      'admin@bamshop.com',
      'manager@bamshop.com',
      'owner@bamshop.com'
    ];

    // settings 컬렉션에 adminEmails 문서 생성
    await db.collection('settings').doc('adminEmails').set({
      emails: adminEmails,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    });

    console.log('✅ 관리자 이메일 초기화 완료');
    console.log('설정된 관리자 이메일:', adminEmails);
    
  } catch (error) {
    console.error('❌ 관리자 이메일 초기화 실패:', error);
  }
}

// 스크립트 실행
initializeAdminEmails();

