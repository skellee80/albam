'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  images?: string[]; // 사진 URL 배열 (옵션)
  isPinned?: boolean; // 상단 고정 여부
}

export default function Notice() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', content: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // 관리자 세션 확인
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdmin(true);
    }
  }, []);

  // 공지사항 로드
  useEffect(() => {
    const savedNotices = localStorage.getItem('notices');
    if (savedNotices) {
      setNotices(JSON.parse(savedNotices));
    } else {
      // 기본 공지사항
      const defaultNotices: Notice[] = [
        {
          id: '1',
          title: '🍂 2024년 가을 수확 시즌 오픈!',
          content: `안녕하세요, 청양 칠갑산 알밤 농장입니다.

올해도 어김없이 가을 수확 시즌이 돌아왔습니다!

📅 수확 시기: 2024년 9월 15일부터
🌰 올해 알밤 특징:
- 여름 가뭄에도 불구하고 우수한 품질 유지
- 당도가 작년보다 15% 향상
- 크기가 균일하고 모양이 예쁨

많은 관심과 주문 부탁드립니다.
감사합니다.`,
          date: '2024-09-15',
          author: '이기영'
        },
        {
          id: '2',
          title: '💧 올해 알밤 품질 안내',
          content: `올해 청양 칠갑산 알밤 농장의 알밤 품질에 대해 안내드립니다.

🌿 재배 환경:
- 무농약 재배 철저히 준수
- 자연 방제법으로 친환경 관리
- 30년간 축적된 노하우로 최고 품질 구현

📊 품질 검사 결과:
- 당도: 평균 16.5 브릭스 (작년 대비 15% 향상)
- 크기: 평균 직경 3.2cm (대형 규격)
- 수분: 40-45% (최적 수분 함량)
- 저장성: 냉장 보관 시 3개월 이상

고객 여러분께 최고 품질의 알밤을 전달하기 위해 
매일 품질 검사를 실시하고 있습니다.

안심하고 주문해주세요!`,
          date: '2024-09-10',
          author: '이기영'
        }
      ];
      setNotices(defaultNotices);
      localStorage.setItem('notices', JSON.stringify(defaultNotices));
    }
  }, []);

  // 관리자 로그인
  const handleAdminLogin = () => {
    if (adminPassword === 'lky9287') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      localStorage.setItem('adminSession', 'true');

    } else {
      alert('비밀번호가 올바르지 않습니다.');
      setAdminPassword('');
    }
  };

  // 관리자 로그아웃
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setShowAddForm(false);
    localStorage.removeItem('adminSession');
    alert('관리자 모드를 종료합니다.');
  };

  // 파일 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 파일 크기 및 타입 검사
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }
      }
      
    setSelectedFiles(prev => [...prev, ...files]);
      
      // 미리보기 생성
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 이미지 제거 (새 공지)
  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 편집용 파일 처리
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 파일 크기 및 타입 검사
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }
    }

    setEditFiles(prev => [...prev, ...files]);
    
    // 미리보기 생성
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 이미지 제거 (편집)
  const removeEditImage = (index: number) => {
    setEditFiles(prev => prev.filter((_, i) => i !== index));
    setEditImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 새 공지사항 추가
  const handleAddNotice = () => {
    if (!newNotice.title.trim() || !newNotice.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const notice: Notice = {
      id: Date.now().toString(),
      title: newNotice.title,
      content: newNotice.content,
      date: new Date().toLocaleDateString('ko-KR'),
      author: '이기영',
      images: imagePreviews.length > 0 ? imagePreviews : undefined
    };

    const updatedNotices = [notice, ...notices];
    setNotices(updatedNotices);
    localStorage.setItem('notices', JSON.stringify(updatedNotices));
    
    setNewNotice({ title: '', content: '' });
    setSelectedFiles([]);
    setImagePreviews([]);
    setShowAddForm(false);
  };

  // 공지사항 삭제
  const handleDeleteNotice = (id: string) => {
    if (confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      const updatedNotices = notices.filter(notice => notice.id !== id);
      setNotices(updatedNotices);
      localStorage.setItem('notices', JSON.stringify(updatedNotices));
      setSelectedNotice(null);
    }
  };

  // 상단 고정 토글
  const togglePinNotice = (id: string) => {
    const updatedNotices = notices.map(notice => 
      notice.id === id ? { ...notice, isPinned: !notice.isPinned } : notice
    );
    setNotices(updatedNotices);
    localStorage.setItem('notices', JSON.stringify(updatedNotices));
  };

  // 공지사항 편집
  const handleEditNotice = (notice: Notice) => {
    setEditingNotice({...notice});
    setEditImagePreviews(notice.images || []);
  };

  // 공지사항 업데이트
  const handleUpdateNotice = () => {
    if (!editingNotice?.title.trim() || !editingNotice?.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const updatedNotice = { 
      ...editingNotice, 
      images: editImagePreviews.length > 0 ? editImagePreviews : undefined 
    };

    const updatedNotices = notices.map(notice => 
      notice.id === editingNotice.id ? updatedNotice : notice
    );
    setNotices(updatedNotices);
    localStorage.setItem('notices', JSON.stringify(updatedNotices));
    
    // 현재 선택된 공지사항이 편집된 공지사항이면 상세보기도 업데이트
    if (selectedNotice && selectedNotice.id === editingNotice.id) {
      setSelectedNotice(updatedNotice);
    }
    
    setEditingNotice(null);
    setEditFiles([]);
    setEditImagePreviews([]);
  };

  // 공지사항 정렬 (고정된 것이 먼저)
  const sortedNotices = [...notices].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedNotices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotices = sortedNotices.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
칠갑산 알밤 농장
          </Link>
          <nav className="nav">
            <Link href="/" className="nav-link">홈</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/farm-intro" className="nav-link">농장 소개</Link>
            <Link href="/production" className="nav-link">생산 과정</Link>
            <Link href="/storage" className="nav-link">저장 방법</Link>
            <Link href="/location" className="nav-link">오시는 길</Link>
            <Link href="/notice" className="nav-link nav-link-active">농장 공지사항</Link>
            {isAdmin && (
              <>
                <Link href="/admin" className="nav-link" style={{background: 'rgba(255, 255, 255, 0.2)', fontWeight: 'bold'}}>
                  📊 주문 현황
                </Link>
                <button onClick={() => {
                  setIsAdmin(false);
                  localStorage.removeItem('adminSession');
                }} className="nav-link" style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer'}}>
                  관리자 로그아웃
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem'}}>
          <h1 style={{color: 'var(--primary-brown)'}}>
            📢 농장 공지사항
          </h1>
          
          {/* 관리자 버튼 */}
          <div>
            {!isAdmin ? (
              <button 
                onClick={() => setShowAdminLogin(true)} 
                className="btn btn-secondary"
              >
                관리자
              </button>
            ) : (
              <button 
                onClick={() => setShowAddForm(true)} 
                className="btn"
              >
                공지 작성
              </button>
            )}
          </div>
        </div>

        {/* 관리자 로그인 모달 */}
        {showAdminLogin && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="card" style={{width: '400px', margin: 0}}>
              <h2>🔐 관리자 로그인</h2>
              <div className="form-group">
                <label className="form-label">관리자 비밀번호</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="form-input"
                  placeholder="비밀번호를 입력하세요"
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
              </div>
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button onClick={() => setShowAdminLogin(false)} className="btn btn-secondary">
                  취소
                </button>
                <button onClick={handleAdminLogin} className="btn">
                  로그인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 공지사항 작성 폼 */}
        {showAddForm && isAdmin && (
          <div className="admin-panel" style={{marginBottom: '3rem'}}>
            <h2>✍️ 새 공지사항 작성</h2>
            <div className="form-group">
              <label className="form-label">제목</label>
              <input
                type="text"
                value={newNotice.title}
                onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
                className="form-input"
                placeholder="공지사항 제목을 입력하세요"
              />
            </div>
            <div className="form-group">
              <label className="form-label">내용</label>
              <textarea
                value={newNotice.content}
                onChange={(e) => setNewNotice({...newNotice, content: e.target.value})}
                className="form-input form-textarea"
                placeholder="공지사항 내용을 입력하세요"
                rows={10}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">사진 첨부 (선택)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="form-input"
                style={{padding: '0.5rem'}}
              />
              <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem'}}>
                * 이미지 파일만 업로드 가능 (최대 5MB)
              </p>
              
              {imagePreviews.length > 0 && (
                <div style={{marginTop: '1rem'}}>
                  <p style={{fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>미리보기:</p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '1rem'
                  }}>
                    {imagePreviews.map((preview, index) => (
                      <div key={index} style={{position: 'relative'}}>
                        <div style={{
                    border: '2px solid var(--chestnut-light)',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <img 
                            src={preview} 
                            alt={`미리보기 ${index + 1}`} 
                      style={{
                        width: '100%',
                              height: '150px',
                              objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                          onClick={() => removeImage(index)}
                    style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: '#f44336',
                      color: 'white',
                      border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ×
                  </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
              <button onClick={() => {
                setShowAddForm(false);
                setSelectedFiles([]);
                setImagePreviews([]);
                setNewNotice({ title: '', content: '' });
              }} className="btn btn-secondary">
                취소
              </button>
              <button onClick={handleAddNotice} className="btn">
                등록
              </button>
            </div>
          </div>
        )}

        {/* 공지사항 편집 모달 */}
        {editingNotice && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="card" style={{width: '600px', margin: 0, maxHeight: '80vh', overflow: 'auto'}}>
              <h2>✏️ 공지사항 편집</h2>
              
              <div className="form-group">
                <label className="form-label">제목</label>
                <input
                  type="text"
                  value={editingNotice.title}
                  onChange={(e) => setEditingNotice({...editingNotice, title: e.target.value})}
                  className="form-input"
                  placeholder="공지사항 제목을 입력하세요"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">내용</label>
                <textarea
                  value={editingNotice.content}
                  onChange={(e) => setEditingNotice({...editingNotice, content: e.target.value})}
                  className="form-input form-textarea"
                  placeholder="공지사항 내용을 입력하세요"
                  rows={10}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">사진 첨부 (선택)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEditFileChange}
                  className="form-input"
                  style={{padding: '0.5rem'}}
                />
                <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem'}}>
                  * 이미지 파일만 업로드 가능 (최대 5MB)
                </p>
                
                {editImagePreviews.length > 0 && (
                  <div style={{marginTop: '1rem'}}>
                    <p style={{fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>미리보기:</p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '1rem'
                    }}>
                      {editImagePreviews.map((preview, index) => (
                        <div key={index} style={{position: 'relative'}}>
                          <div style={{
                            border: '2px solid var(--chestnut-light)',
                            borderRadius: '10px',
                            overflow: 'hidden'
                          }}>
                            <img 
                              src={preview} 
                              alt={`미리보기 ${index + 1}`} 
                              style={{
                                width: '100%',
                                height: '150px',
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEditImage(index)}
                            style={{
                              position: 'absolute',
                              top: '5px',
                              right: '5px',
                              background: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button 
                  onClick={() => {
                    setEditingNotice(null);
                    setSelectedFiles([]);
                    setImagePreviews([]);
                  }} 
                  className="btn btn-secondary"
                >
                  취소
                </button>
                <button onClick={handleUpdateNotice} className="btn">
                  수정 완료
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="notice-layout">
          {/* 공지사항 목록 */}
          <div className={`card ${selectedNotice ? 'notice-list-hidden' : ''}`}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h2>📋 공지사항 목록</h2>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <label style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>페이지당:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0.3rem',
                    border: '1px solid var(--chestnut-light)',
                    borderRadius: '5px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value={5}>5개</option>
                  <option value={10}>10개</option>
                  <option value={20}>20개</option>
                  <option value={50}>50개</option>
                </select>
              </div>
            </div>
            
            {notices.length === 0 ? (
              <p style={{textAlign: 'center', color: 'var(--text-light)', margin: '2rem 0'}}>
                등록된 공지사항이 없습니다.
              </p>
            ) : (
              <>
              <div style={{marginTop: '1rem'}}>
                  {currentNotices.map((notice, index) => (
                  <div 
                    key={notice.id}
                    onClick={() => setSelectedNotice(notice)}
                    style={{
                      padding: '1rem',
                      border: selectedNotice?.id === notice.id ? '2px solid var(--warm-orange)' : '1px solid var(--light-brown)',
                      borderRadius: '10px',
                      marginBottom: '1rem',
                      cursor: 'pointer',
                      background: selectedNotice?.id === notice.id ? 'var(--soft-beige)' : notice.isPinned ? 'linear-gradient(135deg, #fff9e6 0%, #fff3d3 100%)' : 'white',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                  >
                    {notice.isPinned && (
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        background: '#ff9800',
                        color: 'white',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        📌 고정
                      </div>
                    )}
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <div style={{flex: 1, marginTop: notice.isPinned ? '1.5rem' : '0'}}>
                        <h4 style={{
                          color: 'var(--primary-brown)',
                          marginBottom: '0.5rem',
                          fontSize: '1rem'
                        }}>
                          {notice.title}
                          {notice.images && notice.images.length > 0 && <span style={{marginLeft: '0.5rem', fontSize: '1rem'}}>📷</span>}
                        </h4>
                        <p style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-light)',
                          margin: 0
                        }}>
                          {notice.date} | {notice.author}
                        </p>
                      </div>
                      
                      {isAdmin && (
                        <div style={{display: 'flex', gap: '0.5rem', flexDirection: 'column'}}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinNotice(notice.id);
                            }}
                            className={`btn-icon btn-icon-pin ${notice.isPinned ? 'pinned' : ''}`}
                            title={notice.isPinned ? '고정 해제' : '상단 고정'}
                          >
                            📌
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditNotice(notice);
                            }}
                            className="btn-icon btn-icon-edit"
                            title="편집"
                          >
                            ✏️
                          </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotice(notice.id);
                          }}
                          className="btn-icon btn-icon-delete"
                          title="삭제"
                        >
                            🗑️
                        </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '2rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--chestnut-light)'
                  }}>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '0.5rem 0.8rem',
                        border: '1px solid var(--chestnut-light)',
                        borderRadius: '5px',
                        background: currentPage === 1 ? '#f5f5f5' : 'white',
                        color: currentPage === 1 ? '#999' : 'var(--chestnut-brown)',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      이전
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        style={{
                          padding: '0.5rem 0.8rem',
                          border: '1px solid var(--chestnut-light)',
                          borderRadius: '5px',
                          background: currentPage === page ? 'var(--chestnut-brown)' : 'white',
                          color: currentPage === page ? 'white' : 'var(--chestnut-brown)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: currentPage === page ? 'bold' : 'normal'
                        }}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '0.5rem 0.8rem',
                        border: '1px solid var(--chestnut-light)',
                        borderRadius: '5px',
                        background: currentPage === totalPages ? '#f5f5f5' : 'white',
                        color: currentPage === totalPages ? '#999' : 'var(--chestnut-brown)',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 공지사항 내용 */}
          <div className={`card ${selectedNotice ? 'notice-detail-visible' : 'notice-detail-hidden'}`}>
            {selectedNotice ? (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                  <button
                    onClick={() => setSelectedNotice(null)}
                    className="btn btn-secondary"
                    style={{fontSize: '0.9rem', padding: '0.5rem 1rem'}}
                  >
                    ← 목록으로
                  </button>
                  
                  {isAdmin && (
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <button
                        onClick={() => togglePinNotice(selectedNotice.id)}
                        className={`btn-icon btn-icon-pin ${selectedNotice.isPinned ? 'pinned' : ''}`}
                        title={selectedNotice.isPinned ? '고정 해제' : '상단 고정'}
                      >
                        📌
                      </button>
                      <button
                        onClick={() => handleEditNotice(selectedNotice)}
                        className="btn-icon btn-icon-edit"
                        title="편집"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteNotice(selectedNotice.id)}
                        className="btn-icon btn-icon-delete"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
                
                <div style={{
                  padding: '1rem',
                  background: 'var(--soft-beige)',
                  borderRadius: '10px',
                  marginBottom: '2rem'
                }}>
                  <h2 style={{color: 'var(--primary-brown)', marginBottom: '1rem'}}>
                    {selectedNotice.title}
                  </h2>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-light)'
                  }}>
                    <span>📅 {selectedNotice.date}</span>
                    <span>👨‍🌾 {selectedNotice.author}</span>
                    {selectedNotice.isPinned && (
                      <span style={{
                        background: '#ff9800',
                        color: 'white',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        📌 고정
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{
                  lineHeight: '1.8',
                  fontSize: '1rem',
                  whiteSpace: 'pre-line'
                }}>
                  {selectedNotice.content}
                </div>
                
                {selectedNotice.images && selectedNotice.images.length > 0 && (
                  <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    background: 'var(--warm-beige)',
                    borderRadius: '15px'
                  }}>
                    <h4 style={{marginBottom: '1rem', color: 'var(--chestnut-brown)'}}>📷 첨부 사진</h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                      {selectedNotice.images.map((image, index) => (
                        <div key={index} style={{
                      maxWidth: '100%',
                      border: '2px solid var(--chestnut-light)',
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}>
                      <img 
                            src={image} 
                            alt={`공지사항 첨부 이미지 ${index + 1}`} 
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                              objectFit: 'contain',
                              cursor: 'pointer'
                        }}
                            onClick={() => window.open(image, '_blank')}
                        onError={(e) => {
                              console.error('이미지 로드 실패:', image);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: 'var(--text-light)'
              }}>
                <div style={{fontSize: '4rem', marginBottom: '1rem'}}>📋</div>
                <h3>공지사항을 선택해주세요</h3>
                <p>왼쪽 목록에서 읽고 싶은 공지사항을 클릭하세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* 안내 */}
        <section className="card" style={{marginTop: '3rem'}}>
          <h2>📢 공지사항 안내</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '2rem'}}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🌰</div>
              <h3>농장 소식</h3>
              <p>알밤 수확 소식, 품질 정보, 특별 이벤트 등 농장의 최신 소식을 전해드립니다.</p>
            </div>
            
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📦</div>
              <h3>배송 안내</h3>
              <p>배송 지연, 휴무일, 특별 배송 서비스 등 배송 관련 중요한 정보를 공지합니다.</p>
            </div>
            
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🎉</div>
              <h3>이벤트</h3>
              <p>할인 이벤트, 무료 증정, 체험 프로그램 등 고객 혜택 정보를 안내합니다.</p>
            </div>
          </div>
        </section>

        {/* 연락처 */}
        <section className="card" style={{background: 'var(--warm-gradient)', textAlign: 'center'}}>
          <h2>📞 문의사항이 있으시면 언제든 연락주세요</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginTop: '2rem'}}>
            <div>
              <h3>📱 전화 문의</h3>
              <p style={{fontSize: '1.2rem', fontWeight: 'bold'}}>010-9123-9287</p>
              <p>오전 8시 ~ 오후 6시</p>
            </div>
            
            <div>
              <h3>📍 농장 방문</h3>
              <p>충남 청양군 남양면 충절로 265-27</p>
              <p>사전 연락 후 방문 부탁드립니다</p>
            </div>
            
            <div>
              <h3>🌐 온라인 주문</h3>
              <p>홈페이지에서 간편하게</p>
              <Link href="/purchase" className="btn btn-secondary" style={{marginTop: '0.5rem'}}>
                주문하기
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
