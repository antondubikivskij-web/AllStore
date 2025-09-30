import { useState, useEffect } from 'react'
import './App.css'
// Version: 3.0 - API Integration
function App() {
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('allstore-cart')
    return savedCart ? JSON.parse(savedCart) : []
  })
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutData, setCheckoutData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: ''
  })
  const [orderData, setOrderData] = useState(null)
  const [showOrderStatus, setShowOrderStatus] = useState(false)
  const [particles, setParticles] = useState([])
  const [products, setProducts] = useState([])
  const [discountedProducts, setDiscountedProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(null)
  const [productsLoading, setProductsLoading] = useState(true)

  const [reviews, setReviews] = useState([])
  const [newReview, setNewReview] = useState({
    name: '',
    text: ''
  })

  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api'

  // Функция загрузки товаров
  const fetchProducts = async () => {
    setProductsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/products`)
      if (response.ok) {
        const data = await response.json()
        // Добавляем изображения для товаров
        const productsWithImages = data.map(product => ({
          ...product,
          image: product.image || `https://via.placeholder.com/400x300?text=AllStore+Product`,
          rating: (Math.random() * 2 + 3).toFixed(1), // Рейтинг от 3 до 5
          finalPrice: product.discount > 0 ? product.discounted_price : product.price
        }))
        setProducts(productsWithImages)
      } else {
        throw new Error('Помилка завантаження товарів')
      }
    } catch (error) {
      console.error('Помилка завантаження товарів:', error)
      setError('Не вдалося завантажити товари. Перевірте підключення до сервера.')
      // Встановлюємо порожній масив замість фейкових даних
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }
  
  // Функция загрузки товаров (закоментована, не використовується)
  const fetchDiscountedProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/discounted`)
      if (response.ok) {
        const data = await response.json()
        // Повертаємо товари
        return data.map(product => ({
          ...product,
          image: product.image || `https://via.placeholder.com/400x300?text=AllStore+Product`,
          rating: (Math.random() * 2 + 3).toFixed(1), // Рейтинг от 3 до 5
          finalPrice: product.discounted_price
        }))
      }
      return []
    } catch (error) {
      console.error('Помилка завантаження товарів:', error)
      return []
    }
  }

  // Загрузка товаров из API
  useEffect(() => {
    const checkSiteStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/site-status`)
        if (response.ok) {
          const status = await response.json()
          if (!status.enabled) {
            setError(status.message || 'Сайт на оновленні. Скоро повернемося!')
            setLoading(false)
            return
          }
          
          // Статус відображення (не використовується)
          const showDiscounts = status.show_discounts !== undefined ? status.show_discounts : true
          // Очищаємо масив (не використовується)
          if (!showDiscounts) {
            setDiscountedProducts([])
          }
        }
      } catch (error) {
        console.error('Помилка перевірки статусу сайту:', error)
      }

      const fetchCategories = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/categories`)
          if (response.ok) {
            const data = await response.json()
            setCategories(data)
          }
        } catch (error) {
          console.error('Ошибка загрузки категорий:', error)
        }
      }

      fetchProducts()
      fetchCategories()
      
      // Загружаємо додаткові товари (не використовується)
      const siteStatusResponse = await fetch(`${API_BASE_URL}/site-status`)
      if (siteStatusResponse.ok) {
        const siteStatus = await siteStatusResponse.json()
        if (siteStatus.show_discounts) {
          const discounted = await fetchDiscountedProducts()
          setDiscountedProducts(discounted)
        } else {
          setDiscountedProducts([])
        }
      } else {
        // Якщо не вдалося отримати статус, за замовчуванням завантажуємо товари
        const discounted = await fetchDiscountedProducts()
        setDiscountedProducts(discounted)
      }
      
      // Simulate loading
      const timer = setTimeout(() => {
        setLoading(false)
      }, 1000)

      return () => clearTimeout(timer)
    }

    checkSiteStatus()
  }, [])

  // Фильтрация товаров
  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.category === selectedCategory
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  useEffect(() => {
    // Back to top functionality
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const createParticles = (x, y) => {
    const newParticles = []
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      // Використовуємо звичайну ціну
      const priceToUse = product.price
      
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1, price: priceToUse }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1, price: priceToUse }]
    })
    
    // Create particles effect
    createParticles(Math.random() * window.innerWidth, Math.random() * window.innerHeight)
    
    // Show notification
    showNotification(`${product.name} додано до кошика!`)
  }

  const showNotification = (message) => {
    const notification = document.createElement('div')
    notification.className = 'notification'
    notification.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.classList.add('show')
    }, 100)
    
    setTimeout(() => {
      notification.classList.remove('show')
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(prev => prev.map(item => 
      item.id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  const clearCart = () => {
    setCart([])
    showNotification('Кошик очищено!')
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      // Використовуємо звичайну ціну товару
      const priceToUse = item.price
      return total + (priceToUse * item.quantity)
    }, 0)
  }

  const getCartItemsCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handleAddReview = (e) => {
    e.preventDefault()
    if (newReview.name.trim() && newReview.text.trim()) {
      const review = {
        name: newReview.name.trim(),
        text: newReview.text.trim(),
        date: new Date().toLocaleDateString('uk-UA')
      }
      setReviews(prev => [review, ...prev])
      setNewReview({ name: '', text: '' })
      showNotification('Відгук успішно додано!')
    }
  }

  // Сохранение корзины в localStorage
  useEffect(() => {
    localStorage.setItem('allstore-cart', JSON.stringify(cart))
  }, [cart])

  const openModal = (product) => {
    setSelectedProduct(product)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedProduct(null)
  }

  const openCart = () => {
    setShowCart(true)
  }

  const closeCart = () => {
    setShowCart(false)
  }

  const openCheckout = () => {
    setShowCart(false)
    setShowCheckout(true)
  }

  const closeCheckout = () => {
    setShowCheckout(false)
    setCheckoutData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      delivery_address: ''
    })
  }

  const closeOrderStatus = () => {
    setShowOrderStatus(false)
    setOrderData(null)
  }

  // Функция для проверки статуса заказа
  const checkOrderStatus = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrderData(data)
      } else {
        throw new Error('Помилка отримання інформації про замовлення')
      }
    } catch (error) {
      console.error('Помилка отримання інформації про замовлення:', error)
      showNotification('Помилка отримання інформації про замовлення. Спробуйте ще раз.')
    }
  }

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_name: checkoutData.customer_name,
          customer_phone: checkoutData.customer_phone,
          customer_email: checkoutData.customer_email,
          delivery_address: checkoutData.delivery_address,
          total_amount: getCartTotal(),
          items: cart
        })
      })

      if (response.ok) {
        const data = await response.json()
        setOrderData(data.order)
        setCart([])
        closeCheckout()
        setShowOrderStatus(true)
        showNotification('Замовлення успішно оформлено!')
      } else {
        throw new Error('Помилка оформлення замовлення')
      }
    } catch (error) {
      console.error('Помилка оформлення замовлення:', error)
      showNotification('Помилка оформлення замовлення. Спробуйте ще раз.')
    }
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  // Particle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life - 0.02
          }))
          .filter(particle => particle.life > 0)
      )
    }, 50)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <h2>AllStore</h2>
          <p>Завантаження...</p>
        </div>
      </div>
    )
  }

  // Показати сторінку обслуговування, якщо сайт вимкнений
  if (error && error.includes('на оновленні')) {
    return (
      <div className="maintenance-screen">
        <div className="maintenance-content">
          <div className="maintenance-icon">
            <i className="fas fa-tools"></i>
          </div>
          <h1>Сайт на оновленні</h1>
          <p>{error}</p>
          <button 
            className="admin-access-btn"
            onClick={() => window.open('/admin', '_blank')}
          >
            <i className="fas fa-cog"></i> Адмін-панель
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: particle.x,
            top: particle.y,
            opacity: particle.life,
            transform: `scale(${particle.life})`
          }}
        >
          ✨
        </div>
      ))}

      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <div className="logo-icon">
              <i className="fas fa-shopping-bag"></i>
            </div>
            <span className="logo-text">AllStore</span>
          </div>
          <nav className="nav">
            <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Головна</a>
            <a href="#products" onClick={(e) => { e.preventDefault(); scrollToSection('products'); }}>Товари</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Контакти</a>
          </nav>
          <div className="header-actions">
            <div className="cart-icon" onClick={openCart}>
              <i className="fas fa-shopping-cart"></i>
              {getCartItemsCount() > 0 && <span className="cart-count">{getCartItemsCount()}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Banner */}
      <section className="banner" id="home">
        <div className="banner-container">
          <div className="banner-text">
            <h1>Якісні товари для вас</h1>
            <p>Підпишіться на новини та дізнайтеся найкраще для себе!</p>
            <a href="#products" className="banner-button" onClick={(e) => { e.preventDefault(); scrollToSection('products'); }}>Подивитися товари</a>
          </div>
          <div className="banner-image">
            <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500" alt="Щасливі покупці" crossorigin="anonymous" />
          </div>
        </div>
      </section>



      {/* Products */}
      <section className="products" id="products">
        <div className="container">
          <h2>Топові товари для вас</h2>
          
          {/* Search and Filter */}
          <div className="search-filter-container">
            <div className="search-box">
              <input
                type="text"
                placeholder="Пошук товарів..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <i className="fas fa-search search-icon"></i>
            </div>
            
            {categories.length > 0 && (
              <div className="category-filter">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-select"
                >
                  <option value="">Всі категорії</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="product-grid">
            {productsLoading ? (
              <div className="loading-products">
                <div className="spinner"></div>
                <p>Завантаження товарів...</p>
              </div>
            ) : error ? (
              <div className="error-message">
                <i className="fas fa-exclamation-triangle"></i>
                <p>{error}</p>
                <button 
                  className="retry-btn"
                  onClick={() => {
                    setError(null)
                    fetchProducts()
                  }}
                >
                  Спробувати знову
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="no-products">
                <i className="fas fa-search"></i>
                <p>Товари не знайдено</p>
                <button 
                  className="clear-filters-btn"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('')
                  }}
                >
                  Очистити фільтри
                </button>
              </div>
            ) : (
                          filteredProducts.map((product) => (
              <div key={product.id} className="product-card" onClick={() => openModal(product)}>
                <div className="product-card-3d">
                  <img src={product.image} alt={product.name} className="product-img" />
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <div className="rating">
                      {[...Array(5)].map((_, i) => (
                        <i 
                          key={i} 
                          className={`fas fa-star ${i < Math.floor(product.rating) ? 'filled' : i < product.rating ? 'half' : ''}`}
                        ></i>
                      ))}
                      <span>{product.rating}</span>
                    </div>
                    <div className="price">
                      <span>{product.price} ₴</span>
                    </div>
                    <button 
                      className="buy-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                    >
                      Купити
                    </button>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
          <div style={{textAlign: 'center', marginTop: '30px'}}>
            <a href="#" className="banner-button">Переглянути всі товари</a>
          </div>
          
          {/* Reviews under products */}
          <div className="reviews-section" style={{marginTop: '60px'}}>
            <h2>Відгуки наших клієнтів</h2>
            
            {/* Add Review Form */}
            <div className="add-review-form">
              <h3>Залишити відгук</h3>
              <form onSubmit={handleAddReview} className="review-form">
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Ваше ім'я"
                    value={newReview.name}
                    onChange={(e) => setNewReview({...newReview, name: e.target.value})}
                    required
                    className="review-input"
                  />
                </div>
                <div className="form-group">
                  <textarea
                    placeholder="Ваш відгук"
                    value={newReview.text}
                    onChange={(e) => setNewReview({...newReview, text: e.target.value})}
                    required
                    rows="3"
                    className="review-textarea"
                  />
                </div>
                <button type="submit" className="submit-review-btn">
                  <i className="fas fa-paper-plane"></i> Відправити відгук
                </button>
              </form>
            </div>
            
            {/* Reviews List */}
            <div className="reviews-grid">
              {reviews.length === 0 ? (
                <div className="no-reviews">
                  <i className="fas fa-comments"></i>
                  <p>Поки що немає відгуків. Будьте першим!</p>
                </div>
              ) : (
                reviews.map((review, index) => (
                  <div key={index} className="review-card">
                    <div className="review-header">
                      <div className="review-icon">
                        <i className="fas fa-user"></i>
                      </div>
                      <div className="review-name">{review.name}</div>
                    </div>
                    <div className="review-content">
                      <p>{review.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>



      {/* Subscribe Section */}
      <section className="subscribe-section">
        <div className="container">
          <h2>Підпишіться на повідомлення про нові товари</h2>
          <div className="telegram-buttons">
            <a 
              href="https://t.me/AllStoreUA2312" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="telegram-link" 
              style={{cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}
            >
              <i className="fab fa-telegram"></i> Підписатися на Telegram канал
            </a>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer id="contact">
        <div className="container">
          <p>© 2025 AllStore. Всі права захищені.</p>
          <p>Інтернет-магазин цікавих товарів для вас.</p>
        </div>
      </footer>

      {/* Product Modal */}
      {showModal && selectedProduct && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <i className="fas fa-times"></i>
            </button>
            <div className="modal-body">
              <div className="modal-image">
                <img src={selectedProduct.image} alt={selectedProduct.name} />
              </div>
              <div className="modal-info">
                <h2>{selectedProduct.name}</h2>
                <div className="modal-rating">
                  {[...Array(5)].map((_, i) => (
                    <i 
                      key={i} 
                      className={`fas fa-star ${i < Math.floor(selectedProduct.rating) ? 'filled' : i < selectedProduct.rating ? 'half' : ''}`}
                    ></i>
                  ))}
                  <span>{selectedProduct.rating}</span>
                </div>
                <p className="modal-description">{selectedProduct.description}</p>
                {selectedProduct.specifications && (
                  <div className="modal-specifications">
                    <h4>Характеристики:</h4>
                    <div className="specifications-list">
                      {selectedProduct.specifications.split('\n').map((spec, index) => (
                        spec.trim() && <div key={index} className="spec-item">{spec}</div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="modal-price">
                  <span>{selectedProduct.price} ₴</span>
                </div>
                <button 
                  className="modal-buy-btn"
                  onClick={() => {
                    addToCart(selectedProduct);
                    closeModal();
                  }}
                >
                  Додати в кошик
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="modal-overlay" onClick={closeCart}>
          <div className="modal-content cart-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeCart}>
              <i className="fas fa-times"></i>
            </button>
            <div className="cart-header">
              <h2>Кошик покупок</h2>
              <div className="cart-header-actions">
                <span className="cart-items-count">{getCartItemsCount()} товарів</span>
                {cart.length > 0 && (
                  <button 
                    className="clear-cart-btn"
                    onClick={clearCart}
                    title="Очистити кошик"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
            </div>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <i className="fas fa-shopping-cart"></i>
                <p>Ваш кошик порожній</p>
                <button className="banner-button" onClick={closeCart}>
                  Продовжити покупки
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <img src={item.image} alt={item.name} className="cart-item-image" />
                      <div className="cart-item-info">
                        <h3>{item.name}</h3>
                        <p className="cart-item-price">{item.price} ₴</p>
                      </div>
                      <div className="cart-item-quantity">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="quantity-btn"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="quantity-btn"
                        >
                          +
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="remove-btn"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cart-footer">
                  <div className="cart-total">
                    <span>Загальна сума:</span>
                    <span className="total-price">{getCartTotal()} ₴</span>
                  </div>
                  <button className="checkout-btn" onClick={openCheckout}>
                    Оформити замовлення
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button className="back-to-top" onClick={scrollToTop}>
          <i className="fas fa-arrow-up"></i>
        </button>
      )}

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>



      {/* Checkout Modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={closeCheckout}>
          <div className="modal-content checkout-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeCheckout}>
              <i className="fas fa-times"></i>
            </button>
            <div className="checkout-header">
              <h2>Оформлення замовлення</h2>
              <p>Заповніть ваші дані для доставки</p>
            </div>
            <form onSubmit={handleCheckoutSubmit} className="checkout-form">
              <div className="form-group">
                <label>Ім'я та прізвище *</label>
                <input
                  type="text"
                  value={checkoutData.customer_name}
                  onChange={(e) => setCheckoutData({...checkoutData, customer_name: e.target.value})}
                  required
                  placeholder="Введіть ваше ім'я"
                />
              </div>
              <div className="form-group">
                <label>Номер телефону *</label>
                <input
                  type="tel"
                  value={checkoutData.customer_phone}
                  onChange={(e) => {
                    // Валидация: только цифры и '+'
                    const value = e.target.value.replace(/[^0-9+]/g, '');
                    // Ограничение длины для украинского номера (+380 XX XXX XX XX)
                    if (value.length <= 13) {
                      setCheckoutData({...checkoutData, customer_phone: value});
                    }
                  }}
                  pattern="\+380[0-9]{9}"
                  required
                  placeholder="+380XXXXXXXXX"
                  title="Введіть номер у форматі +380XXXXXXXXX"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={checkoutData.customer_email}
                  onChange={(e) => setCheckoutData({...checkoutData, customer_email: e.target.value})}
                  required
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-group">
                <label>Адреса доставки *</label>
                <textarea
                  value={checkoutData.delivery_address}
                  onChange={(e) => setCheckoutData({...checkoutData, delivery_address: e.target.value})}
                  required
                  placeholder="Введіть повну адресу доставки"
                  rows="3"
                />
              </div>
              <div className="checkout-summary">
                <h3>Підсумок замовлення</h3>
                <div className="summary-items">
                  {cart.map((item) => (
                    <div key={item.id} className="summary-item">
                      <span>{item.name} x{item.quantity}</span>
                      <span>{item.price * item.quantity} ₴</span>
                    </div>
                  ))}
                </div>
                <div className="summary-total">
                  <strong>Загальна сума: {getCartTotal()} ₴</strong>
                </div>
              </div>
              <button type="submit" className="submit-order-btn">
                Підтвердити замовлення
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Status Modal */}
      {showOrderStatus && orderData && (
        <div className="modal-overlay" onClick={closeOrderStatus}>
          <div className="modal-content order-status-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeOrderStatus}>
              <i className="fas fa-times"></i>
            </button>
            <div className="order-status-header">
              <h2>Інформація про замовлення</h2>
              <p>Замовлення #{orderData.id}</p>
            </div>
            <div className="order-status-body">
              <div className="order-status-info">
                <div className="status-badge">
                  <span className={`status-${orderData.status?.toLowerCase()}`}>
                    {orderData.status === 'PENDING' && 'Очікує обробки'}
                    {orderData.status === 'PROCESSING' && 'В обробці'}
                    {orderData.status === 'SHIPPED' && 'Відправлено'}
                    {orderData.status === 'DELIVERED' && 'Доставлено'}
                    {orderData.status === 'CANCELLED' && 'Скасовано'}
                  </span>
                </div>
                <p><strong>Дата замовлення:</strong> {new Date(orderData.created_at).toLocaleString()}</p>
              </div>
              
              <div className="order-customer-details">
                <h3>Інформація про покупця</h3>
                <p><strong>Ім'я:</strong> {orderData.customer_name}</p>
                <p><strong>Телефон:</strong> {orderData.customer_phone}</p>
                <p><strong>Email:</strong> {orderData.customer_email}</p>
                <p><strong>Адреса доставки:</strong> {orderData.delivery_address}</p>
              </div>
              
              <div className="order-items-list">
                <h3>Замовлені товари</h3>
                <div className="order-items">
                  {orderData.items?.map((item) => (
                    <div key={item.id} className="order-item">
                      <div className="order-item-info">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{item.price * item.quantity} ₴</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="order-total">
                  <strong>Загальна сума: {orderData.total_amount} ₴</strong>
                </div>
              </div>
              
              <div className="order-actions">
                <button 
                  className="check-status-btn" 
                  onClick={() => checkOrderStatus(orderData.id)}
                >
                  <i className="fas fa-sync-alt"></i> Оновити статус
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
