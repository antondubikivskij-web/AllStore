const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
// Статические файлы (для admin.html)
app.use(express.static(__dirname));

// Telegram Bot Setup
let bot = null;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'your_telegram_bot_token_here') {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
}

// Telegram notification function
const sendTelegramNotification = async (message, product = null, customChatId = null) => {
  if (bot) {
    const chatId = customChatId || process.env.TELEGRAM_CHANNEL_ID;
    try {
      if (product) {
        // Перевіряємо, чи є знижка на товар
        const hasDiscount = product.discount > 0;
        const discountedPrice = hasDiscount ? product.price * (1 - product.discount / 100) : product.price;
        
        // Відправляємо красиву картку товару
        let caption = `🆕 <b>Новий товар додано!</b>\n\n` +
          `📦 <b>${product.name}</b>\n`;
          
        // Додаємо інформацію про ціну з урахуванням знижки
        if (hasDiscount) {
          caption += `💰 Ціна: <s>${product.price} ₴</s> ${discountedPrice.toFixed(2)} ₴\n` +
                    `🏷️ Знижка: ${product.discount}%\n`;
        } else {
          caption += `💰 Ціна: ${product.price} ₴\n`;
        }
        
        caption += `📂 Категорія: ${product.category || 'Не вказано'}\n` +
          `📦 Залишок: ${product.stock || 0} шт.\n` +
          `📝 Опис: ${product.description || 'Без опису'}\n\n` +
          `🛒 Замовляйте на нашому сайті!`;
        
        if (product.image) {
          await bot.sendPhoto(chatId, product.image, {
            caption: caption,
            parse_mode: 'HTML'
          });
        } else {
          await bot.sendMessage(chatId, caption, { 
            parse_mode: 'HTML' 
          });
        }
      } else {
        // Звичайне текстове повідомлення
        await bot.sendMessage(chatId, message, { 
          parse_mode: 'HTML' 
        });
      }
    } catch (error) {
      console.error('Telegram notification error:', error);
    }
  }
};

// Создание базы данных
const db = new sqlite3.Database('./store.db', (err) => {
  if (err) {
    console.error('Ошибка при создании базы данных:', err);
  } else {
    console.log('База данных подключена');
    // Гарантовано створюємо таблицю products навіть у старій базі
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      image TEXT,
      category TEXT,
      stock INTEGER DEFAULT 0,
      discount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Ошибка при создании таблицы products:', err);
      } else {
        // Гарантовано створюємо таблицю admins навіть у старій базі
        db.run(`CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('Ошибка при создании таблицы admins:', err);
          } else {
            initDatabase();
          }
        });
      }
    });
  }
});

// Инициализация таблиц
function initDatabase() {
  // Таблица категорий
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица товаров
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image TEXT,
    category TEXT,
    stock INTEGER DEFAULT 0,
    discount REAL DEFAULT 0,
    specifications TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица корзины
  db.run(`CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    quantity INTEGER DEFAULT 1,
    session_id TEXT,
    FOREIGN KEY (product_id) REFERENCES products (id)
  )`);

  // Таблица заказов
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    delivery_address TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    items TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица админов
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица настроек сайта
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Инициализируем настройки по умолчанию
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('site_enabled', 'true')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenance_message', 'Сайт на оновленні. Скоро повернемося!')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('show_discounts', 'true')`);

  // Перевіряємо чи є товари в базі даних
  db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
    if (err) {
      console.error('Помилка при перевірці товарів:', err);
    } else if (row.count === 0) {
      console.log('База даних порожня. Додайте товари через адмін-панель.');
    } else {
      console.log(`В базі даних ${row.count} товарів.`);
    }
  });

  // Добавляем поле specifications если его нет
  db.run(`ALTER TABLE products ADD COLUMN specifications TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления поля specifications:', err);
    } else {
      console.log('Поле specifications добавлено или уже существует');
    }
  });

  // Добавляем админа по умолчанию
  const adminPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
  db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`,
    [process.env.ADMIN_USERNAME || 'admin', adminPassword]);
}

