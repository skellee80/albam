'use client';

import { useState, useEffect } from 'react';
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

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  provider: 'email' | 'google';
  createdAt: string;
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    address: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  // 현재 사용자 확인
  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error('사용자 데이터 파싱 오류:', error);
      }
    }
  }, []);

  // 로그아웃 처리
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setShowLogoutModal(false);
  };

  // 비밀번호 찾기 처리
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      alert('이메일을 입력해주세요.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      alert('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    try {
      // 등록된 사용자 확인
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const user = existingUsers.find((u: User) => u.email === resetEmail);
      
      if (!user) {
        alert('등록되지 않은 이메일입니다.');
        return;
      }

      // 임시 비밀번호 생성 (6자리 숫자)
      const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 새 비밀번호 저장
      localStorage.setItem(`password_${user.id}`, tempPassword);
      
      // 실제로는 이메일 발송 서비스를 사용해야 하지만, 
      // 현재는 alert로 임시 비밀번호를 보여줍니다
      alert(`임시 비밀번호가 발급되었습니다.\n\n임시 비밀번호: ${tempPassword}\n\n로그인 후 반드시 비밀번호를 변경해주세요.`);
      
      setShowPasswordReset(false);
      setResetEmail('');
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

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

  // 이메일 유효성 검사
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 비밀번호 유효성 검사
  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다.';
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = '이름을 입력해주세요.';
      }

      if (!formData.phone) {
        newErrors.phone = '전화번호를 입력해주세요.';
      } else if (!formData.phone.match(/^01[0-9]-[0-9]{3,4}-[0-9]{4}$/)) {
        newErrors.phone = '올바른 전화번호 형식을 입력해주세요. (010-1234-5678)';
      }

      if (!formData.address) {
        newErrors.address = '주소를 입력해주세요.';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 이메일 로그인/가입 처리
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // 기존 사용자 데이터 가져오기
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');

      if (isLogin) {
        // 로그인 처리
        const user = existingUsers.find((u: User) => 
          u.email === formData.email && u.provider === 'email'
        );

        if (!user) {
          setErrors({ email: '등록되지 않은 이메일입니다.' });
          return;
        }

        // 실제로는 비밀번호 해시 비교를 해야 하지만, 데모용으로 간단히 처리
        const storedPassword = localStorage.getItem(`password_${user.id}`);
        if (storedPassword !== formData.password) {
          setErrors({ password: '비밀번호가 일치하지 않습니다.' });
          return;
        }

        // 로그인 성공
        localStorage.setItem('currentUser', JSON.stringify(user));
        setShowLoginSuccessModal(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        // 회원가입 처리
        const existingUser = existingUsers.find((u: User) => u.email === formData.email);
        if (existingUser) {
          setErrors({ email: '이미 등록된 이메일입니다.' });
          return;
        }

        // 새 사용자 생성
        const newUser: User = {
          id: Date.now().toString(),
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          provider: 'email',
          createdAt: new Date().toISOString()
        };

        // 사용자 정보 저장
        existingUsers.push(newUser);
        localStorage.setItem('users', JSON.stringify(existingUsers));
        localStorage.setItem(`password_${newUser.id}`, formData.password);
        localStorage.setItem('currentUser', JSON.stringify(newUser));

        setShowLoginSuccessModal(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (error) {
      console.error('인증 오류:', error);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // 전화번호 필드인 경우 포맷팅 적용
    if (name === 'phone') {
      const formattedValue = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

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
            {currentUser ? (
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
                  안녕하세요, {currentUser.name}님! ✨
                </div>
                <Link href="/mypage" className="nav-link" style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)', 
                  fontWeight: 'bold',
                  borderRadius: '20px',
                  padding: '0.4rem 0.8rem',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  👤 마이페이지
                </Link>
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
            ) : (
              <Link href="/auth" className="nav-link nav-link-active" style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)', 
                fontWeight: 'bold',
                borderRadius: '20px',
                padding: '0.4rem 0.8rem',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(10px)'
              }}>
                🔐 로그인
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container" style={{maxWidth: '400px', margin: '2rem auto'}}>
          <div className="card" style={{padding: '2rem'}}>
            <h1 style={{textAlign: 'center', marginBottom: '2rem', color: 'var(--chestnut-brown)'}}>
              {isLogin ? '로그인' : '회원가입'}
            </h1>

            <form onSubmit={handleEmailAuth}>
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label className="form-label">이름 *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="이름을 입력하세요"
                      style={{
                        border: errors.name ? '1px solid #ff4444' : undefined
                      }}
                    />
                    {errors.name && (
                      <div style={{
                        color: '#ff4444',
                        fontSize: '0.8rem',
                        marginTop: '0.25rem'
                      }}>
                        {errors.name}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">전화번호 *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="010-1234-5678"
                      style={{
                        border: errors.phone ? '1px solid #ff4444' : undefined
                      }}
                    />
                    {errors.phone && (
                      <div style={{
                        color: '#ff4444',
                        fontSize: '0.8rem',
                        marginTop: '0.25rem'
                      }}>
                        {errors.phone}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">주소 *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="주소를 입력하세요"
                      rows={3}
                      style={{
                        border: errors.address ? '1px solid #ff4444' : undefined,
                        resize: 'vertical',
                        minHeight: '80px'
                      }}
                    />
                    {errors.address && (
                      <div style={{
                        color: '#ff4444',
                        fontSize: '0.8rem',
                        marginTop: '0.25rem'
                      }}>
                        {errors.address}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">이메일 *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="이메일을 입력하세요"
                  style={{
                    border: errors.email ? '1px solid #ff4444' : undefined
                  }}
                />
                {errors.email && (
                  <div style={{
                    color: '#ff4444',
                    fontSize: '0.8rem',
                    marginTop: '0.25rem'
                  }}>
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">비밀번호 *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="비밀번호를 입력하세요"
                  style={{
                    border: errors.password ? '1px solid #ff4444' : undefined
                  }}
                />
                {errors.password && (
                  <div style={{
                    color: '#ff4444',
                    fontSize: '0.8rem',
                    marginTop: '0.25rem'
                  }}>
                    {errors.password}
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label className="form-label">비밀번호 확인 *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="비밀번호를 다시 입력하세요"
                    style={{
                      border: errors.confirmPassword ? '1px solid #ff4444' : undefined
                    }}
                  />
                  {errors.confirmPassword && (
                    <div style={{
                      color: '#ff4444',
                      fontSize: '0.8rem',
                      marginTop: '0.25rem'
                    }}>
                      {errors.confirmPassword}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn"
                disabled={isLoading}
                style={{
                  width: '100%',
                  marginBottom: '1rem',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
              </button>

              {isLogin && (
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'transparent',
                    color: 'var(--chestnut-brown)',
                    border: '1px solid var(--chestnut-light)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    marginBottom: '1rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--warm-beige)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  🔑 비밀번호를 잊으셨나요?
                </button>
              )}
            </form>



            <div style={{textAlign: 'center'}}>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({
                    email: '',
                    password: '',
                    confirmPassword: '',
                    name: '',
                    phone: '',
                    address: ''
                  });
                  setErrors({});
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--chestnut-brown)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 로그인 성공 모달 */}
      {showLoginSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">🎉</div>
            <div className="modal-title">로그인 성공!</div>
            <div className="modal-message">
              환영합니다!<br/>
              잠시 후 홈페이지로 이동합니다.
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 찾기 모달 */}
      {showPasswordReset && (
        <div className="modal-overlay" onClick={() => setShowPasswordReset(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🔑</div>
            <div className="modal-title">비밀번호 찾기</div>
            <div className="modal-message">
              가입하신 이메일 주소를 입력해주세요.<br/>
              임시 비밀번호를 발급해드립니다.
            </div>
            <form onSubmit={handlePasswordReset} style={{marginTop: '1rem'}}>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="이메일 주소"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
                required
              />
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button 
                  type="button"
                  onClick={() => setShowPasswordReset(false)}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    background: '#f5f5f5',
                    color: '#666',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button 
                  type="submit"
                  className="modal-button"
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    fontSize: '1rem'
                  }}
                >
                  발급받기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </>
  );
}
