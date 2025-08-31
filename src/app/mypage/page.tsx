'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  provider: 'email' | 'google';
  createdAt: string;
}

interface OrderData {
  name: string;
  recipientName: string;
  phone: string;
  recipientPhone: string;
  address: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  orderDate: string;
  orderNumber: string;
  isShipped?: boolean;
  isPaid?: boolean;
  isExchanged?: boolean;
  isRefunded?: boolean;
  note?: string;
}

export default function MyPage() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { currentUser, userData, logout, updateUserData, deleteAccount } = useAuth();
  const [userOrders, setUserOrders] = useState<OrderData[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string) => {
    const numbersOnly = value.replace(/[^0-9]/g, '');
    
    if (numbersOnly.length === 0) {
      return '';
    }
    
    if (numbersOnly.length <= 3) {
      return numbersOnly;
    } else if (numbersOnly.length <= 7) {
      return numbersOnly.substring(0, 3) + '-' + numbersOnly.substring(3);
    } else {
      return numbersOnly.substring(0, 3) + '-' + numbersOnly.substring(3, 7) + '-' + numbersOnly.substring(7, 11);
    }
  };

  // 사용자 주문 내역 로드 함수
  const loadUserOrders = async (userData: any) => {
    try {
      // Firebase Firestore에서 주문 내역 로드 시도
      if (currentUser) {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(ordersQuery);
        const firestoreOrders: OrderData[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          firestoreOrders.push({
            name: data.name,
            recipientName: data.recipientName,
            phone: data.phone,
            recipientPhone: data.recipientPhone,
            address: data.address,
            productId: data.productId,
            productName: data.productName,
            quantity: data.quantity,
            totalPrice: data.totalPrice,
            orderDate: data.orderDate,
            orderNumber: data.orderNumber,
            isShipped: data.isShipped || false,
            isPaid: data.isPaid || false,
            isExchanged: data.isExchanged || false,
            isRefunded: data.isRefunded || false,
            note: data.note || ''
          });
        });
        
        if (firestoreOrders.length > 0) {
          setUserOrders(firestoreOrders);
          return;
        }
      }
    } catch (error) {
      console.warn('Firestore 주문 내역 로드 실패, localStorage 사용:', error);
    }
    
    // Firestore에서 로드 실패하거나 주문이 없는 경우 localStorage에서 로드
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const userOrderList = orders.filter((order: OrderData) => 
      order.name === userData.name || order.phone === userData.phone
    );
    setUserOrders(userOrderList);
  };

  // 사용자 데이터 로드 및 폼 초기화
  useEffect(() => {
    if (userData) {
      setEditForm({
        name: userData.name || '',
        phone: userData.phone || '',
        address: userData.address || ''
      });
      
      // 사용자 주문 내역 로드
      loadUserOrders(userData);
    }
  }, [userData, currentUser]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!editForm.name.trim()) {
      newErrors.name = '이름을 입력해주세요.';
    }

    if (!editForm.phone.trim()) {
      newErrors.phone = '전화번호를 입력해주세요.';
    } else if (!editForm.phone.match(/^01[0-9]-[0-9]{3,4}-[0-9]{4}$/)) {
      newErrors.phone = '올바른 전화번호 형식을 입력해주세요.';
    }

    if (!editForm.address.trim()) {
      newErrors.address = '주소를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveInfo = async () => {
    if (!validateForm() || !currentUser || !userData) return;

    setIsLoading(true);

    try {
      // Firebase Firestore에서 사용자 정보 업데이트
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      const updatedData = {
        name: editForm.name,
        phone: editForm.phone,
        address: editForm.address
      };

      await updateDoc(userDocRef, updatedData);

      // Firebase Auth 프로필 업데이트
      const { updateProfile } = await import('firebase/auth');
      await updateProfile(currentUser, { displayName: editForm.name });

      // AuthContext의 userData 실시간 업데이트
      updateUserData(updatedData);

      // 임시로 localStorage도 업데이트 (기존 주문 데이터 호환성을 위해)
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const updatedUsers = users.map((user: any) =>
        user.email === userData.email ? { ...user, ...updatedData } : user
      );
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      setIsEditing(false);
      setShowSuccessModal(true);
      
      // 성공 모달 후 자동으로 닫기
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);

    } catch (error) {
      console.error('정보 수정 오류:', error);
      setShowErrorModal(true);
      setTimeout(() => {
        setShowErrorModal(false);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      const formattedValue = formatPhoneNumber(value);
      setEditForm(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const getOrderStatusText = (order: OrderData) => {
    if (order.isRefunded) return '환불완료';
    if (order.isExchanged) return '교환완료';
    if (order.isShipped) return '출고완료';
    if (order.isPaid) return '입금완료';
    return '입금대기';
  };

  const getOrderStatusColor = (order: OrderData) => {
    if (order.isRefunded) return '#f44336';
    if (order.isExchanged) return '#9c27b0';
    if (order.isShipped) return '#4caf50';
    if (order.isPaid) return '#2196f3';
    return '#ff9800';
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
      window.location.href = '/';
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 회원 탈퇴 처리
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    
    try {
      await deleteAccount();
      alert('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
      window.location.href = '/';
    } catch (error: any) {
      console.error('회원 탈퇴 오류:', error);
      
      let errorMessage = '회원 탈퇴 중 오류가 발생했습니다.';
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = '보안을 위해 최근에 로그인한 사용자만 탈퇴할 수 있습니다. 다시 로그인 후 시도해주세요.';
      }
      
      alert(errorMessage);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentUser || !userData) {
    return <div>로딩 중...</div>;
  }

  return (
    <>
      <header className="header">
        <div className="container">
          <Link href="/" className="logo">
            칠갑산 알밤 농장
          </Link>
          <nav className="nav">
            <Link href="/" className="nav-link">홈</Link>
            <Link href="/intro" className="nav-link">농장 소개</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/storage" className="nav-link">저장 방법</Link>
            <Link href="/notice" className="nav-link">공지사항</Link>
            <Link href="/admin" className="nav-link">주문 현황</Link>
            <Link href="/mypage" className="nav-link nav-link-active">마이페이지</Link>
            {currentUser && userData && (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <div style={{
                  color: 'white', 
                  fontSize: '0.85rem', 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  안녕하세요, {userData.name}님! ✨
                </div>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="nav-link"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer',
                    color: 'white',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  로그아웃
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container" style={{maxWidth: '800px', margin: '2rem auto'}}>
          <div className="card" style={{padding: '2rem'}}>
            <h1 style={{textAlign: 'center', marginBottom: '2rem', color: 'var(--chestnut-brown)'}}>
              마이페이지
            </h1>

            {/* 탭 메뉴 */}
            <div style={{
              display: 'flex',
              borderBottom: '2px solid var(--soft-beige)',
              marginBottom: '2rem'
            }}>
              <button
                onClick={() => setActiveTab('info')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: 'none',
                  background: activeTab === 'info' ? 'var(--chestnut-brown)' : 'transparent',
                  color: activeTab === 'info' ? 'white' : 'var(--chestnut-brown)',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0'
                }}
              >
                내 정보
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: 'none',
                  background: activeTab === 'orders' ? 'var(--chestnut-brown)' : 'transparent',
                  color: activeTab === 'orders' ? 'white' : 'var(--chestnut-brown)',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0'
                }}
              >
                구매 내역 ({userOrders.length})
              </button>
            </div>

            {/* 내 정보 탭 */}
            {activeTab === 'info' && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2rem'
                }}>
                  <h2 style={{color: 'var(--chestnut-brown)'}}>내 정보</h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn"
                      style={{padding: '0.5rem 1rem'}}
                    >
                      정보 수정
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <div className="form-group">
                      <label className="form-label">이름 *</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleInputChange}
                        className="form-input"
                        style={{
                          border: errors.name ? '1px solid #ff4444' : undefined
                        }}
                      />
                      {errors.name && (
                        <div style={{color: '#ff4444', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                          {errors.name}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">이메일</label>
                      <input
                        type="email"
                        value={currentUser.email || ''}
                        className="form-input"
                        disabled
                        style={{background: '#f5f5f5', color: '#666'}}
                      />
                      <small style={{color: '#666', fontSize: '0.8rem'}}>
                        이메일은 변경할 수 없습니다.
                      </small>
                    </div>

                    <div className="form-group">
                      <label className="form-label">전화번호 *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="010-1234-5678"
                        style={{
                          border: errors.phone ? '1px solid #ff4444' : undefined
                        }}
                      />
                      {errors.phone && (
                        <div style={{color: '#ff4444', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                          {errors.phone}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">주소 *</label>
                      <textarea
                        name="address"
                        value={editForm.address}
                        onChange={handleInputChange}
                        className="form-input"
                        rows={3}
                        style={{
                          border: errors.address ? '1px solid #ff4444' : undefined,
                          resize: 'vertical'
                        }}
                      />
                      {errors.address && (
                        <div style={{color: '#ff4444', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                          {errors.address}
                        </div>
                      )}
                    </div>

                    <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditForm({
                            name: userData?.name || '',
                            phone: userData?.phone || '',
                            address: userData?.address || ''
                          });
                          setErrors({});
                        }}
                        className="btn btn-secondary"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSaveInfo}
                        disabled={isLoading}
                        className="btn"
                        style={{ opacity: isLoading ? 0.6 : 1 }}
                      >
                        {isLoading ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--soft-beige)',
                    padding: '1.5rem',
                    borderRadius: '10px'
                  }}>
                    <div style={{marginBottom: '1rem'}}>
                      <strong style={{color: 'var(--chestnut-brown)'}}>이름:</strong>
                      <span style={{marginLeft: '1rem'}}>{userData?.name || '등록되지 않음'}</span>
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                      <strong style={{color: 'var(--chestnut-brown)'}}>이메일:</strong>
                      <span style={{marginLeft: '1rem'}}>{currentUser.email}</span>
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                      <strong style={{color: 'var(--chestnut-brown)'}}>전화번호:</strong>
                      <span style={{marginLeft: '1rem'}}>{userData?.phone || '등록되지 않음'}</span>
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                      <strong style={{color: 'var(--chestnut-brown)'}}>주소:</strong>
                      <span style={{marginLeft: '1rem'}}>{userData?.address || '등록되지 않음'}</span>
                    </div>
                    <div>
                      <strong style={{color: 'var(--chestnut-brown)'}}>가입일:</strong>
                      <span style={{marginLeft: '1rem'}}>
                        {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('ko-KR') : '등록되지 않음'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 회원 탈퇴 버튼 */}
                {!isEditing && (
                  <div style={{
                    marginTop: '2rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid var(--soft-beige)',
                    textAlign: 'center'
                  }}>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      style={{
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#cc3333';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#ff4444';
                      }}
                    >
                      회원 탈퇴
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 구매 내역 탭 */}
            {activeTab === 'orders' && (
              <div>
                <h2 style={{color: 'var(--chestnut-brown)', marginBottom: '2rem'}}>
                  구매 내역 ({userOrders.length}건)
                </h2>

                {userOrders.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--text-light)'
                  }}>
                    <p style={{fontSize: '1.1rem', marginBottom: '1rem'}}>구매 내역이 없습니다.</p>
                    <Link href="/purchase" className="btn">
                      상품 구매하기
                    </Link>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {userOrders.map((order, index) => (
                      <div
                        key={index}
                        style={{
                          border: '1px solid var(--soft-beige)',
                          borderRadius: '10px',
                          padding: '1.5rem',
                          background: 'white'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '1rem'
                        }}>
                          <div>
                            <strong style={{color: 'var(--chestnut-brown)', fontSize: '1.1rem'}}>
                              주문번호: {order.orderNumber}
                            </strong>
                          </div>
                          <div style={{
                            background: getOrderStatusColor(order),
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                          }}>
                            {getOrderStatusText(order)}
                          </div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div>
                            <strong>주문일:</strong> {order.orderDate}
                          </div>
                          <div>
                            <strong>상품:</strong> {order.productName}
                          </div>
                          <div>
                            <strong>수량:</strong> {order.quantity}개
                          </div>
                          <div>
                            <strong>금액:</strong> {order.totalPrice.toLocaleString()}원
                          </div>
                        </div>

                        <div style={{
                          borderTop: '1px solid var(--soft-beige)',
                          paddingTop: '1rem',
                          color: 'var(--text-light)',
                          fontSize: '0.9rem'
                        }}>
                          <div><strong>수취인:</strong> {order.recipientName}</div>
                          <div><strong>배송지:</strong> {order.address}</div>
                        </div>
                      </div>
                    ))}
                    
                    {/* 입금 안내사항 */}
                    <div style={{
                      background: 'linear-gradient(135deg, #fff8f0 0%, #fef5e7 100%)',
                      border: '1px solid #f0c674',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      marginTop: '1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '1.1rem',
                        marginBottom: '0.5rem',
                        color: '#d68910'
                      }}>
                        ℹ️ 입금 확인 안내
                      </div>
                      <p style={{
                        color: '#8b4513',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        margin: 0
                      }}>
                        입금 대기 상태는 입금 완료 후 하루 체크 소요 시간이 발생 할 수 있습니다.<br/>
                        확인 후 입금 완료로 표기 됩니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 세련된 로그아웃 모달 */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🌰</div>
            <div className="modal-title">안전하게 로그아웃</div>
            <div className="modal-message">
              소중한 시간을 함께해 주셔서 감사합니다.<br/>
              다음에 또 만나요!
            </div>
            <button 
              className="modal-button"
              onClick={handleLogout}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 정보 수정 성공 모달 */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">✨</div>
            <div className="modal-title">정보 수정 완료!</div>
            <div className="modal-message">
              회원 정보가 성공적으로 수정되었습니다.<br/>
              변경된 정보가 즉시 반영됩니다.
            </div>
          </div>
        </div>
      )}

      {/* 정보 수정 오류 모달 */}
      {showErrorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">❌</div>
            <div className="modal-title">수정 실패</div>
            <div className="modal-message">
              정보 수정 중 오류가 발생했습니다.<br/>
              잠시 후 다시 시도해주세요.
            </div>
            <button 
              className="modal-button"
              onClick={() => setShowErrorModal(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 회원 탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⚠️</div>
            <div className="modal-title">회원 탈퇴</div>
            <div className="modal-message">
              정말로 회원 탈퇴를 하시겠습니까?<br/>
              <strong style={{color: '#ff4444'}}>탈퇴 후에는 모든 데이터가 삭제되며 복구할 수 없습니다.</strong><br/>
              구매 내역과 개인정보가 모두 삭제됩니다.
            </div>
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem'}}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                style={{
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                취소
              </button>
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                style={{
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                {isDeleting ? '탈퇴 처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