// Маршруты API

// Маршрут для проверки активности сервера
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    message: 'Сервер активен'
  });
});

// Получить все товары
app.get('/api/products', (req, res) => {
  db.all('SELECT *, (price - (price * discount / 100)) as discounted_price FROM products ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Помилка при отриманні товарів:', err);
      if (err && err.message) {
        console.error('Текст помилки:', err.message);
      }
      if (err && err.stack) {
        console.error('Стек помилки:', err.stack);
      }
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Получить товары со скидкой
app.get('/api/products/discounted', (req, res) => {
  db.all('SELECT *, (price - (price * discount / 100)) as discounted_price FROM products WHERE discount > 0 ORDER BY discount DESC', (err, rows) => {
    if (err) {
      console.error('Помилка при отриманні товарів зі знижкою:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Получить товар по ID
app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Товар не найден' });
      return;
    }
    res.json(row);
  });
});

// Добавить товар (админ)
app.post('/api/admin/products', (req, res) => {
  const { name, price, description, category, stock, image, discount, specifications } = req.body;
  
  db.run(`INSERT INTO products (name, price, description, category, stock, image, discount, specifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, price, description, category, stock, image, discount || 0, specifications || ''], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const id = this.lastID;
    const newProduct = {
      id,
      name,
      price,
      description,
      category,
      stock,
      image,
      discount
    };
    
    // Отправляем уведомление в Telegram с карткой товара
    sendTelegramNotification(null, newProduct);
    
    res.json({ id: this.lastID, message: 'Товар добавлен' });
  });
});

// Обновить товар (админ)
app.put('/api/admin/products/:id', (req, res) => {
  const { name, price, description, category, stock, image, discount, specifications } = req.body;
  
  db.run(`UPDATE products SET name = ?, price = ?, description = ?, category = ?, stock = ?, image = ?, discount = ?, specifications = ? WHERE id = ?`,
    [name, price, description, category, stock, image, discount || 0, specifications || '', req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const updatedProduct = {
      id: req.params.id,
      name,
      price,
      description,
      category,
      stock,
      image,
      discount
    };
    
    // Отправляем уведомление в Telegram с обновленной карткой товара
    sendTelegramNotification(`✏️ <b>Товар оновлено!</b>`, updatedProduct);
    
    res.json({ message: 'Товар обновлен' });
  });
});

// Удалить товар (админ)
app.delete('/api/admin/products/:id', (req, res) => {
  db.get('SELECT name FROM products WHERE id = ?', [req.params.id], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (product) {
        sendTelegramNotification(`🗑️ <b>Товар удален!</b>\n\n📦 <b>${product.name}</b>`);
      }
      
      res.json({ message: 'Товар удален' });
    });
  });
});

// Получить все заказы (админ)
app.get('/api/admin/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Обновить статус заказа (админ)
app.put('/api/admin/orders/:id/status', (req, res) => {
  const { status } = req.body;
  
  db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    sendTelegramNotification(`📋 <b>Статус заказа изменен!</b>\n\n🆔 Заказ #${req.params.id}\n📊 Статус: ${status}`);
    
    res.json({ message: 'Статус заказа обновлен' });
  });
});

// Создать заказ
app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, customer_email, delivery_address, total_amount, items } = req.body;
  
  db.run(`INSERT INTO orders (customer_name, customer_phone, customer_email, delivery_address, total_amount, items) VALUES (?, ?, ?, ?, ?, ?)`,
    [customer_name, customer_phone, customer_email, delivery_address, total_amount, JSON.stringify(items)], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const orderId = this.lastID;
    
    // Відправляємо повідомлення про замовлення у канал для замовлень
    const itemsList = items.map(item => {
      // Перевіряємо, чи є знижка на товар
      const hasDiscount = item.discount > 0;
      let itemText = `• ${item.name} x${item.quantity}`;
      
      // Додаємо інформацію про ціну з урахуванням знижки
      if (hasDiscount) {
        itemText += ` — <s>${item.price} ₴</s> ${parseFloat(item.finalPrice).toFixed(2)} ₴ (-${item.discount}%)`;
      } else {
        itemText += ` — ${item.price} ₴`;
      }
      
      return itemText;
    }).join('\n');
    sendTelegramNotification(
      `🛒 <b>Нове замовлення!</b>\n\n🆔 Замовлення #${orderId}\n👤 ${customer_name}\n📞 ${customer_phone}\n🏠 <b>Адреса:</b> ${delivery_address || '—'}\n💰 Сума: ${total_amount} ₴\n\n📦 Товари:\n${itemsList}`,
      null,
      process.env.TELEGRAM_ORDERS_CHANNEL_ID
    );
    
    res.json({ 
      id: orderId, 
      message: 'Замовлення створено',
      order: {
        id: orderId,
        customer_name,
        customer_phone,
        customer_email,
        delivery_address,
        total_amount,
        items,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    });
  });
});

