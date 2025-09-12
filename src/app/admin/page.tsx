'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface OrderData {
  name: string;
  recipientName: string;
  phone: string;
  recipientPhone?: string;
  address: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  orderDate: string;
  orderNumber: string;
  isShipped?: boolean; // 출고 완료 여부
  isPaid?: boolean; // 입금 완료 여부
  isExchanged?: boolean; // 교환 완료 여부
  isRefunded?: boolean; // 환불 완료 여부
  note?: string; // 관리자 비고
}

interface AdminNote {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'note' | 'todo'; // 특이사항 또는 할일
  images?: string[];
}

function AdminBoard() {
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<AdminNote | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [editingNote, setEditingNote] = useState<AdminNote | null>(null);
  const [selectedNoteFiles, setSelectedNoteFiles] = useState<File[]>([]);
  const [noteImagePreviews, setNoteImagePreviews] = useState<string[]>([]);
  const [editNoteFiles, setEditNoteFiles] = useState<File[]>([]);
  const [editNoteImagePreviews, setEditNoteImagePreviews] = useState<string[]>([]);

  // 관리자 노트 로드
  useEffect(() => {
    const savedNotes = localStorage.getItem('adminNotes');
    if (savedNotes) {
      setAdminNotes(JSON.parse(savedNotes));
    }
  }, []);

  // 이미지 파일 처리 (새 메모)
  const handleNoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 파일 크기 검사
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 파일 크기는 5MB 이하여야 합니다.');
        return;
      }
    }

    setSelectedNoteFiles(prev => [...prev, ...files]);
    
    // 미리보기 생성
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNoteImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 이미지 제거 (새 메모)
  const removeNoteImage = (index: number) => {
    setSelectedNoteFiles(prev => prev.filter((_, i) => i !== index));
    setNoteImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 이미지 파일 처리 (편집)
  const handleEditNoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 파일 크기 검사
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 파일 크기는 5MB 이하여야 합니다.');
        return;
      }
    }

    setEditNoteFiles(prev => [...prev, ...files]);
    
    // 미리보기 생성
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditNoteImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 이미지 제거 (편집)
  const removeEditNoteImage = (index: number) => {
    setEditNoteFiles(prev => prev.filter((_, i) => i !== index));
    setEditNoteImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 새 노트 추가
  const handleAddNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const note: AdminNote = {
      id: Date.now().toString(),
      title: newNote.title,
      content: newNote.content,
      date: new Date().toLocaleDateString('ko-KR'),
      type: 'note' as 'note' | 'todo',
      images: noteImagePreviews.length > 0 ? noteImagePreviews : undefined
    };

    const updatedNotes = [note, ...adminNotes];
    setAdminNotes(updatedNotes);
    localStorage.setItem('adminNotes', JSON.stringify(updatedNotes));
    
    setNewNote({ title: '', content: '' });
    setSelectedNoteFiles([]);
    setNoteImagePreviews([]);
    setShowAddForm(false);
  };

  // 노트 삭제
  const handleDeleteNote = (id: string) => {
    if (confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      const updatedNotes = adminNotes.filter(note => note.id !== id);
      setAdminNotes(updatedNotes);
      localStorage.setItem('adminNotes', JSON.stringify(updatedNotes));
      setSelectedNote(null);
    }
  };

  // 노트 편집
  const handleEditNote = (note: AdminNote) => {
    setEditingNote({...note});
    setEditNoteImagePreviews(note.images || []);
  };

  // 노트 업데이트
  const handleUpdateNote = () => {
    if (!editingNote?.title.trim() || !editingNote?.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const updatedNote = {
      ...editingNote,
      images: editNoteImagePreviews.length > 0 ? editNoteImagePreviews : undefined
    };

    const updatedNotes = adminNotes.map(note => 
      note.id === editingNote.id ? updatedNote : note
    );
    setAdminNotes(updatedNotes);
    localStorage.setItem('adminNotes', JSON.stringify(updatedNotes));
    
    setEditingNote(null);
    setEditNoteFiles([]);
    setEditNoteImagePreviews([]);
    setSelectedNote(updatedNote);
  };

  // 페이지네이션 계산
  const totalPages = Math.ceil(adminNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotes = adminNotes.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <section className="card" style={{marginTop: '3rem', background: 'var(--soft-beige)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem'}}>
        <h2>📝 관리자 전용 메모판</h2>
        <button 
          onClick={() => setShowAddForm(true)} 
          className="btn"
        >
          메모 작성
        </button>
      </div>

      {/* 메모 작성 폼 */}
      {showAddForm && (
        <div className="admin-panel" style={{marginBottom: '3rem'}}>
          <h3>✍️ 새 메모 작성</h3>
          

          
          <div className="form-group">
            <label className="form-label">제목</label>
            <input
              type="text"
              value={newNote.title}
              onChange={(e) => setNewNote({...newNote, title: e.target.value})}
              className="form-input"
              placeholder="메모 제목을 입력하세요"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">내용</label>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote({...newNote, content: e.target.value})}
              className="form-input form-textarea"
              placeholder="메모 내용을 입력하세요"
              rows={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">이미지 첨부 (여러 장 가능)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleNoteFileChange}
              className="form-input"
            />
            {noteImagePreviews.length > 0 && (
              <div style={{
                marginTop: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                {noteImagePreviews.map((preview, index) => (
                  <div key={index} style={{position: 'relative'}}>
                    <img 
                      src={preview} 
                      alt={`미리보기 ${index + 1}`} 
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: '1px solid #ddd'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeNoteImage(index)}
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
            )}
          </div>
          
          <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
            <button onClick={() => {
              setShowAddForm(false);
              setNewNote({ title: '', content: '' });
              setSelectedNoteFiles([]);
              setNoteImagePreviews([]);
            }} className="btn btn-secondary">
              취소
            </button>
            <button onClick={handleAddNote} className="btn">
              등록
            </button>
          </div>
        </div>
              )}

        {/* 메모 편집 모달 */}
        {editingNote && (
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
              <h2>✏️ 메모 편집</h2>
              
              <div className="form-group">
                <label className="form-label">제목</label>
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({...editingNote, title: e.target.value})}
                  className="form-input"
                  placeholder="메모 제목을 입력하세요"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">내용</label>
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({...editingNote, content: e.target.value})}
                  className="form-input form-textarea"
                  placeholder="메모 내용을 입력하세요"
                  rows={10}
                />
              </div>

              <div className="form-group">
                <label className="form-label">이미지 첨부 (여러 장 가능)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEditNoteFileChange}
                  className="form-input"
                />
                {editNoteImagePreviews.length > 0 && (
                  <div style={{
                    marginTop: '1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '1rem'
                  }}>
                    {editNoteImagePreviews.map((preview, index) => (
                      <div key={index} style={{position: 'relative'}}>
                        <img 
                          src={preview} 
                          alt={`미리보기 ${index + 1}`} 
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '1px solid #ddd'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeEditNoteImage(index)}
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
                )}
              </div>
              
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button 
                  onClick={() => {
                    setEditingNote(null);
                    setEditNoteFiles([]);
                    setEditNoteImagePreviews([]);
                  }} 
                  className="btn btn-secondary"
                >
                  취소
                </button>
                <button onClick={handleUpdateNote} className="btn">
                  수정 완료
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="notice-layout">
        {/* 메모 목록 */}
        <div className={`card ${selectedNote ? 'notice-list-hidden' : ''}`}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h3>📋 메모 목록</h3>
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
          
          {adminNotes.length === 0 ? (
            <p style={{textAlign: 'center', color: 'var(--text-light)', margin: '2rem 0'}}>
              등록된 메모가 없습니다.
            </p>
          ) : (
            <>
              <div style={{marginTop: '1rem'}}>
                {currentNotes.map((note) => (
                  <div 
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    style={{
                      padding: '1rem',
                      border: selectedNote?.id === note.id ? '2px solid var(--warm-orange)' : '1px solid var(--light-brown)',
                      borderRadius: '10px',
                      marginBottom: '1rem',
                      cursor: 'pointer',
                      background: selectedNote?.id === note.id ? 'var(--soft-beige)' : 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <div style={{flex: 1}}>
                        <h4 style={{
                          color: 'var(--primary-brown)',
                          marginBottom: '0.5rem',
                          fontSize: '1rem'
                        }}>
                          📝 {note.title}
                        </h4>
                        <p style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-light)',
                          margin: 0
                        }}>
                          {note.date}
                        </p>
                      </div>
                      
                      <div style={{display: 'flex', gap: '0.5rem'}}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditNote(note);
                          }}
                          className="btn-icon btn-icon-edit"
                          title="편집"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="btn-icon btn-icon-delete"
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
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

        {/* 메모 내용 */}
        <div className={`card ${selectedNote ? 'notice-detail-visible' : 'notice-detail-hidden'}`}>
          {selectedNote ? (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="btn btn-secondary"
                  style={{fontSize: '0.9rem', padding: '0.5rem 1rem'}}
                >
                  ← 목록으로
                </button>
                
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button
                    onClick={() => handleEditNote(selectedNote)}
                    className="btn-icon btn-icon-edit"
                    title="편집"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="btn-icon btn-icon-delete"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div style={{
                padding: '1rem',
                background: 'var(--soft-beige)',
                borderRadius: '10px',
                marginBottom: '2rem'
              }}>
                <h3 style={{color: 'var(--primary-brown)', marginBottom: '1rem'}}>
                  📝 {selectedNote.title}
                </h3>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-light)'
                }}>
                  <span>📅 {selectedNote.date}</span>
                </div>
              </div>
              
              <div style={{
                lineHeight: '1.8',
                fontSize: '1rem',
                whiteSpace: 'pre-line',
                marginBottom: selectedNote.images && selectedNote.images.length > 0 ? '1rem' : 0
              }}>
                {selectedNote.content}
              </div>
              
              {selectedNote.images && selectedNote.images.length > 0 && (
                <div style={{
                  marginTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {selectedNote.images.map((image, index) => (
                    <img 
                      key={index}
                      src={image} 
                      alt={`첨부 이미지 ${index + 1}`} 
                      style={{
                        width: '100%',
                        maxHeight: '400px',
                        objectFit: 'contain',
                        borderRadius: '10px',
                        border: '1px solid #ddd',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(image, '_blank')}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: 'var(--text-light)'
            }}>
              <div style={{fontSize: '4rem', marginBottom: '1rem'}}>📝</div>
              <h3>메모를 선택해주세요</h3>
              <p>왼쪽 목록에서 읽고 싶은 메모를 클릭하세요.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderData[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [composingNotes, setComposingNotes] = useState<{[key: string]: boolean}>({});
  const [noteValues, setNoteValues] = useState<{[key: string]: string}>({});
  const [chartPeriod, setChartPeriod] = useState(7);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // 주문 관리 상태
  const [showAddOrderForm, setShowAddOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderData | null>(null);
  const [newOrder, setNewOrder] = useState<OrderData>({
    name: '',
    recipientName: '',
    phone: '',
    recipientPhone: '',
    address: '',
    productId: '',
    productName: '',
    quantity: 1,
    totalPrice: 0,
    orderDate: new Date().toLocaleDateString('ko-KR'),
    orderNumber: '',
    isShipped: false,
    isPaid: false,
    isExchanged: false,
    isRefunded: false,
    note: ''
  });
  
  // 상품 목록 상태
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  
  // 수취인 정보 동일 체크 상태
  const [sameAsOrderer, setSameAsOrderer] = useState(false);
  
  // 전화번호 유효성 검사 상태
  const [phoneError, setPhoneError] = useState('');
  const [recipientPhoneError, setRecipientPhoneError] = useState('');

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string, setError: (error: string) => void) => {
    // 숫자만 추출
    const numbersOnly = value.replace(/[^0-9]/g, '');
    
    // 에러 초기화
    setError('');
    
    // 빈 값이면 그대로 반환
    if (numbersOnly.length === 0) {
      return '';
    }
    
    // 한국 휴대폰 번호 형식 검증
    if (!numbersOnly.startsWith('01')) {
      setError('한국 이동통신 전화번호는 01로 시작해야 합니다.');
      return value; // 현재 입력값 그대로 유지
    }
    
    if (numbersOnly.length > 3 && !['010', '011', '016', '017', '018', '019'].includes(numbersOnly.substring(0, 3))) {
      setError('올바른 한국 이동통신 번호가 아닙니다. (010, 011, 016, 017, 018, 019)');
      return value; // 현재 입력값 그대로 유지
    }
    
    if (numbersOnly.length > 11) {
      setError('전화번호는 11자리를 초과할 수 없습니다.');
      return numbersOnly.substring(0, 11); // 11자리까지만 잘라서 포맷팅
    }
    
    // 자동 하이픈 추가
    if (numbersOnly.length <= 3) {
      return numbersOnly;
    } else if (numbersOnly.length <= 7) {
      return numbersOnly.substring(0, 3) + '-' + numbersOnly.substring(3);
    } else {
      return numbersOnly.substring(0, 3) + '-' + numbersOnly.substring(3, 7) + '-' + numbersOnly.substring(7);
    }
  };
  
  // 주문 완료 요약 상태
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderData | null>(null);
  
  // 주문 편집 개선 상태
  const [editSameAsOrderer, setEditSameAsOrderer] = useState(false);

  // 관리자 Firebase Auth 로그인 함수
  const loginAsAdmin = async () => {
    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      const adminEmail = 'admin@albam.com';
      const adminPassword = 'admin123456';
      
      console.log('관리자 Firebase Auth 로그인 시도...');
      
      try {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log('✅ 관리자 Firebase Auth 로그인 성공');
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log('관리자 계정 생성 시도...');
          await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
          console.log('✅ 관리자 계정 생성 및 로그인 성공');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ 관리자 Firebase Auth 처리 실패:', error);
    }
  };

  // 관리자 세션 확인
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdmin(true);
      // 기존 관리자 세션이 있으면 Firebase Auth에도 로그인
      loginAsAdmin();
    }
    
    // Firestore에서 상품 데이터 로드
    const loadProductsFromFirestore = async () => {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        console.log('관리자 페이지: Firestore에서 상품 데이터 로드 시도...');
        const productsCollection = collection(db, 'products');
        const productsSnapshot = await getDocs(productsCollection);
        
        if (!productsSnapshot.empty) {
          const firestoreProducts = productsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: parseInt(doc.id),
              name: data.name || '',
              price: data.price || ''
            };
          });
          
          // ID 순으로 정렬
          firestoreProducts.sort((a, b) => a.id - b.id);
          
          console.log('✅ 관리자 페이지: Firestore에서 상품 데이터 로드 완료:', firestoreProducts.length);
          setAvailableProducts(firestoreProducts);
          return true;
        } else {
          console.log('⚠ 관리자 페이지: Firestore에 상품 데이터가 없음');
          return false;
        }
      } catch (error) {
        console.error('❌ 관리자 페이지: Firestore 상품 로드 실패:', error);
        return false;
      }
    };

    // 상품 목록 로드 (Firestore 우선, 실패 시 localStorage)
    const loadProducts = async () => {
      const firestoreLoaded = await loadProductsFromFirestore();
      
      if (!firestoreLoaded) {
        // Firestore 로드 실패 시 localStorage에서 로드
        const savedProducts = localStorage.getItem('chestnutProducts');
        if (savedProducts) {
          console.log('관리자 페이지: localStorage에서 상품 데이터 로드');
          setAvailableProducts(JSON.parse(savedProducts));
        } else {
          // 기본 상품 목록
          const defaultProducts = [
            { id: 1, name: "알밤 1kg", price: "15,000원" },
            { id: 2, name: "알밤 3kg", price: "40,000원" },
            { id: 3, name: "알밤 5kg", price: "65,000원" },
            { id: 4, name: "껍질 깐 알밤 500g", price: "12,000원" },
            { id: 5, name: "구운 알밤 1kg", price: "18,000원" },
            { id: 6, name: "알밤 선물세트", price: "35,000원" }
          ];
          setAvailableProducts(defaultProducts);
        }
      }
    };
    
    loadProducts();
  }, []);

  // 차트 업데이트 트리거 상태
  const [chartUpdateTrigger, setChartUpdateTrigger] = useState(0);

  // 사용자 지정 날짜 변경 시 차트 자동 업데이트
  useEffect(() => {
    if (useCustomDate && customStartDate && customEndDate) {
      // 차트 데이터 재계산을 위한 트리거
      setChartUpdateTrigger(prev => prev + 1);
    }
  }, [customStartDate, customEndDate, useCustomDate]);

  const products = [
    { id: '1', name: '알밤 1kg' },
    { id: '2', name: '알밤 3kg' },
    { id: '3', name: '알밤 5kg' },
    { id: '4', name: '껍질 깐 알밤 500g' },
    { id: '5', name: '구운 알밤 1kg' },
    { id: '6', name: '알밤 선물세트' }
  ];

  // 주문 데이터 로드
  useEffect(() => {
    if (isAdmin) {
      const savedOrders = localStorage.getItem('orders');
      if (savedOrders) {
        const orderData = JSON.parse(savedOrders);
        setOrders(orderData);
        setFilteredOrders(orderData);
        // 비고 값들 초기화
        const notes: {[key: string]: string} = {};
        orderData.forEach((order: OrderData) => {
          notes[order.orderNumber] = order.note || '';
        });
        setNoteValues(notes);
      }
    }
  }, [isAdmin]);

  // 필터링 및 정렬
  useEffect(() => {
    let filtered = [...orders];

    // 날짜 필터
    if (filterDate) {
      filtered = filtered.filter(order => order.orderDate === filterDate);
    }

    // 상품 필터
    if (filterProduct) {
      filtered = filtered.filter(order => order.productId === filterProduct);
    }

    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
          break;
        case 'price':
          comparison = a.totalPrice - b.totalPrice;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredOrders(filtered);
  }, [orders, filterDate, filterProduct, sortBy, sortOrder]);

  // 관리자 로그인
  const handleAdminLogin = async () => {
    if (adminPassword === 'lky9287') {
      setIsAdmin(true);
      setAdminPassword('');
      localStorage.setItem('adminSession', 'true');
      
      // Firebase Auth에도 관리자로 로그인
      await loginAsAdmin();
    } else {
      alert('비밀번호가 올바르지 않습니다.');
      setAdminPassword('');
    }
  };

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    if (filteredOrders.length === 0) {
      alert('다운로드할 주문 데이터가 없습니다.');
      return;
    }

    // 엑셀 데이터 준비
    const excelData = filteredOrders.map((order, index) => ({
      '번호': index + 1,
      '주문번호': order.orderNumber,
      '주문일자': order.orderDate,
      '주문자': order.name,
      '수취인': order.recipientName || order.name,
      '주문자연락처': order.phone,
      '수취인연락처': order.recipientPhone || order.phone,
      '주소': order.address,
      '상품명': order.productName,
      '수량': order.quantity,
      '총금액': order.totalPrice.toLocaleString() + '원',
      '입금상태': order.isPaid ? '입금완료' : '입금대기',
      '출고상태': order.isShipped ? '출고완료' : '출고대기',
      '교환상태': order.isExchanged ? '교환완료' : '교환없음',
      '환불상태': order.isRefunded ? '환불완료' : '환불없음',
      '비고': order.note || ''
    }));

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 8 },   // 번호
      { wch: 15 },  // 주문번호
      { wch: 12 },  // 주문일자
      { wch: 10 },  // 주문자
      { wch: 10 },  // 수취인
      { wch: 15 },  // 주문자연락처
      { wch: 15 },  // 수취인연락처
      { wch: 40 },  // 주소
      { wch: 20 },  // 상품명
      { wch: 8 },   // 수량
      { wch: 12 },  // 총금액
      { wch: 10 },  // 입금상태
      { wch: 10 },  // 출고상태
      { wch: 10 },  // 교환상태
      { wch: 10 },  // 환불상태
      { wch: 30 }   // 비고
    ];

    // 테두리 스타일 적용
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        
        // 빈 셀도 생성
        if (!ws[cell_address]) {
          ws[cell_address] = { t: 's', v: '' };
        }
        
        ws[cell_address].s = {
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          alignment: { horizontal: 'center', vertical: 'center' },
          font: { name: '맑은 고딕', sz: 10 }
        };
        
        // 헤더 행 스타일
        if (R === 0) {
          ws[cell_address].s.fill = { fgColor: { rgb: 'E6C565' } };
          ws[cell_address].s.font = { name: '맑은 고딕', sz: 10, bold: true };
        }
      }
    }

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, '주문목록');

    // 파일명 생성
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const filename = `청양칠갑산알밤농장_주문목록_${dateStr}_${timeStr}.xlsx`;

    // 파일 다운로드
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, filename);
  };

  // 출고 완료 토글
  const toggleShippingStatus = (orderNumber: string) => {
    const updatedOrders = orders.map(order => 
      order.orderNumber === orderNumber 
        ? { ...order, isShipped: !order.isShipped }
        : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
  };

  // 입금 완료 토글
  const togglePaymentStatus = (orderNumber: string) => {
    const updatedOrders = orders.map(order => 
      order.orderNumber === orderNumber 
        ? { ...order, isPaid: !order.isPaid }
        : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
  };

  // 교환 완료 토글
  const toggleExchangeStatus = (orderNumber: string) => {
    const updatedOrders = orders.map(order => 
      order.orderNumber === orderNumber 
        ? { ...order, isExchanged: !order.isExchanged }
        : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
  };

  // 환불 완료 토글
  const toggleRefundStatus = (orderNumber: string) => {
    const updatedOrders = orders.map(order => 
      order.orderNumber === orderNumber 
        ? { ...order, isRefunded: !order.isRefunded }
        : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
  };

  // 비고 값 업데이트 (즉시)
  const updateNoteValue = (orderNumber: string, note: string) => {
    setNoteValues(prev => ({...prev, [orderNumber]: note}));
  };

  // 비고 업데이트 (저장)
  const updateOrderNote = (orderNumber: string, note: string) => {
    const updatedOrders = orders.map(order => 
      order.orderNumber === orderNumber 
        ? { ...order, note: note }
        : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
  };

  // 주문 관리 함수들
  const generateOrderNumber = () => {
    // 한국 시간(KST) 기준으로 주문번호 생성 - 관리자 추가용 (B 접두사)
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC + 9시간 (KST)
    const year = kstTime.getUTCFullYear().toString().slice(-2); // YY
    const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0'); // MM
    const day = String(kstTime.getUTCDate()).padStart(2, '0'); // DD
    const hour = String(kstTime.getUTCHours()).padStart(2, '0'); // HH
    const minute = String(kstTime.getUTCMinutes()).padStart(2, '0'); // MM
    const second = String(kstTime.getUTCSeconds()).padStart(2, '0'); // SS
    return `B${year}${month}${day}${hour}${minute}${second}`;
  };

  // 상품 선택 시 가격 계산
  const handleProductSelect = (productName: string) => {
    const selectedProduct = availableProducts.find(p => p.name === productName);
    if (selectedProduct) {
      const price = parseInt(selectedProduct.price.replace(/[^0-9]/g, ''));
      setNewOrder({
        ...newOrder,
        productName,
        productId: selectedProduct.id.toString(),
        totalPrice: price * newOrder.quantity
      });
    }
  };

  // 수량 변경 시 가격 재계산
  const handleQuantityChange = (quantity: number) => {
    const selectedProduct = availableProducts.find(p => p.name === newOrder.productName);
    if (selectedProduct) {
      const price = parseInt(selectedProduct.price.replace(/[^0-9]/g, ''));
      setNewOrder({
        ...newOrder,
        quantity,
        totalPrice: price * quantity
      });
    } else {
      setNewOrder({
        ...newOrder,
        quantity
      });
    }
  };

  // 연락처 형식 검증
  const validatePhoneNumber = (phone: string) => {
    // 한국 휴대폰 번호 형식: 010-1234-5678, 01012345678, 010 1234 5678
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$|^01[0-9]\s?[0-9]{3,4}\s?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // 수취인 정보 동일 체크 처리
  const handleSameAsOrderer = (checked: boolean) => {
    setSameAsOrderer(checked);
    setRecipientPhoneError(''); // 에러 상태 초기화
    if (checked) {
      setNewOrder({
        ...newOrder,
        recipientName: newOrder.name,
        recipientPhone: newOrder.phone
      });
    } else {
      setNewOrder({
        ...newOrder,
        recipientName: '',
        recipientPhone: ''
      });
    }
  };

  const handleAddOrder = () => {
    if (!newOrder.name || !newOrder.phone || !newOrder.address || !newOrder.productName) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    // 전화번호 에러 상태 확인
    if (phoneError) {
      alert('주문자 연락처를 올바르게 입력해주세요.');
      return;
    }

    // 수취인 연락처 에러 상태 확인 (입력된 경우에만)
    if (recipientPhoneError) {
      alert('수취인 연락처를 올바르게 입력해주세요.');
      return;
    }

    const orderWithNumber = {
      ...newOrder,
      orderNumber: generateOrderNumber(),
      recipientName: newOrder.recipientName || newOrder.name,
      recipientPhone: newOrder.recipientPhone || newOrder.phone
    };

    const updatedOrders = [...orders, orderWithNumber];
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));

    // 완료된 주문 정보 저장 및 요약 표시
    setCompletedOrder(orderWithNumber);
    setShowOrderSummary(true);

    // 폼 초기화
    setNewOrder({
      name: '',
      recipientName: '',
      phone: '',
      recipientPhone: '',
      address: '',
      productId: '',
      productName: '',
      quantity: 1,
      totalPrice: 0,
      orderDate: new Date().toLocaleDateString('ko-KR'),
      orderNumber: '',
      isShipped: false,
      isPaid: false,
      isExchanged: false,
      isRefunded: false,
      note: ''
    });
    setSameAsOrderer(false);
    setPhoneError(''); // 전화번호 에러 상태 초기화
    setRecipientPhoneError(''); // 수취인 전화번호 에러 상태 초기화
    setShowAddOrderForm(false);
  };

  const handleEditOrder = (order: OrderData) => {
    setEditingOrder(order);
    setEditSameAsOrderer(order.name === order.recipientName && order.phone === order.recipientPhone);
  };

  // 편집 시 상품 선택 처리
  const handleEditProductSelect = (productName: string) => {
    if (!editingOrder) return;
    
    const selectedProduct = availableProducts.find(p => p.name === productName);
    if (selectedProduct) {
      const price = parseInt(selectedProduct.price.replace(/[^0-9]/g, ''));
      setEditingOrder({
        ...editingOrder,
        productName,
        productId: selectedProduct.id.toString(),
        totalPrice: price * editingOrder.quantity
      });
    }
  };

  // 편집 시 수량 변경 처리
  const handleEditQuantityChange = (quantity: number) => {
    if (!editingOrder) return;
    
    const selectedProduct = availableProducts.find(p => p.name === editingOrder.productName);
    if (selectedProduct) {
      const price = parseInt(selectedProduct.price.replace(/[^0-9]/g, ''));
      setEditingOrder({
        ...editingOrder,
        quantity,
        totalPrice: price * quantity
      });
    } else {
      setEditingOrder({
        ...editingOrder,
        quantity
      });
    }
  };

  // 편집 시 수취인 정보 동일 체크 처리
  const handleEditSameAsOrderer = (checked: boolean) => {
    if (!editingOrder) return;
    
    setEditSameAsOrderer(checked);
    if (checked) {
      setEditingOrder({
        ...editingOrder,
        recipientName: editingOrder.name,
        recipientPhone: editingOrder.phone
      });
    } else {
      setEditingOrder({
        ...editingOrder,
        recipientName: '',
        recipientPhone: ''
      });
    }
  };

  const handleUpdateOrder = () => {
    if (!editingOrder) return;

    const updatedOrders = orders.map(order => 
      order.orderNumber === editingOrder.orderNumber ? editingOrder : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    setEditingOrder(null);
  };

  const handleDeleteOrder = (orderNumber: string) => {
    if (confirm('정말로 이 주문을 삭제하시겠습니까?')) {
      const updatedOrders = orders.filter(order => order.orderNumber !== orderNumber);
      setOrders(updatedOrders);
      localStorage.setItem('orders', JSON.stringify(updatedOrders));
    }
  };

  // 통계 계산
  const totalOrders = filteredOrders.length;
  const paidOrders = filteredOrders.filter(order => order.isPaid).length;
  const unpaidOrders = totalOrders - paidOrders;
  const shippedOrders = filteredOrders.filter(order => order.isShipped).length;
  const pendingOrders = totalOrders - shippedOrders;
  const exchangedOrders = filteredOrders.filter(order => order.isExchanged).length;
  const refundedOrders = filteredOrders.filter(order => order.isRefunded).length;
  
  // 총 매출 계산 (입금완료 - 환불완료)
  const paidOrdersRevenue = filteredOrders
    .filter(order => order.isPaid)
    .reduce((sum, order) => sum + order.totalPrice, 0);
  const refundedOrdersRevenue = filteredOrders
    .filter(order => order.isRefunded)
    .reduce((sum, order) => sum + order.totalPrice, 0);
  const totalRevenue = paidOrdersRevenue - refundedOrdersRevenue;

  // 상품별 판매 통계
  const productStats = products.map(product => {
    const productOrders = filteredOrders.filter(order => order.productId === product.id);
    const totalQuantity = productOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalAmount = productOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    
    return {
      ...product,
      orderCount: productOrders.length,
      totalQuantity,
      totalAmount
    };
  }).filter(stat => stat.orderCount > 0);

  // 날짜별 매출 통계 (기간 조절 가능)
  const getDateStats = () => {
    const dateStats = [];
    let startDate, endDate, totalDays;
    
    if (useCustomDate && customStartDate && customEndDate) {
      // 사용자 지정 날짜 사용
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      // 기본 기간 사용
      const today = new Date();
      endDate = today;
      startDate = new Date(today);
      startDate.setDate(today.getDate() - (chartPeriod - 1));
      totalDays = chartPeriod;
    }
    
    // 모든 날짜에 대해 데이터 생성
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const targetDate = date.toLocaleDateString('ko-KR'); // 예: 2024. 12. 25.
      
      // 해당 날짜의 모든 주문 확인 (필터링 없이)
      const dayOrders = orders.filter(order => order.orderDate === targetDate);
      
      // 해당 날짜의 입금 완료된 주문들의 금액 합계
      const dailyPaidAmount = dayOrders
        .filter(order => order.isPaid)
        .reduce((sum, order) => sum + order.totalPrice, 0);
      
      // 해당 날짜의 환불 완료된 주문들의 금액 합계
      const dailyRefundAmount = dayOrders
        .filter(order => order.isRefunded)
        .reduce((sum, order) => sum + order.totalPrice, 0);
      
      // 날짜별 매출 = 입금 금액 합계 - 환불 금액 합계
      const dayRevenue = dailyPaidAmount - dailyRefundAmount;
      
      // 라벨 표시 여부 결정 (시작, 중간, 마지막만 표시)
      let showLabel = false;
      if (totalDays === 1) {
        showLabel = true; // 1일만 있으면 표시
      } else if (totalDays === 2) {
        showLabel = i === 0 || i === totalDays - 1; // 시작과 끝만
      } else {
        const middleIndex = Math.floor(totalDays / 2);
        showLabel = i === 0 || i === middleIndex || i === totalDays - 1; // 시작, 중간, 끝
      }
      
      dateStats.push({
        date: date.toISOString().split('T')[0],
        label: showLabel ? date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '',
        fullLabel: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }), // 호버링용 전체 날짜
        revenue: Math.max(dayRevenue, 0), // 음수 방지
        paidAmount: dailyPaidAmount,
        refundAmount: dailyRefundAmount,
        orderCount: dayOrders.length
      });
    }
    
    return dateStats;
  };

  const dateStats = getDateStats();
  const maxRevenue = Math.max(...dateStats.map(stat => stat.revenue), 1);

  if (!isAdmin) {
    return (
      <>
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
              <Link href="/notice" className="nav-link">농장 공지사항</Link>
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
                🔐 관리자 페이지
              </h1>
              
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
              
              <button onClick={handleAdminLogin} className="btn" style={{width: '100%'}}>
                로그인
              </button>
              
              <div style={{marginTop: '2rem', padding: '1rem', background: 'var(--soft-beige)', borderRadius: '10px'}}>
                <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>
                  이 페이지는 농장 관리자만 접근할 수 있습니다.<br/>
                  주문 관리 및 통계 확인이 가능합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
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
            <Link href="/notice" className="nav-link">농장 공지사항</Link>
                            <Link href="/admin" className="nav-link nav-link-active">
                  📊 주문 현황
                </Link>
            <button onClick={() => {
              setIsAdmin(false);
              localStorage.removeItem('adminSession');
            }} className="nav-link" style={{background: 'none', border: 'none', cursor: 'pointer'}}>
              관리자 로그아웃
            </button>
          </nav>
        </div>
      </header>

      <div className="container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem'}}>
          <h1 style={{color: 'var(--primary-brown)'}}>
            📊 주문 관리 시스템
          </h1>
          
          <button onClick={handleExcelDownload} className="btn">
            📥 엑셀 다운로드
          </button>
        </div>

        {/* 통계 요약 */}
        <section className="card" style={{marginBottom: '3rem'}}>
          <h2>📈 주문 통계</h2>
          
          <div className="stats-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginTop: '2rem'}}>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
              borderRadius: '10px',
              textAlign: 'center',
              border: '2px solid #f44336'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>⏳</div>
              <h3 style={{fontSize: '0.9rem', color: '#000000'}}>입금 대기</h3>
              <p style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#000000'}}>
                {unpaidOrders}건
              </p>
            </div>

            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)',
              borderRadius: '10px',
              textAlign: 'center',
              border: '2px solid #2196f3'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>💳</div>
              <h3 style={{fontSize: '0.9rem', color: '#000000'}}>입금 완료</h3>
              <p style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#000000'}}>
                {paidOrders}건
              </p>
            </div>

            <div style={{
              padding: '1.2rem',
              background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '2px solid #ff9800'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📦</div>
              <h3 style={{fontSize: '0.9rem', color: '#000000'}}>출고 대기</h3>
              <p style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#000000'}}>
                {pendingOrders}건
              </p>
            </div>

            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
              borderRadius: '10px',
              textAlign: 'center',
              border: '2px solid #4caf50'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>✅</div>
              <h3 style={{fontSize: '0.9rem', color: '#000000'}}>출고 완료</h3>
              <p style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#000000'}}>
                {shippedOrders}건
              </p>
            </div>

            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
              borderRadius: '10px',
              textAlign: 'center',
              border: '2px solid #9c27b0'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>🔄</div>
              <h3 style={{fontSize: '0.9rem', color: '#000000'}}>교환 완료</h3>
              <p style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#000000'}}>
                {exchangedOrders}건
              </p>
            </div>

            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)',
              borderRadius: '10px',
              textAlign: 'center',
              border: '2px solid #e91e63'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>💸</div>
              <h3 style={{fontSize: '0.9rem', color: '#000000'}}>환불 완료</h3>
              <p style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#000000'}}>
                {refundedOrders}건
              </p>
            </div>

            <div style={{
              padding: '1.2rem',
              background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '2px solid #ff9800'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📊</div>
              <h3 style={{fontSize: '0.9rem', color: '#000000'}}>총 주문 수</h3>
              <p style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#000000'}}>
                {totalOrders}건
              </p>
            </div>

            <div style={{
              padding: '1.2rem',
              background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '2px solid #4caf50'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>💰</div>
              <h3 style={{fontSize: '0.9rem', color: '#000000'}}>총 매출</h3>
              <p style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#000000'}}>
                {totalRevenue.toLocaleString()}원
              </p>
            </div>
          </div>
        </section>

        {/* 매출 변화 그래프 */}
        <section className="card" style={{marginBottom: '3rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
            <h2>📈 매출 변화 추이</h2>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'}}>
              <label style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>기간 선택:</label>
              <select
                value={useCustomDate ? 'custom' : chartPeriod}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setUseCustomDate(true);
                  } else {
                    setUseCustomDate(false);
                    setChartPeriod(Number(e.target.value));
                  }
                }}
                style={{
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '0.9rem'
                }}
              >
                <option value={7}>최근 7일</option>
                <option value={14}>최근 14일</option>
                <option value={30}>최근 30일</option>
                <option value={60}>최근 60일</option>
                <option value="custom">사용자 지정</option>
              </select>
              
              {useCustomDate && (
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '5px',
                      border: '1px solid #ddd',
                      fontSize: '0.8rem'
                    }}
                  />
                  <span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>~</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '5px',
                      border: '1px solid #ddd',
                      fontSize: '0.8rem'
                    }}
                  />
                  <button
                    onClick={() => {
                      if (customStartDate && customEndDate) {
                        // 차트 데이터 재계산을 위한 트리거
                        setChartUpdateTrigger(prev => prev + 1);
                        alert(`${customStartDate}부터 ${customEndDate}까지의 매출 데이터를 조회합니다.`);
                      } else {
                        alert('시작일과 종료일을 모두 선택해주세요.');
                      }
                    }}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: 'var(--chestnut-gradient)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}
                  >
                    조회
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* 막대 그래프 */}
          <div style={{
            position: 'relative',
            height: '400px',
            padding: '2rem',
            background: 'linear-gradient(135deg, #faf8f3 0%, #f5f2ed 100%)',
            borderRadius: '15px',
            overflow: 'visible',
            boxShadow: '0 4px 20px rgba(125, 79, 57, 0.1)'
          }}>
            {/* Y축 라벨 */}
            <div style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'rotate(-90deg) translateY(-50%)',
              fontSize: '0.8rem',
              color: '#000000',
              transformOrigin: 'center',
              fontWeight: 'bold'
            }}>
              매출 (원)
            </div>
            
            {/* 그래프 영역 */}
            <div style={{
              position: 'relative',
              height: '250px',
              marginLeft: '50px',
              marginRight: '20px',
              marginBottom: '90px'
            }}>
              {/* 격자선 */}
              {[0, 25, 50, 75, 100].map(percent => (
                <div key={percent} style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${100 - percent}%`,
                  height: '1px',
                  background: percent === 0 ? 'var(--chestnut-brown)' : 'rgba(125, 79, 57, 0.2)',
                  zIndex: 1
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '-50px',
                    top: '-8px',
                    fontSize: '0.7rem',
                    color: '#000000',
                    fontWeight: '500'
                  }}>
                    {Math.round((maxRevenue * percent) / 100).toLocaleString()}
                  </span>
                </div>
              ))}
              
              {/* 막대 그래프 */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                paddingLeft: '0.5%',
                paddingRight: '0.5%',
                zIndex: 2
              }}>
                {dateStats.map((stat, index) => {
                  const barHeight = (stat.revenue / maxRevenue) * 100;
                  return (
                    <div
                      key={stat.date}
                      style={{
                        width: `${Math.max(100 / dateStats.length - 1, 8)}%`,
                        height: `${barHeight}%`,
                        background: `linear-gradient(135deg, 
                          ${stat.revenue > 0 ? '#ff9800' : '#e0e0e0'} 0%, 
                          ${stat.revenue > 0 ? '#f57c00' : '#bdbdbd'} 100%)`,
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: stat.revenue > 0 ? '0 2px 8px rgba(255, 152, 0, 0.3)' : 'none',
                        border: stat.revenue > 0 ? '1px solid #e65100' : '1px solid #9e9e9e'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scaleY(1.05)';
                        e.currentTarget.style.filter = 'brightness(1.1)';
                        
                        // 툴팁 생성
                        const tooltip = document.createElement('div');
                        tooltip.id = `tooltip-${index}`;
                        tooltip.style.cssText = `
                          position: absolute;
                          bottom: 105%;
                          left: 50%;
                          transform: translateX(-50%);
                          background: var(--chestnut-brown);
                          color: white;
                          padding: 0.5rem 0.8rem;
                          border-radius: 8px;
                          font-size: 0.8rem;
                          font-weight: bold;
                          white-space: nowrap;
                          z-index: 1000;
                          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                        `;
                        tooltip.innerHTML = `
                          <div style="text-align: center;">
                            <div>${stat.fullLabel}</div>
                            <div style="color: #ffcc80; margin-top: 2px;">
                              ${stat.revenue.toLocaleString()}원
                            </div>
                          </div>
                        `;
                        
                        // 화살표 추가
                        const arrow = document.createElement('div');
                        arrow.style.cssText = `
                          position: absolute;
                          top: 100%;
                          left: 50%;
                          transform: translateX(-50%);
                          width: 0;
                          height: 0;
                          border-left: 6px solid transparent;
                          border-right: 6px solid transparent;
                          border-top: 6px solid var(--chestnut-brown);
                        `;
                        tooltip.appendChild(arrow);
                        
                        e.currentTarget.appendChild(tooltip);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scaleY(1)';
                        e.currentTarget.style.filter = 'brightness(1)';
                        
                        // 툴팁 제거
                        const tooltip = document.getElementById(`tooltip-${index}`);
                        if (tooltip) {
                          tooltip.remove();
                        }
                      }}
                    />
                  );
                })}
              </div>
              
              {/* X축 라벨 */}
              <div style={{
                position: 'absolute',
                bottom: '-70px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                paddingLeft: '0.5%',
                paddingRight: '0.5%',
                height: '60px'
              }}>
                {dateStats.map((stat, index) => (
                  <div key={stat.date} style={{
                    width: `${Math.max(100 / dateStats.length - 1, 8)}%`,
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    color: '#000000',
                    fontWeight: '500',
                    transform: dateStats.length > 7 ? 'rotate(-90deg)' : 'none',
                    transformOrigin: 'center',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    {stat.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(230, 197, 101, 0.1)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <p style={{fontSize: '0.9rem', color: 'var(--text-light)', margin: 0}}>
              📊 막대에 마우스를 올리면 해당 날짜의 구체적인 매출을 확인할 수 있습니다
            </p>
          </div>
        </section>

        {/* 상품별 판매 통계 */}
        {productStats.length > 0 && (
          <section className="card" style={{marginBottom: '3rem'}}>
            <h2>🌰 상품별 판매 현황</h2>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '2rem'}}>
              {productStats.map((stat, index) => (
                <div key={stat.id} style={{
                  padding: '1.5rem',
                  background: index % 2 === 0 
                    ? 'linear-gradient(135deg, #f8f5f0 0%, #f5f2ed 100%)' 
                    : 'linear-gradient(135deg, #f0f8f5 0%, #edf5f2 100%)',
                  border: `2px solid ${index % 2 === 0 ? 'var(--chestnut-light)' : '#c8e6c9'}`,
                  borderRadius: '15px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    paddingBottom: '0.5rem',
                    borderBottom: `2px solid ${index % 2 === 0 ? 'var(--chestnut-light)' : '#c8e6c9'}`
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: index % 2 === 0 ? 'var(--chestnut-gradient)' : 'linear-gradient(135deg, #4caf50, #66bb6a)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '1rem',
                      fontSize: '1.2rem'
                    }}>
                      🌰
                    </div>
                    <h3 style={{
                      color: index % 2 === 0 ? 'var(--chestnut-brown)' : '#2e7d32',
                      margin: 0,
                      fontSize: '1.1rem',
                      fontWeight: '600'
                    }}>
                      {stat.name}
                    </h3>
                  </div>
                  
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                    <div style={{
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '10px',
                      textAlign: 'center'
                    }}>
                      <div style={{fontSize: '0.9rem', color: '#795548', marginBottom: '0.4rem', fontWeight: '500'}}>
                        주문 수
                      </div>
                      <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#5d4037', letterSpacing: '0.5px'}}>
                        {stat.orderCount}건
                      </div>
                    </div>
                    <div style={{
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '10px',
                      textAlign: 'center'
                    }}>
                      <div style={{fontSize: '0.9rem', color: '#795548', marginBottom: '0.4rem', fontWeight: '500'}}>
                        총 수량
                      </div>
                      <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#5d4037', letterSpacing: '0.5px'}}>
                        {stat.totalQuantity}개
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(230, 197, 101, 0.2)',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{fontSize: '1rem', color: '#e65100', marginBottom: '0.5rem', fontWeight: '600'}}>
                      총 매출
                    </div>
                    <div style={{fontSize: '1.7rem', color: '#bf360c', fontWeight: 'bold', letterSpacing: '0.5px'}}>
                      {stat.totalAmount.toLocaleString()}원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 필터 및 정렬 */}
        <section className="card" style={{marginBottom: '2rem'}}>
          <h2>🔍 주문 검색 및 필터</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem'}}>
            <div className="form-group">
              <label className="form-label">주문 날짜</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">상품</label>
              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="form-input"
              >
                <option value="">전체 상품</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">정렬 기준</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'price' | 'name')}
                className="form-input"
              >
                <option value="date">주문 날짜</option>
                <option value="price">주문 금액</option>
                <option value="name">고객명</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">정렬 순서</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="form-input"
              >
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
            </div>
          </div>

          <div style={{marginTop: '1rem'}}>
            <button
              onClick={() => {
                setFilterDate('');
                setFilterProduct('');
                setSortBy('date');
                setSortOrder('desc');
              }}
              className="btn btn-secondary"
            >
              필터 초기화
            </button>
          </div>
        </section>

        {/* 주문 목록 */}
        <section className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <h2>📋 주문 목록 ({filteredOrders.length}건)</h2>
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
                  <option value={10}>10개</option>
                  <option value={30}>30개</option>
                  <option value={50}>50개</option>
                  <option value={100}>100개</option>
                </select>
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <button 
                onClick={() => setShowAddOrderForm(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--chestnut-gradient)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                ➕ 주문 추가
              </button>
              <p style={{color: 'var(--text-light)'}}>
                총 매출: <strong style={{color: 'var(--warm-orange)'}}>
                  {filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0).toLocaleString()}원
                </strong>
              </p>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)'}}>
              <div style={{fontSize: '4rem', marginBottom: '1rem'}}>📦</div>
              <h3>주문 내역이 없습니다</h3>
              <p>조건에 맞는 주문이 없거나 아직 주문이 접수되지 않았습니다.</p>
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <div style={{
                background: 'white',
                borderRadius: '15px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(125, 79, 57, 0.1)',
                border: '1px solid var(--chestnut-light)',
                maxHeight: '600px',
                overflowY: 'auto',
                overflowX: 'auto'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr style={{
                      background: 'var(--chestnut-gradient)',
                      color: 'white',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>주문번호</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>일자</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>주문자</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>주문자<br/>연락처</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>수취인</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>수취인<br/>연락처</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>주소</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>상품</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>수량</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>금액</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>입금</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>출고</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>교환</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>환불</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.5)'}}>비고</th>
                      <th style={{padding: '0.6rem 0.4rem', fontWeight: '600', textAlign: 'center', fontSize: '0.75rem'}}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
                      return paginatedOrders.map((order, index) => (
                      <tr key={order.orderNumber} style={{
                        background: order.isShipped 
                          ? 'linear-gradient(135deg, #f1f8e9 0%, #e8f5e8 100%)'
                          : index % 2 === 0 
                            ? '#fefefe' 
                            : 'var(--creamy-white)',
                        borderBottom: '2px solid var(--chestnut-light)',
                        transition: 'all 0.3s ease'
                      }} onMouseEnter={(e) => {
                        if (!order.isShipped) {
                          e.currentTarget.style.background = 'var(--warm-beige)';
                        }
                      }} onMouseLeave={(e) => {
                        e.currentTarget.style.background = order.isShipped 
                          ? 'linear-gradient(135deg, #f1f8e9 0%, #e8f5e8 100%)'
                          : index % 2 === 0 
                            ? '#fefefe' 
                            : 'var(--creamy-white)';
                      }}>
                        <td style={{
                          padding: '0.6rem 0.4rem', 
                          fontFamily: 'monospace', 
                          fontSize: '0.7rem',
                          color: '#000000',
                          lineHeight: '1.2',
                          borderRight: '1px solid var(--chestnut-light)'
                        }}>
                          {order.orderNumber.replace(/(\d{6})(\d{6})/, '$1\n$2').split('\n').map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', color: '#000000', fontSize: '0.7rem', lineHeight: '1.2', minWidth: '50px', borderRight: '1px solid var(--chestnut-light)'}}>
                          {(() => {
                            const dateMatch = order.orderDate.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
                            if (dateMatch) {
                              return (
                                <>
                                  <div>{dateMatch[1]}.</div>
                                  <div>{dateMatch[2]}.{dateMatch[3]}.</div>
                                </>
                              );
                            }
                            return order.orderDate;
                          })()}
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', fontWeight: 'bold', color: '#000000', fontSize: '0.7rem', whiteSpace: 'nowrap', borderRight: '1px solid var(--chestnut-light)'}}>
                          {order.name}
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', fontSize: '0.7rem', color: '#000000', lineHeight: '1.2', minWidth: '72px', maxWidth: '72px', borderRight: '1px solid var(--chestnut-light)'}}>
                          {(() => {
                            const phone = order.phone;
                            const firstDashIndex = phone.indexOf('-');
                            if (firstDashIndex !== -1) {
                              return (
                                <>
                                  <div>{phone.substring(0, firstDashIndex + 1)}</div>
                                  <div>{phone.substring(firstDashIndex + 1)}</div>
                                </>
                              );
                            }
                            return phone;
                          })()}
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', color: '#000000', fontSize: '0.7rem', whiteSpace: 'nowrap', borderRight: '1px solid var(--chestnut-light)'}}>
                          {order.recipientName || order.name}
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', fontSize: '0.7rem', color: '#000000', lineHeight: '1.2', minWidth: '72px', maxWidth: '72px', borderRight: '1px solid var(--chestnut-light)'}}>
                          {(() => {
                            const phone = order.recipientPhone || order.phone;
                            const firstDashIndex = phone.indexOf('-');
                            if (firstDashIndex !== -1) {
                              return (
                                <>
                                  <div>{phone.substring(0, firstDashIndex + 1)}</div>
                                  <div>{phone.substring(firstDashIndex + 1)}</div>
                                </>
                              );
                            }
                            return phone;
                          })()}
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', fontSize: '0.7rem', color: '#000000', lineHeight: '1.2', maxWidth: '120px', borderRight: '1px solid var(--chestnut-light)'}}>
                          {order.address.match(/.{1,10}/g)?.map((line, i) => (
                            <div key={i}>{line}</div>
                          )) || order.address}
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', fontWeight: '500', color: '#000000', fontSize: '0.7rem', lineHeight: '1.2', borderRight: '1px solid var(--chestnut-light)'}}>
                          {order.productName.match(/.{1,7}/g)?.map((line, i) => (
                            <div key={i}>{line}</div>
                          )) || order.productName}
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.7rem', color: '#000000', borderRight: '1px solid var(--chestnut-light)'}}>
                          {order.quantity}
                        </td>
                        <td style={{
                          padding: '0.6rem 0.4rem', 
                          textAlign: 'right', 
                          fontWeight: 'bold', 
                          color: '#000000',
                          fontSize: '0.7rem',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid var(--chestnut-light)'
                        }}>
                          {order.totalPrice.toLocaleString()}원
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', textAlign: 'center', borderRight: '1px solid var(--chestnut-light)'}}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.2rem',
                            cursor: 'pointer',
                            fontSize: '0.65rem'
                          }}>
                            <input
                              type="checkbox"
                              checked={order.isPaid || false}
                              onChange={() => togglePaymentStatus(order.orderNumber)}
                              style={{
                                width: '12px',
                                height: '12px',
                                accentColor: '#2196f3',
                                cursor: 'pointer'
                              }}
                            />
                            {order.isPaid ? (
                              <span style={{color: '#1565c0', fontSize: '0.6rem', fontWeight: 'bold'}}>완료</span>
                            ) : (
                              <span style={{color: '#e65100', fontSize: '0.6rem'}}>대기</span>
                            )}
                          </label>
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', textAlign: 'center', borderRight: '1px solid var(--chestnut-light)'}}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.2rem',
                            cursor: 'pointer',
                            fontSize: '0.65rem'
                          }}>
                            <input
                              type="checkbox"
                              checked={order.isShipped || false}
                              onChange={() => toggleShippingStatus(order.orderNumber)}
                              style={{
                                width: '12px',
                                height: '12px',
                                accentColor: '#4caf50',
                                cursor: 'pointer'
                              }}
                            />
                            {order.isShipped ? (
                              <span style={{color: '#2e7d32', fontSize: '0.6rem', fontWeight: 'bold'}}>완료</span>
                            ) : (
                              <span style={{color: '#e65100', fontSize: '0.6rem'}}>대기</span>
                            )}
                          </label>
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', textAlign: 'center', borderRight: '1px solid var(--chestnut-light)'}}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.2rem',
                            cursor: 'pointer',
                            fontSize: '0.65rem'
                          }}>
                            <input
                              type="checkbox"
                              checked={order.isExchanged || false}
                              onChange={() => toggleExchangeStatus(order.orderNumber)}
                              style={{
                                width: '12px',
                                height: '12px',
                                accentColor: '#9c27b0',
                                cursor: 'pointer'
                              }}
                            />
                            {order.isExchanged ? (
                              <span style={{color: '#7b1fa2', fontSize: '0.6rem', fontWeight: 'bold'}}>완료</span>
                            ) : (
                              <span style={{color: '#e65100', fontSize: '0.6rem'}}>없음</span>
                            )}
                          </label>
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', textAlign: 'center', borderRight: '1px solid var(--chestnut-light)'}}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.2rem',
                            cursor: 'pointer',
                            fontSize: '0.65rem'
                          }}>
                            <input
                              type="checkbox"
                              checked={order.isRefunded || false}
                              onChange={() => toggleRefundStatus(order.orderNumber)}
                              style={{
                                width: '12px',
                                height: '12px',
                                accentColor: '#e91e63',
                                cursor: 'pointer'
                              }}
                            />
                            {order.isRefunded ? (
                              <span style={{color: '#c2185b', fontSize: '0.6rem', fontWeight: 'bold'}}>완료</span>
                            ) : (
                              <span style={{color: '#e65100', fontSize: '0.6rem'}}>없음</span>
                            )}
                          </label>
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', borderRight: '1px solid var(--chestnut-light)'}}>
                          <input
                            type="text"
                            value={noteValues[order.orderNumber] || ''}
                            onChange={(e) => {
                              updateNoteValue(order.orderNumber, e.target.value);
                            }}
                            onBlur={(e) => {
                              updateOrderNote(order.orderNumber, e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateOrderNote(order.orderNumber, e.currentTarget.value);
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder="비고..."
                            style={{
                              width: '100%',
                              minWidth: '80px',
                              padding: '0.2rem 0.3rem',
                              border: '1px solid var(--chestnut-light)',
                              borderRadius: '3px',
                              fontSize: '0.7rem',
                              background: 'white',
                              fontFamily: 'Noto Sans KR, sans-serif'
                            }}
                          />
                        </td>
                        <td style={{padding: '0.6rem 0.4rem', textAlign: 'center'}}>
                          <div style={{display: 'flex', gap: '0.3rem', justifyContent: 'center'}}>
                            <button
                              onClick={() => handleEditOrder(order)}
                              style={{
                                padding: '0.2rem 0.4rem',
                                background: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '0.6rem'
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.orderNumber)}
                              style={{
                                padding: '0.2rem 0.4rem',
                                background: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '0.6rem'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))})()}
                  </tbody>
                </table>
              </div>
              
              {/* 페이지네이션 */}
              {filteredOrders.length > itemsPerPage && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  marginTop: '1rem',
                  padding: '1rem'
                }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.5rem 1rem',
                      background: currentPage === 1 ? '#ccc' : 'var(--chestnut-gradient)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    이전
                  </button>
                  
                  <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                    {currentPage} / {Math.ceil(filteredOrders.length / itemsPerPage)}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(filteredOrders.length / itemsPerPage), currentPage + 1))}
                    disabled={currentPage >= Math.ceil(filteredOrders.length / itemsPerPage)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: currentPage >= Math.ceil(filteredOrders.length / itemsPerPage) ? '#ccc' : 'var(--chestnut-gradient)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: currentPage >= Math.ceil(filteredOrders.length / itemsPerPage) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 관리자 전용 게시판 */}
        <AdminBoard />

        {/* 주문 추가 모달 */}
        {showAddOrderForm && (
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
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '15px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h3 style={{marginBottom: '1.5rem', color: 'var(--chestnut-brown)'}}>➕ 새 주문 추가</h3>
              
              {/* 주문자 정보 그룹 */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f8f5f0 0%, #f5f2ed 100%)',
                borderRadius: '15px',
                border: '2px solid var(--chestnut-light)',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: 'var(--chestnut-brown)',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  👤 주문자 정보
                </h3>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>주문자명 *</label>
                    <input
                      type="text"
                      value={newOrder.name}
                      onChange={(e) => setNewOrder({...newOrder, name: e.target.value})}
                      style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>주문자 연락처 *</label>
                    <input
                      type="tel"
                      value={newOrder.phone}
                      onChange={(e) => {
                        const formattedValue = formatPhoneNumber(e.target.value, setPhoneError);
                        setNewOrder({...newOrder, phone: formattedValue});
                      }}
                      placeholder="010-1234-5678"
                      style={{
                        width: '100%', 
                        padding: '0.5rem', 
                        border: phoneError ? '1px solid #ff4444' : '1px solid #ddd', 
                        borderRadius: '5px'
                      }}
                    />
                    {phoneError && (
                      <div style={{
                        color: '#ff4444',
                        fontSize: '0.8rem',
                        marginTop: '0.25rem',
                        padding: '0.25rem',
                        backgroundColor: '#fff5f5',
                        border: '1px solid #ffcccc',
                        borderRadius: '3px'
                      }}>
                        {phoneError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 수취인 정보 그룹 */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f0f8f5 0%, #edf5f2 100%)',
                borderRadius: '15px',
                border: '2px solid var(--chestnut-light)',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: 'var(--chestnut-brown)',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📦 수취인 정보
                </h3>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div>
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem'}}>
                      <label style={{fontWeight: 'bold'}}>수취인명</label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                        <input
                          type="checkbox"
                          checked={sameAsOrderer}
                          onChange={(e) => handleSameAsOrderer(e.target.checked)}
                          style={{accentColor: 'var(--chestnut-brown)'}}
                        />
                        주문자와 동일
                      </label>
                    </div>
                    <input
                      type="text"
                      value={newOrder.recipientName}
                      onChange={(e) => setNewOrder({...newOrder, recipientName: e.target.value})}
                      disabled={sameAsOrderer}
                      style={{
                        width: '100%', 
                        padding: '0.5rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '5px',
                        background: sameAsOrderer ? '#f5f5f5' : 'white'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>수취인 연락처</label>
                    <input
                      type="tel"
                      value={newOrder.recipientPhone}
                      onChange={(e) => {
                        const formattedValue = formatPhoneNumber(e.target.value, setRecipientPhoneError);
                        setNewOrder({...newOrder, recipientPhone: formattedValue});
                      }}
                      disabled={sameAsOrderer}
                      placeholder="010-1234-5678"
                      style={{
                        width: '100%', 
                        padding: '0.5rem', 
                        border: recipientPhoneError ? '1px solid #ff4444' : '1px solid #ddd', 
                        borderRadius: '5px',
                        background: sameAsOrderer ? '#f5f5f5' : 'white'
                      }}
                    />
                    {recipientPhoneError && !sameAsOrderer && (
                      <div style={{
                        color: '#ff4444',
                        fontSize: '0.8rem',
                        marginTop: '0.25rem',
                        padding: '0.25rem',
                        backgroundColor: '#fff5f5',
                        border: '1px solid #ffcccc',
                        borderRadius: '3px'
                      }}>
                        {recipientPhoneError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>배송 주소 *</label>
                <input
                  type="text"
                  value={newOrder.address}
                  onChange={(e) => setNewOrder({...newOrder, address: e.target.value})}
                  style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>상품명 *</label>
                  <select
                    value={newOrder.productName}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                  >
                    <option value="">상품을 선택하세요</option>
                    {availableProducts.map(product => (
                      <option key={product.id} value={product.name}>
                        {product.name} ({product.price})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="직접 입력..."
                    value={newOrder.productName && !availableProducts.find(p => p.name === newOrder.productName) ? newOrder.productName : ''}
                    onChange={(e) => setNewOrder({...newOrder, productName: e.target.value, productId: '', totalPrice: 0})}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', marginTop: '0.5rem'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>수량</label>
                  <select
                    value={newOrder.quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,15,20,25,30,50].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="직접 입력..."
                    min="1"
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', marginTop: '0.5rem'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>총 금액</label>
                  <input
                    type="text"
                    value={newOrder.totalPrice.toLocaleString() + '원'}
                    readOnly
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', background: '#f5f5f5'}}
                  />
                  <input
                    type="number"
                    placeholder="직접 입력..."
                    onChange={(e) => setNewOrder({...newOrder, totalPrice: parseInt(e.target.value) || 0})}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', marginTop: '0.5rem'}}
                  />
                </div>
              </div>

              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>주문일자</label>
                <input
                  type="date"
                  value={newOrder.orderDate ? (() => {
                    try {
                      // 한국 날짜 형식 "2024. 12. 25." -> "2024-12-25"
                      const dateStr = newOrder.orderDate.replace(/\. /g, '-').replace('.', '');
                      const [year, month, day] = dateStr.split('-');
                      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    } catch {
                      // KST 기준 오늘 날짜
                      const now = new Date();
                      const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
                      return kstTime.toISOString().split('T')[0];
                    }
                  })() : (() => {
                    // KST 기준 오늘 날짜
                    const now = new Date();
                    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
                    return kstTime.toISOString().split('T')[0];
                  })()}
                  onChange={(e) => {
                    const [year, month, day] = e.target.value.split('-');
                    const formattedDate = `${year}. ${parseInt(month)}. ${parseInt(day)}.`;
                    setNewOrder({...newOrder, orderDate: formattedDate});
                  }}
                  style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                />
              </div>

              <div style={{marginBottom: '1.5rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>비고</label>
                <textarea
                  value={newOrder.note}
                  onChange={(e) => setNewOrder({...newOrder, note: e.target.value})}
                  style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', minHeight: '80px'}}
                />
              </div>

              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button
                  onClick={() => {
                    setPhoneError(''); // 전화번호 에러 상태 초기화
                    setRecipientPhoneError(''); // 수취인 전화번호 에러 상태 초기화
                    setShowAddOrderForm(false);
                  }}
                  style={{
                    padding: '0.7rem 1.5rem',
                    background: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleAddOrder}
                  style={{
                    padding: '0.7rem 1.5rem',
                    background: 'var(--chestnut-gradient)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 주문 편집 모달 */}
        {editingOrder && (
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
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '15px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h3 style={{marginBottom: '1.5rem', color: 'var(--chestnut-brown)'}}>✏️ 주문 편집</h3>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>주문자명</label>
                  <input
                    type="text"
                    value={editingOrder.name}
                    onChange={(e) => setEditingOrder({...editingOrder, name: e.target.value})}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                  />
                </div>
                <div>
                  <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem'}}>
                    <label style={{fontWeight: 'bold'}}>수취인명</label>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                      <input
                        type="checkbox"
                        checked={editSameAsOrderer}
                        onChange={(e) => handleEditSameAsOrderer(e.target.checked)}
                        style={{accentColor: 'var(--chestnut-brown)'}}
                      />
                      주문자와 동일
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editingOrder.recipientName}
                    onChange={(e) => setEditingOrder({...editingOrder, recipientName: e.target.value})}
                    disabled={editSameAsOrderer}
                    style={{
                      width: '100%', 
                      padding: '0.5rem', 
                      border: '1px solid #ddd', 
                      borderRadius: '5px',
                      background: editSameAsOrderer ? '#f5f5f5' : 'white'
                    }}
                  />
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>주문자 연락처</label>
                  <input
                    type="text"
                    value={editingOrder.phone}
                    onChange={(e) => setEditingOrder({...editingOrder, phone: e.target.value})}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>수취인 연락처</label>
                  <input
                    type="text"
                    value={editingOrder.recipientPhone || ''}
                    onChange={(e) => setEditingOrder({...editingOrder, recipientPhone: e.target.value})}
                    disabled={editSameAsOrderer}
                    style={{
                      width: '100%', 
                      padding: '0.5rem', 
                      border: '1px solid #ddd', 
                      borderRadius: '5px',
                      background: editSameAsOrderer ? '#f5f5f5' : 'white'
                    }}
                  />
                </div>
              </div>

              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>배송 주소</label>
                <input
                  type="text"
                  value={editingOrder.address}
                  onChange={(e) => setEditingOrder({...editingOrder, address: e.target.value})}
                  style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>상품명</label>
                  <select
                    value={editingOrder.productName}
                    onChange={(e) => handleEditProductSelect(e.target.value)}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                  >
                    <option value="">상품을 선택하세요</option>
                    {availableProducts.map(product => (
                      <option key={product.id} value={product.name}>
                        {product.name} ({product.price})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="직접 입력..."
                    value={editingOrder.productName && !availableProducts.find(p => p.name === editingOrder.productName) ? editingOrder.productName : ''}
                    onChange={(e) => setEditingOrder({...editingOrder, productName: e.target.value, productId: '', totalPrice: 0})}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', marginTop: '0.5rem'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>수량</label>
                  <select
                    value={editingOrder.quantity}
                    onChange={(e) => handleEditQuantityChange(parseInt(e.target.value))}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,15,20,25,30,50].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="직접 입력..."
                    min="1"
                    onChange={(e) => handleEditQuantityChange(parseInt(e.target.value) || 1)}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', marginTop: '0.5rem'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>총 금액</label>
                  <input
                    type="text"
                    value={editingOrder.totalPrice.toLocaleString() + '원'}
                    readOnly
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', background: '#f5f5f5'}}
                  />
                  <input
                    type="number"
                    placeholder="직접 입력..."
                    onChange={(e) => setEditingOrder({...editingOrder, totalPrice: parseInt(e.target.value) || 0})}
                    style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', marginTop: '0.5rem'}}
                  />
                </div>
              </div>

              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>주문일자</label>
                <input
                  type="date"
                  value={editingOrder.orderDate ? (() => {
                    try {
                      // 한국 날짜 형식 "2024. 12. 25." -> "2024-12-25"
                      const dateStr = editingOrder.orderDate.replace(/\. /g, '-').replace('.', '');
                      const [year, month, day] = dateStr.split('-');
                      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    } catch {
                      // KST 기준 오늘 날짜
                      const now = new Date();
                      const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
                      return kstTime.toISOString().split('T')[0];
                    }
                  })() : (() => {
                    // KST 기준 오늘 날짜
                    const now = new Date();
                    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
                    return kstTime.toISOString().split('T')[0];
                  })()}
                  onChange={(e) => {
                    const [year, month, day] = e.target.value.split('-');
                    const formattedDate = `${year}. ${parseInt(month)}. ${parseInt(day)}.`;
                    setEditingOrder({...editingOrder, orderDate: formattedDate});
                  }}
                  style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                />
              </div>

              <div style={{marginBottom: '1.5rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>비고</label>
                <textarea
                  value={editingOrder.note || ''}
                  onChange={(e) => setEditingOrder({...editingOrder, note: e.target.value})}
                  style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', minHeight: '80px'}}
                />
              </div>

              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button
                  onClick={() => setEditingOrder(null)}
                  style={{
                    padding: '0.7rem 1.5rem',
                    background: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleUpdateOrder}
                  style={{
                    padding: '0.7rem 1.5rem',
                    background: 'var(--chestnut-gradient)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  수정
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 주문 완료 요약 모달 */}
        {showOrderSummary && completedOrder && (
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
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '15px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{textAlign: 'center', marginBottom: '2rem'}}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>✅</div>
                <h3 style={{color: 'var(--chestnut-brown)', marginBottom: '0.5rem'}}>주문이 성공적으로 추가되었습니다!</h3>
                <p style={{color: 'var(--text-light)', fontSize: '0.9rem'}}>주문 정보를 확인해주세요.</p>
              </div>

              <div style={{
                background: 'var(--soft-beige)',
                padding: '1.5rem',
                borderRadius: '10px',
                marginBottom: '2rem'
              }}>
                <div style={{display: 'grid', gap: '0.8rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>주문번호:</span>
                    <span style={{fontFamily: 'monospace', color: 'var(--chestnut-dark)'}}>{completedOrder.orderNumber}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>주문일자:</span>
                    <span>{completedOrder.orderDate}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>주문자:</span>
                    <span>{completedOrder.name}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>수취인:</span>
                    <span>{completedOrder.recipientName || completedOrder.name}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>연락처:</span>
                    <span>{completedOrder.recipientPhone || completedOrder.phone}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>배송지:</span>
                    <span style={{textAlign: 'right', maxWidth: '60%'}}>{completedOrder.address}</span>
                  </div>
                  <hr style={{border: 'none', borderTop: '1px solid var(--chestnut-light)', margin: '0.5rem 0'}} />
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>상품:</span>
                    <span>{completedOrder.productName}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>수량:</span>
                    <span>{completedOrder.quantity}개</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem'}}>
                    <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>총 금액:</span>
                    <span style={{fontWeight: 'bold', color: 'var(--golden-brown)'}}>{completedOrder.totalPrice.toLocaleString()}원</span>
                  </div>
                  {completedOrder.note && (
                    <>
                      <hr style={{border: 'none', borderTop: '1px solid var(--chestnut-light)', margin: '0.5rem 0'}} />
                      <div>
                        <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)', display: 'block', marginBottom: '0.3rem'}}>비고:</span>
                        <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>{completedOrder.note}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{textAlign: 'center'}}>
                <button
                  onClick={() => {
                    setShowOrderSummary(false);
                    setCompletedOrder(null);
                  }}
                  style={{
                    padding: '0.8rem 2rem',
                    background: 'var(--chestnut-gradient)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

