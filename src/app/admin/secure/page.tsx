'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { loginAsAdmin, logoutAdmin, checkAdminPermission } from '@/lib/adminAuth';
import { useAuth } from '@/contexts/AuthContext';
import AdminEmailManagerComponent from '@/components/AdminEmailManager';

export default function SecureAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailManager, setShowEmailManager] = useState(false);
  const { currentUser } = useAuth();

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdmin = async () => {
      if (currentUser) {
        const hasPermission = await checkAdminPermission(currentUser);
        setIsAdmin(hasPermission);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [currentUser]);

  // 관리자 로그인 처리
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await loginAsAdmin(email, password);
      
      if (result.success) {
        setIsAdmin(true);
        setEmail('');
        setPassword('');
      } else {
        setError(result.error || '로그인에 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 관리자 로그아웃 처리
  const handleAdminLogout = async () => {
    try {
      await logoutAdmin();
      setIsAdmin(false);
      window.location.href = '/';
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 관리자가 아닌 경우 로그인 폼 표시
  if (!isAdmin) {
    return (
      <div>
        <header className="header">
          <div className="header-content">
            <Link href="/" className="logo">
              칠갑산 알밤 농장
            </Link>
            <nav className="nav">
              <Link href="/" className="nav-link">상품</Link>
              <Link href="/purchase" className="nav-link">구매하기</Link>
              <Link href="/farm-intro" className="nav-link">농장 이야기</Link>
              <Link href="/storage" className="nav-link">저장 방법</Link>
              <Link href="/location" className="nav-link">오시는 길</Link>
              <Link href="/notice" className="nav-link">공지사항</Link>
            </nav>
          </div>
        </header>

        <div className="container">
          <div style={{
            maxWidth: '400px',
            margin: '4rem auto',
            textAlign: 'center'
          }}>
            <div className="card">
              <h1 style={{color: 'var(--primary-brown)', marginBottom: '2rem'}}>
                🔐 보안 관리자 페이지
              </h1>
              
              {error && (
                <div style={{
                  backgroundColor: '#ffebee',
                  color: '#c62828',
                  padding: '0.75rem',
                  borderRadius: '5px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleAdminLogin}>
                <div className="form-group">
                  <label className="form-label">관리자 이메일</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="admin@bamshop.com"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="비밀번호를 입력하세요"
                    required
                    disabled={loading}
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn" 
                  style={{width: '100%'}}
                  disabled={loading}
                >
                  {loading ? '로그인 중...' : '보안 로그인'}
                </button>
              </form>
              
              <div style={{marginTop: '2rem', padding: '1rem', background: 'var(--soft-beige)', borderRadius: '10px'}}>
                <h4 style={{color: 'var(--chestnut-brown)', marginBottom: '0.5rem'}}>
                  🛡️ 보안 강화 기능
                </h4>
                <ul style={{fontSize: '0.9rem', color: 'var(--text-light)', textAlign: 'left', margin: 0}}>
                  <li>Firebase Authentication 기반 인증</li>
                  <li>관리자 이메일 화이트리스트</li>
                  <li>접근 로그 자동 기록</li>
                  <li>세션 자동 관리</li>
                  <li>실시간 권한 검증</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 관리자 메인 대시보드
  return (
    <div style={{minHeight: '100vh'}}>
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
            칠갑산 알밤 농장
          </Link>
          <nav className="nav">
            <Link href="/" className="nav-link">상품</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/farm-intro" className="nav-link">농장 이야기</Link>
            <Link href="/storage" className="nav-link">저장 방법</Link>
            <Link href="/location" className="nav-link">오시는 길</Link>
            <Link href="/notice" className="nav-link">공지사항</Link>
            <Link href="/admin" className="nav-link">기존 관리자</Link>
            <Link href="/admin/secure" className="nav-link nav-link-active">
              🔐 보안 관리자
            </Link>
            <button 
              onClick={handleAdminLogout} 
              className="nav-link" 
              style={{background: 'none', border: 'none', cursor: 'pointer'}}
            >
              🚪 보안 로그아웃
            </button>
          </nav>
        </div>
      </header>

      <div className="container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem'}}>
          <h1 style={{color: 'var(--primary-brown)'}}>
            🛡️ 보안 관리자 대시보드
          </h1>
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <span style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>
              로그인: {currentUser?.email}
            </span>
            <button
              onClick={() => setShowEmailManager(true)}
              className="btn btn-secondary"
              style={{fontSize: '0.9rem'}}
            >
              👥 관리자 관리
            </button>
          </div>
        </div>

        {/* 보안 기능 카드들 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {/* 관리자 이메일 관리 */}
          <div className="card">
            <h3 style={{color: 'var(--chestnut-brown)', marginBottom: '1rem'}}>
              👥 관리자 이메일 관리
            </h3>
            <p style={{color: 'var(--text-light)', marginBottom: '1.5rem'}}>
              관리자 권한을 가진 이메일 주소를 추가하거나 제거할 수 있습니다.
            </p>
            <button
              onClick={() => setShowEmailManager(true)}
              className="btn"
              style={{width: '100%'}}
            >
              관리자 목록 관리
            </button>
          </div>

          {/* 기존 관리자 페이지 */}
          <div className="card">
            <h3 style={{color: 'var(--chestnut-brown)', marginBottom: '1rem'}}>
              📊 주문 관리 시스템
            </h3>
            <p style={{color: 'var(--text-light)', marginBottom: '1.5rem'}}>
              주문 목록, 통계, 메모 관리 등 기존 관리자 기능을 사용할 수 있습니다.
            </p>
            <Link href="/admin" className="btn" style={{width: '100%', textDecoration: 'none', textAlign: 'center', display: 'block'}}>
              기존 관리자 페이지로 이동
            </Link>
          </div>

          {/* 보안 로그 */}
          <div className="card">
            <h3 style={{color: 'var(--chestnut-brown)', marginBottom: '1rem'}}>
              📋 보안 로그
            </h3>
            <p style={{color: 'var(--text-light)', marginBottom: '1.5rem'}}>
              관리자 로그인 기록과 시스템 접근 로그를 확인할 수 있습니다.
            </p>
            <button
              className="btn btn-secondary"
              style={{width: '100%'}}
              onClick={() => alert('보안 로그 기능은 추후 구현 예정입니다.')}
            >
              로그 확인 (준비 중)
            </button>
          </div>
        </div>

        {/* 보안 상태 정보 */}
        <div className="card" style={{background: 'var(--soft-beige)'}}>
          <h3 style={{color: 'var(--chestnut-brown)', marginBottom: '1rem'}}>
            🔒 현재 보안 상태
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <strong style={{color: 'var(--text-dark)'}}>인증 방식:</strong>
              <div style={{color: 'var(--text-light)'}}>Firebase Authentication</div>
            </div>
            <div>
              <strong style={{color: 'var(--text-dark)'}}>현재 사용자:</strong>
              <div style={{color: 'var(--text-light)'}}>{currentUser?.email}</div>
            </div>
            <div>
              <strong style={{color: 'var(--text-dark)'}}>권한 수준:</strong>
              <div style={{color: 'var(--warm-orange)'}}>최고 관리자</div>
            </div>
            <div>
              <strong style={{color: 'var(--text-dark)'}}>세션 상태:</strong>
              <div style={{color: 'green'}}>활성</div>
            </div>
          </div>
        </div>
      </div>

      {/* 관리자 이메일 관리 모달 */}
      {showEmailManager && (
        <AdminEmailManagerComponent
          onClose={() => setShowEmailManager(false)}
        />
      )}
    </div>
  );
}