// Получить заказ по ID
app.get('/api/orders/:id', (req, res) => {
  db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, order) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!order) {
      res.status(404).json({ error: 'Заказ не найден' });
      return;
    }
    
    // Преобразуем строку JSON в объект
    try {
      order.items = JSON.parse(order.items);
    } catch (e) {
      console.error('Ошибка при парсинге items:', e);
      order.items = [];
    }
    
    res.json(order);
  });
});

// Аутентификация админа
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Попытка входа:', { username, password: password ? '***' : 'undefined' });
  
  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
    if (err) {
      console.error('Ошибка БД:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    console.log('Найден админ:', admin ? 'да' : 'нет');
    
    if (!admin) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }
    
    const isValidPassword = bcrypt.compareSync(password, admin.password);
    console.log('Пароль верный:', isValidPassword);
    
    if (!isValidPassword) {
      res.status(401).json({ error: 'Неверный пароль' });
      return;
    }
    
    res.json({ message: 'Успешная авторизация', admin: { id: admin.id, username: admin.username } });
  });
});

// Добавить товар в корзину
app.post('/api/cart', (req, res) => {
  const { product_id, quantity = 1, session_id } = req.body;
  
  db.run('INSERT INTO cart (product_id, quantity, session_id) VALUES (?, ?, ?)',
    [product_id, quantity, session_id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Товар добавлен в корзину' });
  });
});

// Получить корзину
app.get('/api/cart/:session_id', (req, res) => {
  const session_id = req.params.session_id || 'default';
  
  db.all(`
    SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.description, p.image
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.session_id = ?
  `, [session_id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Удалить товар из корзины
app.delete('/api/cart/:id', (req, res) => {
  db.run('DELETE FROM cart WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Товар удален из корзины' });
  });
});

// Обновить количество товара в корзине
app.put('/api/cart/:id', (req, res) => {
  const { quantity } = req.body;
  
  db.run('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Количество обновлено' });
  });
});

// Поиск товаров
app.get('/api/search', (req, res) => {
  const { q, category } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  let params = [];

  if (q) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Получить категории
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Добавить категорию (админ)
app.post('/api/admin/categories', (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'Название категории не может быть пустым' });
    return;
  }
  
  db.run(`INSERT INTO categories (name) VALUES (?)`, [name], function(err) {
    if (err) {
      // Проверка на дубликат (уникальное ограничение)
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Категория с таким названием уже существует' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    
    res.json({ id: this.lastID, name, message: 'Категория добавлена' });
  });
});

// Обновить категорию (админ)
app.put('/api/admin/categories/:id', (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'Название категории не может быть пустым' });
    return;
  }
  
  db.run(`UPDATE categories SET name = ? WHERE id = ?`, [name, req.params.id], function(err) {
    if (err) {
      // Проверка на дубликат (уникальное ограничение)
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Категория с таким названием уже существует' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Категория не найдена' });
      return;
    }
    
    res.json({ id: parseInt(req.params.id), name, message: 'Категория обновлена' });
  });
});

