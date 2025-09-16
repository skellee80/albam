'use client';

import React, { useState, useEffect } from 'react';
import { AdminEmailManager } from '@/lib/adminAuth';
import { useAuth } from '@/contexts/AuthContext';

interface AdminEmailManagerProps {
  onClose: () => void;
}

export default function AdminEmailManagerComponent({ onClose }: AdminEmailManagerProps) {
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { currentUser } = useAuth();

  // 관리자 이메일 목록 로드
  useEffect(() => {
    loadAdminEmails();
  }, []);

  const loadAdminEmails = async () => {
    setLoading(true);
    try {
      const emails = await AdminEmailManager.getAdminEmails();
      setAdminEmails(emails);
    } catch (error) {
      setError('관리자 이메일 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    if (!isValidEmail(newEmail)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    if (adminEmails.includes(newEmail)) {
      setError('이미 등록된 관리자 이메일입니다.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const success = await AdminEmailManager.addAdminEmail(
        newEmail, 
        currentUser?.email || 'unknown'
      );
      
      if (success) {
        setAdminEmails([...adminEmails, newEmail]);
        setNewEmail('');
        setSuccess('관리자 이메일이 추가되었습니다.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('관리자 이메일 추가에 실패했습니다.');
      }
    } catch (error) {
      setError('관리자 이메일 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    if (adminEmails.length <= 1) {
      setError('최소 1명의 관리자는 유지되어야 합니다.');
      return;
    }

    if (!confirm(`정말로 "${emailToRemove}"를 관리자 목록에서 제거하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const success = await AdminEmailManager.removeAdminEmail(
        emailToRemove, 
        currentUser?.email || 'unknown'
      );
      
      if (success) {
        setAdminEmails(adminEmails.filter(email => email !== emailToRemove));
        setSuccess('관리자 이메일이 제거되었습니다.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('관리자 이메일 제거에 실패했습니다.');
      }
    } catch (error) {
      setError('관리자 이메일 제거 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ color: 'var(--primary-brown)', margin: 0 }}>
            🔐 관리자 이메일 관리
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-light)'
            }}
          >
            ✕
          </button>
        </div>

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

        {success && (
          <div style={{
            backgroundColor: '#e8f5e8',
            color: '#2e7d32',
            padding: '0.75rem',
            borderRadius: '5px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {success}
          </div>
        )}

        {/* 새 관리자 이메일 추가 */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--chestnut-brown)', marginBottom: '1rem' }}>
            새 관리자 추가
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="관리자 이메일 입력"
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid var(--light-brown)',
                borderRadius: '5px',
                fontSize: '0.9rem'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
            />
            <button
              onClick={handleAddEmail}
              disabled={loading}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--chestnut-brown)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </div>

        {/* 현재 관리자 목록 */}
        <div>
          <h3 style={{ color: 'var(--chestnut-brown)', marginBottom: '1rem' }}>
            현재 관리자 목록 ({adminEmails.length}명)
          </h3>
          
          {loading && adminEmails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
              로딩 중...
            </div>
          ) : adminEmails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
              등록된 관리자가 없습니다.
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {adminEmails.map((email, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    border: '1px solid var(--light-brown)',
                    borderRadius: '5px',
                    marginBottom: '0.5rem',
                    backgroundColor: email === currentUser?.email ? 'var(--soft-beige)' : 'white'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: 'var(--text-dark)' }}>
                      {email}
                    </div>
                    {email === currentUser?.email && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--warm-orange)' }}>
                        현재 로그인된 계정
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    disabled={loading || adminEmails.length <= 1}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: adminEmails.length <= 1 ? 'var(--light-brown)' : 'var(--warm-orange)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: (loading || adminEmails.length <= 1) ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      opacity: (loading || adminEmails.length <= 1) ? 0.5 : 1
                    }}
                  >
                    제거
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--soft-beige)',
          borderRadius: '5px',
          fontSize: '0.85rem',
          color: 'var(--text-light)'
        }}>
          <strong>📌 주의사항:</strong>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem' }}>
            <li>최소 1명의 관리자는 유지되어야 합니다.</li>
            <li>추가된 이메일로 관리자 계정을 생성할 수 있습니다.</li>
            <li>변경사항은 즉시 적용됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

