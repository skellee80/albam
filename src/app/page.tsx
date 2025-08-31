'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  provider: 'email' | 'google';
  createdAt: string;
}

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const [products, setProducts] = useState([
    {
      id: 1,
      name: "알밤 1kg",
      description: "신선하고 달콤한 청양 알밤 1kg입니다. 당일 수확한 싱싱한 알밤을 드시는 즉시 맛보실 수 있습니다.",
      price: "15,000원",
      emoji: "🌰",
      image: ""
    },
    {
      id: 2,
      name: "알밤 3kg",
      description: "가족이 함께 드시기 좋은 3kg 대용량 포장입니다. 신선도와 품질을 보장합니다.",
      price: "40,000원",
      emoji: "🌰",
      image: ""
    },
    {
      id: 3,
      name: "알밤 5kg",
      description: "대가족이나 업체용으로 적합한 5kg 포장입니다. 대량 주문 시 할인 혜택이 있습니다.",
      price: "65,000원",
      emoji: "🌰",
      image: ""
    },
    {
      id: 4,
      name: "껍질 깐 알밤 500g",
      description: "바로 드실 수 있도록 껍질을 깐 알밤입니다. 요리나 간식용으로 편리하게 이용하세요.",
      price: "12,000원",
      emoji: "🥜",
      image: ""
    },
    {
      id: 5,
      name: "구운 알밤 1kg",
      description: "전통 방식으로 구운 고소하고 달콤한 알밤입니다. 따뜻할 때 드시면 더욱 맛있습니다.",
      price: "18,000원",
      emoji: "🔥",
      image: ""
    },
    {
      id: 6,
      name: "알밤 선물세트",
      description: "고급 포장지에 담은 프리미엄 선물세트입니다. 명절이나 특별한 날 선물하기 좋습니다.",
      price: "35,000원",
      emoji: "🎁",
      image: ""
    }
  ]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductFile, setSelectedProductFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string>('');

  // 관리자 세션 및 사용자 로그인 확인
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdmin(true);
    }

    // Firebase Auth에서 사용자 상태 자동 관리
    
    // 저장된 상품 데이터 로드
    const savedProducts = localStorage.getItem('chestnutProducts');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }
  }, []);

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 상품 저장
  const saveProducts = (updatedProducts: any[]) => {
    setProducts(updatedProducts);
    localStorage.setItem('chestnutProducts', JSON.stringify(updatedProducts));
  };

  // 상품 수정
  const handleEditProduct = (product: any) => {
    setEditingProduct({...product});
    setProductImagePreview(product.image || '');
  };

  // 상품 이미지 파일 처리
  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB 제한
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }
      
      setSelectedProductFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setProductImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

    // 상품 업데이트
  const handleUpdateProduct = () => {
    if (!editingProduct.name?.trim() || !editingProduct.description?.trim() || !editingProduct.price?.trim()) {
      alert('이름, 설명, 가격을 모두 입력해주세요.');
      return;
    }

    const updatedProduct = {
      ...editingProduct,
      image: productImagePreview || editingProduct.emoji || '🌰'
    };

    const updatedProducts = products.map(p => 
      p.id === editingProduct.id ? updatedProduct : p
    );
    saveProducts(updatedProducts);
    setEditingProduct(null);
    setSelectedProductFile(null);
    setProductImagePreview('');
  };

  // 상품 삭제
  const handleDeleteProduct = (id: number) => {
    if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
      const updatedProducts = products.filter(p => p.id !== id);
      saveProducts(updatedProducts);
    }
  };

  // 새 상품 추가
  const handleAddProduct = () => {
    if (!editingProduct?.name?.trim() || !editingProduct?.description?.trim() || !editingProduct?.price?.trim()) {
      alert('이름, 설명, 가격을 모두 입력해주세요.');
      return;
    }
    
    const newProduct = {
      ...editingProduct,
      id: Math.max(...products.map(p => p.id)) + 1,
      image: productImagePreview || editingProduct.emoji || '🌰'
    };
    
    const updatedProducts = [...products, newProduct];
    saveProducts(updatedProducts);
    setEditingProduct(null);
    setShowAddForm(false);
    setSelectedProductFile(null);
    setProductImagePreview('');
  };

  return (
    <>
      {/* 헤더 */}
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
            칠갑산 알밤 농장
          </Link>
          <nav className="nav">
            <Link href="/" className="nav-link nav-link-active">홈</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/farm-intro" className="nav-link">농장 소개</Link>
            <Link href="/production" className="nav-link">생산 과정</Link>
            <Link href="/storage" className="nav-link">저장 방법</Link>
            <Link href="/location" className="nav-link">오시는 길</Link>
            <Link href="/notice" className="nav-link">공지사항</Link>
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
            {currentUser && userData ? (
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
              <Link href="/auth" className="nav-link" style={{
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

      {/* 메인 컨텐츠 */}
      <div className="container">
        {/* 히어로 섹션 */}
        <section className="hero">
          <h1>🍂 수확의 계절, 청양 알밤 🍂</h1>
          <p>
            충남 청양의 청정 자연에서 정성껏 키운 달콤하고 고소한 알밤을 
            농가에서 직접 판매합니다. 신선함과 품질을 보장하는 청양 칠갑산 알밤 농장의 알밤을 만나보세요.
          </p>
        </section>

        {/* 알밤 상품 썸네일 */}
        <section>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem'}}>
            <h2 style={{ 
              fontSize: '2.5rem', 
              color: 'var(--primary-brown)', 
              fontWeight: '700',
              margin: 0
            }}>
              🌰 알밤 상품 둘러보기
            </h2>
            {isAdmin && (
              <button 
                onClick={() => {
                                          setEditingProduct({name: '', description: '', price: '', emoji: ''});
                        setShowAddForm(true);
                }}
                className="btn"
              >
                ➕ 상품 추가
              </button>
            )}
          </div>
          
          <div className="thumbnails-grid">
            {products.map((product) => (
              <div key={product.id} className="thumbnail-card">
                <div className="thumbnail-image">
                  {product.image && product.image.startsWith('data:') ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '10px'
                      }}
                    />
                  ) : (
                    product.emoji || product.image || '🌰'
                  )}
                </div>
                <div className="thumbnail-content">
                  <h3 className="thumbnail-title">{product.name}</h3>
                  <p className="thumbnail-description">{product.description}</p>
                  <p className="thumbnail-price">{product.price}</p>
                  <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                    <Link href={`/purchase?product=${product.id}`} className="btn" style={{flex: 1}}>
                      주문하기
                    </Link>
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className="btn btn-secondary"
                          style={{padding: '0.5rem'}}
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="btn"
                          style={{background: '#dc3545', padding: '0.5rem'}}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 상품 편집 모달 */}
        {(editingProduct && !showAddForm) && (
          <div className="modal-overlay">
            <div className="card modal-content">
              <h2>✏️ 상품 수정</h2>
              
              <div className="form-group">
                <label className="form-label">상품 이미지</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProductFileChange}
                  className="form-input"
                  style={{padding: '0.5rem'}}
                />
                <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem'}}>
                  * 이미지 파일만 업로드 가능 (최대 5MB)
                </p>
                

                
                {productImagePreview && (
                  <div style={{marginTop: '1rem'}}>
                    <p style={{fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>미리보기:</p>
                    <div style={{
                      width: '100px',
                      height: '100px',
                      border: '2px solid var(--chestnut-light)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f9f9f9'
                    }}>
                      {productImagePreview.startsWith('data:') ? (
                        <img 
                          src={productImagePreview} 
                          alt="미리보기" 
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <span style={{fontSize: '3rem'}}>{productImagePreview}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductFile(null);
                        setProductImagePreview('');
                      }}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.3rem 0.8rem',
                        background: 'var(--chestnut-dark)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      이미지 제거
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">상품명</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="form-input"
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label className="form-label">상품 설명</label>
                <textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="form-input form-textarea"
                  placeholder="상품에 대한 자세한 설명을 입력하세요"
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label className="form-label">가격</label>
                <input
                  type="text"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                  className="form-input"
                  placeholder="15,000원"
                />
              </div>

              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button 
                  onClick={() => setEditingProduct(null)} 
                  className="btn btn-secondary"
                >
                  취소
                </button>
                <button 
                  onClick={handleUpdateProduct} 
                  className="btn"
                >
                  수정 완료
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 상품 추가 모달 */}
        {(editingProduct && showAddForm) && (
          <div className="modal-overlay">
            <div className="card modal-content">
              <h2>➕ 새 상품 추가</h2>
              
              <div className="form-group">
                <label className="form-label">상품 이미지</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProductFileChange}
                  className="form-input"
                  style={{padding: '0.5rem'}}
                />
                <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem'}}>
                  * 이미지 파일만 업로드 가능 (최대 5MB)
                </p>
                

                
                {productImagePreview && (
                  <div style={{marginTop: '1rem'}}>
                    <p style={{fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>미리보기:</p>
                    <div style={{
                      width: '100px',
                      height: '100px',
                      border: '2px solid var(--chestnut-light)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f9f9f9'
                    }}>
                      {productImagePreview.startsWith('data:') ? (
                        <img 
                          src={productImagePreview} 
                          alt="미리보기" 
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <span style={{fontSize: '3rem'}}>{productImagePreview}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductFile(null);
                        setProductImagePreview('');
                      }}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.3rem 0.8rem',
                        background: 'var(--chestnut-dark)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      이미지 제거
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">상품명</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="form-input"
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label className="form-label">상품 설명</label>
                <textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="form-input form-textarea"
                  placeholder="상품에 대한 자세한 설명을 입력하세요"
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label className="form-label">가격</label>
                <input
                  type="text"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                  className="form-input"
                  placeholder="15,000원"
                />
              </div>

              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button 
                  onClick={() => {
                    setEditingProduct(null);
                    setShowAddForm(false);
                  }} 
                  className="btn btn-secondary"
                >
                  취소
                </button>
                <button 
                  onClick={handleAddProduct} 
                  className="btn"
                >
                  추가하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 농장 소개 미리보기 */}
        <section className="card">
          <h2>🚜 청양 칠갑산 알밤 농장 이야기</h2>
          <p>
            30년간 알밤 재배에만 전념해온 청양 칠갑산 알밤 농장은 충남 청양의 청정 자연환경에서 
            무농약으로 알밤을 재배하고 있습니다. 건강하고 맛있는 알밤을 생산하기 위해 
            끊임없이 연구하고 노력하고 있습니다.
          </p>
          <Link href="/farm-intro" className="btn" style={{marginTop: '1rem'}}>
            농장 소개 자세히 보기
          </Link>
        </section>


      </div>

      {/* 푸터 */}
      <footer className="footer">
        <div className="footer-content">
          <h3>🌰 청양 칠갑산 알밤 농장</h3>
          <p>주소: 충남 청양군 남양면 충절로 265-27</p>
          <p>대표자: 이기영</p>
          <p>연락처: 010-9123-9287</p>
          <p style={{marginTop: '2rem', opacity: '0.8'}}>
            © 2024 청양 칠갑산 알밤 농장. 신선하고 건강한 알밤을 정성껏 전해드립니다.
          </p>
        </div>
      </footer>

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