// Удалить категорию (админ)
app.delete('/api/admin/categories/:id', (req, res) => {
  db.run(`DELETE FROM categories WHERE id = ?`, [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Категория не найдена' });
      return;
    }
    
    res.json({ message: 'Категория удалена' });
  });
});

// Статистика для админ-панели
app.get('/api/admin/stats', (req, res) => {
  db.get('SELECT COUNT(*) as total_products FROM products', (err, products) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.get('SELECT COUNT(*) as total_orders FROM orders', (err, orders) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      db.get('SELECT SUM(total_amount) as total_revenue FROM orders WHERE status = "completed"', (err, revenue) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        res.json({
          total_products: products.total_products,
          total_orders: orders.total_orders,
          total_revenue: revenue.total_revenue || 0
        });
      });
    });
  });
});

// Отправить все товары в Telegram
app.post('/api/admin/send-to-telegram', (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', (err, products) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (products.length === 0) {
      res.json({ message: 'Нет товаров для отправки' });
      return;
    }
    
    // Отправляем каждый товар в Telegram
    let sentCount = 0;
    products.forEach((product, index) => {
      setTimeout(() => {
        sendTelegramNotification(null, product);
        sentCount++;
        
        if (sentCount === products.length) {
          console.log(`Отправлено ${sentCount} товаров в Telegram`);
        }
      }, index * 2000); // Отправляем с задержкой 2 секунды между товарами
    });
    
    res.json({ 
      message: `Отправка ${products.length} товаров в Telegram начата`,
      count: products.length 
    });
  });
});

// Тестовый маршрут
app.get('/api/test', (req, res) => {
  res.json({ message: 'Сервер работает!' });
});

// Получить API статус
app.get('/api', (req, res) => {
  res.send('API працює');
});

// Админ-панель
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// Админ-панель (альтернативный путь)
app.get('/admin.html', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// Проверить админов в базе данных
app.get('/api/admin/check', (req, res) => {
  db.all('SELECT id, username, created_at FROM admins', (err, admins) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ admins });
  });
});

// Получить настройки сайта
app.get('/api/admin/settings', (req, res) => {
  db.all('SELECT * FROM settings', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    res.json(settings);
  });
});

// Обновить настройки сайта
app.put('/api/admin/settings', (req, res) => {
  const { site_enabled, maintenance_message, show_discounts } = req.body;
  
  db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', 
    [site_enabled, 'site_enabled'], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Обновляем настройку отображения скидок, если она передана
    if (show_discounts !== undefined) {
      db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', 
        [show_discounts, 'show_discounts'], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // Если также передано сообщение о техобслуживании
        if (maintenance_message) {
          db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', 
            [maintenance_message, 'maintenance_message'], function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            
            const action = site_enabled === 'true' ? 'увімкнено' : 'вимкнено';
            const discountAction = show_discounts === 'true' ? 'увімкнено' : 'вимкнено';
            sendTelegramNotification(`🔧 <b>Сайт ${action}!</b>\n🏷️ <b>Знижки ${discountAction}!</b>\n\n${maintenance_message || ''}`);
            
            res.json({ 
              message: `Сайт ${action}, знижки ${discountAction}`,
              site_enabled: site_enabled === 'true',
              show_discounts: show_discounts === 'true'
            });
          });
        } else {
          const action = site_enabled === 'true' ? 'увімкнено' : 'вимкнено';
          const discountAction = show_discounts === 'true' ? 'увімкнено' : 'вимкнено';
          sendTelegramNotification(`🔧 <b>Сайт ${action}!</b>\n🏷️ <b>Знижки ${discountAction}!</b>`);
          
          res.json({ 
            message: `Сайт ${action}, знижки ${discountAction}`,
            site_enabled: site_enabled === 'true',
            show_discounts: show_discounts === 'true'
          });
        }
      });
    } else if (maintenance_message) {
      // Если передано только сообщение о техобслуживании
      db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', 
        [maintenance_message, 'maintenance_message'], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const action = site_enabled === 'true' ? 'увімкнено' : 'вимкнено';
        sendTelegramNotification(`🔧 <b>Сайт ${action}!</b>\n\n${maintenance_message || ''}`);
        
        res.json({ message: `Сайт ${action}` });
      });
    } else {
      const action = site_enabled === 'true' ? 'увімкнено' : 'вимкнено';
      sendTelegramNotification(`🔧 <b>Сайт ${action}!</b>`);
      
      res.json({ message: `Сайт ${action}` });
    }
  });
});

