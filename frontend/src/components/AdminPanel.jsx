import { useState, useEffect } from 'react'
import './AdminPanel.css'


function AdminPanel({ onClose, onProductUpdate }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [stats, setStats] = useState({})
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    stock: '',
    image: ''
  })
  const [editingProduct, setEditingProduct] = useState(null)
  // Категорії та підкатегорії
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [newSubcategory, setNewSubcategory] = useState('')
  const [editingSubcategory, setEditingSubcategory] = useState(null)

  const API_BASE_URL = 'http://localhost:3001/api'

  useEffect(() => {
    if (isLoggedIn) {
      fetchStats()
      fetchProducts()
      fetchOrders()
      fetchCategories()
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (selectedCategoryId) {
      fetchSubcategories(selectedCategoryId)
    } else {
      setSubcategories([])
    }
  }, [selectedCategoryId])
  // Категорії
  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/admin/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (e) { console.error('Помилка завантаження категорій', e) }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    try {
      const res = await fetch('http://localhost:3001/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory })
      })
      if (res.ok) {
        setNewCategory('')
        fetchCategories()
      }
    } catch (e) { alert('Помилка додавання категорії') }
  }

  const handleEditCategory = async (e) => {
    e.preventDefault()
    if (!editingCategory?.name.trim()) return
    try {
      const res = await fetch(`http://localhost:3001/api/admin/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategory.name })
      })
      if (res.ok) {
        setEditingCategory(null)
        fetchCategories()
      }
    } catch (e) { alert('Помилка редагування категорії') }
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Видалити категорію?')) return
    try {
      const res = await fetch(`http://localhost:3001/api/admin/categories/${id}`, { method: 'DELETE' })
      if (res.ok) fetchCategories()
    } catch (e) { alert('Помилка видалення категорії') }
  }

  // Підкатегорії
  const fetchSubcategories = async (categoryId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/subcategories?category_id=${categoryId}`)
      if (res.ok) {
        const data = await res.json()
        setSubcategories(data)
      }
    } catch (e) { console.error('Помилка завантаження підкатегорій', e) }
  }

  const handleAddSubcategory = async (e) => {
    e.preventDefault()
    if (!newSubcategory.trim() || !selectedCategoryId) return
    try {
      const res = await fetch('http://localhost:3001/api/admin/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubcategory, category_id: selectedCategoryId })
      })
      if (res.ok) {
        setNewSubcategory('')
        fetchSubcategories(selectedCategoryId)
      }
    } catch (e) { alert('Помилка додавання підкатегорії') }
  }

  const handleEditSubcategory = async (e) => {
    e.preventDefault()
    if (!editingSubcategory?.name.trim() || !selectedCategoryId) return
    try {
      const res = await fetch(`http://localhost:3001/api/admin/subcategories/${editingSubcategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSubcategory.name, category_id: selectedCategoryId })
      })
      if (res.ok) {
        setEditingSubcategory(null)
        fetchSubcategories(selectedCategoryId)
      }
    } catch (e) { alert('Помилка редагування підкатегорії') }
  }

  const handleDeleteSubcategory = async (id) => {
    if (!window.confirm('Видалити підкатегорію?')) return
    try {
      const res = await fetch(`http://localhost:3001/api/admin/subcategories/${id}`, { method: 'DELETE' })
      if (res.ok) fetchSubcategories(selectedCategoryId)
    } catch (e) { alert('Помилка видалення підкатегорії') }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      if (response.ok) {
        setIsLoggedIn(true)
        setUsername('')
        setPassword('')
      } else {
        alert('Неверные учетные данные')
      }
    } catch (error) {
      console.error('Ошибка входа:', error)
      alert('Ошибка входа')
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error)
    }
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_BASE_URL}/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProduct)
      })

      if (response.ok) {
        setNewProduct({
          name: '',
          price: '',
          description: '',
          category: '',
          stock: '',
          image: ''
        })
        fetchProducts()
        fetchStats()
        // Оновлюємо список товарів на головній сторінці
        if (onProductUpdate) {
          onProductUpdate()
        }
        alert('Товар добавлен!')
      }
    } catch (error) {
      console.error('Ошибка добавления товара:', error)
      alert('Ошибка добавления товара')
    }
  }

  const handleEditProduct = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_BASE_URL}/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingProduct)
      })

      if (response.ok) {
        setEditingProduct(null)
        fetchProducts()
        // Оновлюємо список товарів на головній сторінці
        if (onProductUpdate) {
          onProductUpdate()
        }
        alert('Товар обновлен!')
      }
    } catch (error) {
      console.error('Ошибка обновления товара:', error)
      alert('Ошибка обновления товара')
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (confirm('Вы уверены, что хотите удалить этот товар?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          fetchProducts()
          fetchStats()
          // Оновлюємо список товарів на головній сторінці
          if (onProductUpdate) {
            onProductUpdate()
          }
          alert('Товар удален!')
        }
      } catch (error) {
        console.error('Ошибка удаления товара:', error)
        alert('Ошибка удаления товара')
      }
    }
  }

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        fetchOrders()
        alert('Статус заказа обновлен!')
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error)
      alert('Ошибка обновления статуса')
    }
  }

  const sendAllToTelegram = async () => {
    if (confirm('Відправити всі товари в Telegram канал?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/send-to-telegram`, {
          method: 'POST'
        })

        if (response.ok) {
          const data = await response.json()
          alert(`Відправка ${data.count} товарів в Telegram розпочата!`)
        } else {
          throw new Error('Помилка відправки')
        }
      } catch (error) {
        console.error('Помилка відправки в Telegram:', error)
        alert('Помилка відправки в Telegram')
      }
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="admin-overlay" onClick={onClose}>
        <div className="admin-content" onClick={(e) => e.stopPropagation()}>
          <button className="admin-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
          <div className="admin-login">
            <h2>Вход в админ-панель</h2>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit">Войти</button>
            </form>
          </div>
        </div>
        <div className="admin-tabs">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            <i className="fas fa-chart-bar"></i> Дашборд
          </button>
          <button 
            className={activeTab === 'products' ? 'active' : ''}
            onClick={() => setActiveTab('products')}
          >
            <i className="fas fa-box"></i> Товары
          </button>
          <button 
            className={activeTab === 'categories' ? 'active' : ''}
            onClick={() => setActiveTab('categories')}
          >
            <i className="fas fa-list"></i> Категорії
          </button>
          <button 
            className={activeTab === 'orders' ? 'active' : ''}
            onClick={() => setActiveTab('orders')}
          >
            <i className="fas fa-shopping-cart"></i> Заказы
          </button>
        </div>
          {activeTab === 'categories' && (
            <div className="categories-management">
              <h3>Категорії</h3>
              <form onSubmit={editingCategory ? handleEditCategory : handleAddCategory} className="category-form">
                <input
                  type="text"
                  placeholder="Назва категорії"
                  value={editingCategory ? editingCategory.name : newCategory}
                  onChange={e => editingCategory
                    ? setEditingCategory({ ...editingCategory, name: e.target.value })
                    : setNewCategory(e.target.value)
                  }
                  required
                />
                <button type="submit">{editingCategory ? 'Оновити' : 'Додати'}</button>
                {editingCategory && (
                  <button type="button" className="cancel-btn" onClick={() => setEditingCategory(null)}>Відміна</button>
                )}
              </form>
              <ul className="category-list">
                {categories.map(cat => (
                  <li key={cat.id} className={selectedCategoryId == cat.id ? 'selected' : ''}>
                    <span onClick={() => setSelectedCategoryId(cat.id)}>{cat.name}</span>
                    <button title="Редагувати" onClick={() => setEditingCategory(cat)}>Ред.</button>
                    <button title="Видалити" onClick={() => handleDeleteCategory(cat.id)}>Видалити</button>
                  </li>
                ))}
              </ul>
              <h4>Підкатегорії</h4>
              {selectedCategoryId ? (
                <>
                  <form onSubmit={editingSubcategory ? handleEditSubcategory : handleAddSubcategory} className="subcategory-form">
                    <input
                      type="text"
                      placeholder="Назва підкатегорії"
                      value={editingSubcategory ? editingSubcategory.name : newSubcategory}
                      onChange={e => editingSubcategory
                        ? setEditingSubcategory({ ...editingSubcategory, name: e.target.value })
                        : setNewSubcategory(e.target.value)
                      }
                      required
                    />
                    <button type="submit">{editingSubcategory ? 'Оновити' : 'Додати'}</button>
                    {editingSubcategory && (
                      <button type="button" className="cancel-btn" onClick={() => setEditingSubcategory(null)}>Відміна</button>
                    )}
                  </form>
                  <ul className="subcategory-list">
                    {subcategories.map(sub => (
                      <li key={sub.id}>
                        <span>{sub.name}</span>
                        <button title="Редагувати" onClick={() => setEditingSubcategory(sub)}>Ред.</button>
                        <button title="Видалити" onClick={() => handleDeleteSubcategory(sub.id)}>Видалити</button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p>Оберіть категорію для перегляду підкатегорій</p>}
            </div>
          )}
      </div>
    )
  }

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-content" onClick={(e) => e.stopPropagation()}>
        <button className="admin-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="admin-header">
          <h2>Админ-панель AllStore</h2>
          <button className="logout-btn" onClick={() => setIsLoggedIn(false)}>
            <i className="fas fa-sign-out-alt"></i> Выйти
          </button>
        </div>

        <div className="admin-tabs">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            <i className="fas fa-chart-bar"></i> Дашборд
          </button>
          <button 
            className={activeTab === 'products' ? 'active' : ''}
            onClick={() => setActiveTab('products')}
          >
            <i className="fas fa-box"></i> Товары
          </button>
          <button 
            className={activeTab === 'orders' ? 'active' : ''}
            onClick={() => setActiveTab('orders')}
          >
            <i className="fas fa-shopping-cart"></i> Заказы
          </button>
        </div>

        <div className="admin-body">
          {activeTab === 'dashboard' && (
            <div className="dashboard">
              <div className="stats-grid">
                <div className="stat-card">
                  <i className="fas fa-box"></i>
                  <h3>{stats.total_products || 0}</h3>
                  <p>Товаров</p>
                </div>
                <div className="stat-card">
                  <i className="fas fa-shopping-cart"></i>
                  <h3>{stats.total_orders || 0}</h3>
                  <p>Заказов</p>
                </div>
                <div className="stat-card">
                  <i className="fas fa-money-bill"></i>
                  <h3>{stats.total_revenue || 0} ₴</h3>
                  <p>Выручка</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="products-management">
              <div className="add-product-form">
                <h3>{editingProduct ? 'Редактировать товар' : 'Добавить товар'}</h3>
                <form onSubmit={editingProduct ? handleEditProduct : handleAddProduct}>
                  <input
                    type="text"
                    placeholder="Название товара"
                    value={editingProduct ? editingProduct.name : newProduct.name}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, name: e.target.value})
                      : setNewProduct({...newProduct, name: e.target.value})
                    }
                    required
                  />
                  <input
                    type="number"
                    placeholder="Цена"
                    value={editingProduct ? editingProduct.price : newProduct.price}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, price: e.target.value})
                      : setNewProduct({...newProduct, price: e.target.value})
                    }
                    required
                  />
                  <textarea
                    placeholder="Описание"
                    value={editingProduct ? editingProduct.description : newProduct.description}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, description: e.target.value})
                      : setNewProduct({...newProduct, description: e.target.value})
                    }
                    required
                  />
                  <input
                    type="text"
                    placeholder="Категория"
                    value={editingProduct ? editingProduct.category : newProduct.category}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, category: e.target.value})
                      : setNewProduct({...newProduct, category: e.target.value})
                    }
                    required
                  />
                  <input
                    type="number"
                    placeholder="Остаток"
                    value={editingProduct ? editingProduct.stock : newProduct.stock}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, stock: e.target.value})
                      : setNewProduct({...newProduct, stock: e.target.value})
                    }
                    required
                  />
                  <input
                    type="text"
                    placeholder="URL изображения"
                    value={editingProduct ? editingProduct.image : newProduct.image}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, image: e.target.value})
                      : setNewProduct({...newProduct, image: e.target.value})
                    }
                  />
                  <div className="form-buttons">
                    <button type="submit">
                      {editingProduct ? 'Обновить' : 'Добавить'}
                    </button>
                    {editingProduct && (
                      <button 
                        type="button" 
                        onClick={() => setEditingProduct(null)}
                        className="cancel-btn"
                      >
                        Отмена
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="products-list">
                <h3>Список товаров</h3>
                <div className="telegram-actions">
                  <button 
                    onClick={sendAllToTelegram}
                    className="telegram-btn"
                    title="Відправити всі товари в Telegram канал"
                  >
                    <i className="fab fa-telegram"></i> Відправити в Telegram
                  </button>
                </div>
                <div className="products-grid">
                  {products.map(product => (
                    <div key={product.id} className="product-item">
                      <img src={product.image || 'https://via.placeholder.com/100'} alt={product.name} />
                      <div className="product-info">
                        <h4>{product.name}</h4>
                        <p>{product.price} ₴</p>
                        <p>Остаток: {product.stock}</p>
                      </div>
                      <div className="product-actions">
                        <button 
                          onClick={() => setEditingProduct(product)}
                          className="edit-btn"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="delete-btn"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="orders-management">
              <h3>Заказы</h3>
              <div className="orders-list">
                {orders.map(order => (
                  <div key={order.id} className="order-item">
                    <div className="order-header">
                      <h4>Заказ #{order.id}</h4>
                      <span className={`status ${order.status}`}>{order.status}</span>
                    </div>
                    <div className="order-details">
                      <p><strong>Клиент:</strong> {order.customer_name}</p>
                      <p><strong>Телефон:</strong> {order.customer_phone}</p>
                      <p><strong>Email:</strong> {order.customer_email}</p>
                      <p><strong>Сумма:</strong> {order.total_amount} ₴</p>
                      <p><strong>Дата:</strong> {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="order-items">
                      <strong>Товары:</strong>
                      {JSON.parse(order.items || '[]').map((item, index) => (
                        <p key={index}>• {item.name} x{item.quantity}</p>
                      ))}
                    </div>
                    <div className="order-actions">
                      <select 
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      >
                        <option value="pending">Ожидает</option>
                        <option value="processing">В обработке</option>
                        <option value="shipped">Отправлен</option>
                        <option value="delivered">Доставлен</option>
                        <option value="cancelled">Отменен</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel 