// Получить статус сайта (для фронтенда)
app.get('/api/site-status', (req, res) => {
  db.get('SELECT value FROM settings WHERE key = ?', ['site_enabled'], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const isEnabled = row ? row.value === 'true' : true;
    
    // Получаем статус отображения скидок
    db.get('SELECT value FROM settings WHERE key = ?', ['show_discounts'], (err, discountRow) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const showDiscounts = discountRow ? discountRow.value === 'true' : true;
      
      if (!isEnabled) {
        db.get('SELECT value FROM settings WHERE key = ?', ['maintenance_message'], (err, msgRow) => {
          const message = msgRow ? msgRow.value : 'Сайт на оновленні. Скоро повернемося!';
          res.json({ 
            enabled: false, 
            message: message,
            show_discounts: showDiscounts
          });
        });
      } else {
        res.json({ 
          enabled: true,
          show_discounts: showDiscounts
        });
      }
    });
  });
});

// Функция имитации активности пользователя для предотвращения засыпания на бесплатных хостингах
const keepAlive = () => {
  console.log('Имитация активности пользователя...');
  
  // Получаем текущее время для логирования
  const currentTime = new Date().toLocaleTimeString();
  
  // Выполняем простой запрос к базе данных
  db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
    if (err) {
      console.error(`[${currentTime}] Ошибка при имитации активности:`, err);
    } else {
      console.log(`[${currentTime}] Имитация активности: проверено ${row.count} товаров`);
      
      // Делаем HTTP запрос к собственному API для имитации реального пользователя
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/ping',
        method: 'GET'
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          console.log(`[${currentTime}] Ping-запрос выполнен успешно:`, JSON.parse(data).status);
        });
      });
      
      req.on('error', (error) => {
        console.error(`[${currentTime}] Ошибка при выполнении ping-запроса:`, error.message);
      });
      
      req.end();
    }
  });
};

// Получаем интервал имитации активности из переменных окружения или используем значение по умолчанию (2 минуты)
const keepAliveMinutes = parseInt(process.env.KEEP_ALIVE_INTERVAL) || 2;
const keepAliveInterval = keepAliveMinutes * 60 * 1000; // Конвертируем минуты в миллисекунды

// Запускаем имитацию активности с заданным интервалом
const keepAliveTimer = setInterval(keepAlive, keepAliveInterval);

// Запускаем имитацию сразу при старте сервера
setTimeout(keepAlive, 5000); // Запускаем через 5 секунд после старта сервера

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`API доступен по адресу: http://localhost:${PORT}/api`);
  if (bot) {
    console.log('Telegram бот подключен');
  }
  console.log(`Имитация активности пользователя запущена (интервал: ${keepAliveInterval/60000} минут)`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  // Останавливаем таймер имитации активности
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    console.log('Таймер имитации активности остановлен');
  }
  
  // Закрываем соединение с базой данных
  db.close((err) => {
    if (err) {
      console.error('Ошибка при закрытии базы данных:', err);
    } else {
      console.log('База данных закрыта');
    }
    process.exit(0);
  });
});
