# Beekeeping Management System (CRM) 🐝
**[🇺🇦 Українська версія нижче](#crm-для-пасіки-довідник-пасічника-ua)**

A lightweight, mobile-first Progressive Web App (PWA) designed to manage apiary operations, track queen bee breeding cycles, and monitor bee families. Built with Vanilla JavaScript and Firebase, it provides a seamless cross-platform experience with real-time synchronization.

## 🚀 Key Features

* **Automated Lifecycle Tracking:** Implements strict domain logic. Automatically calculates the 9th-day (selection) and 11th-day (emergence) milestones based strictly on the initial grafting date.
* **Real-time Database:** Powered by Firebase Firestore for instant data synchronization across all devices.
* **Offline Persistence:** Utilizes Firestore's `enableIndexedDbPersistence` to ensure the app remains functional even without an internet connection.
* **Responsive UI/UX:** Features a mobile-first design with touch-friendly "bottom sheet" modals and swipe gestures, gracefully adapting to a sidebar layout for desktop users.
* **PWA Ready:** Includes a Web App Manifest and Service Worker (Network-Only caching strategy for instant updates) allowing installation directly to the home screen.
* **Theme Management:** Built-in Light/Dark mode toggle using native CSS variables.

## 🛠 Tech Stack

* **Frontend:** HTML5, CSS3 (Native Variables, Grid/Flexbox), Vanilla JavaScript (ES6 Modules).
* **Backend / BaaS:** Firebase (Firestore v10).
* **Architecture:** PWA (Progressive Web App).

## 📦 Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yourusername/beebsystem.git](https://github.com/yourusername/beebsystem.git)
    cd beebsystem
    ```
2.  **Firebase Configuration:**
    Open `app.js` and replace the `firebaseConfig` object with your own Firebase project credentials:
    ```javascript
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    };
    ```
3.  **Run Locally:**
    Since the app uses ES6 modules (`import` from URLs), it must be served via a local web server (e.g., VS Code Live Server, Python HTTP server, or Node.js `http-server`).
    ```bash
    npx http-server ./
    ```

---

<h2 id="crm-для-пасіки-довідник-пасічника-ua">CRM для Пасіки (Довідник Пасічника) [UA]</h2>

Легкий мобільний PWA-додаток для управління процесами на пасіці, відстеження циклів виведення маток та моніторингу стану бджолиних сімей. Створений на чистому JavaScript та Firebase, додаток забезпечує миттєву синхронізацію даних та зручний кросплатформний інтерфейс.

## 🚀 Головні функції

* **Автоматизація життєвих циклів:** Реалізована жорстка бізнес-логіка. Додаток автоматично розраховує дату 9-го дня (відбір) та 11-го дня (вихід матки), відштовхуючись виключно від дати прищеплення.
* **База даних у реальному часі:** Використовує Firebase Firestore для миттєвої синхронізації записів між усіма пристроями.
* **Офлайн-доступ:** Кешування даних через `enableIndexedDbPersistence` дозволяє переглядати записи навіть без доступу до інтернету (наприклад, у полі).
* **Адаптивний UI/UX:** Спроєктовано за принципом Mobile-First. Використовує зручні сенсорні модальні вікна ("bottom sheet") для смартфонів, які автоматично трансформуються у бічну панель на десктопі.
* **PWA (Прогресивний веб-додаток):** Включає Manifest та Service Worker, що дозволяє встановити CRM прямо на головний екран смартфону як нативний додаток.
* **Теми оформлення:** Підтримка світлої та темної теми на базі CSS-змінних.

## 🛠 Технологічний стек

* **Frontend:** HTML5, CSS3 (Нативні змінні, Grid/Flexbox), Vanilla JavaScript (ES6 Modules).
* **Backend / BaaS:** Firebase (Firestore v10).
* **Архітектура:** PWA (Progressive Web App).

## 📦 Встановлення та запуск

1.  **Клонуйте репозиторій:**
    ```bash
    git clone [https://github.com/yourusername/beebsystem.git](https://github.com/yourusername/beebsystem.git)
    cd beebsystem
    ```
2.  **Налаштування Firebase:**
    Відкрийте файл `app.js` та замініть об'єкт `firebaseConfig` на ключі вашого проєкту Firebase:
    ```javascript
    const firebaseConfig = {
        apiKey: "ВАШ_API_KEY",
        authDomain: "ВАШ_PROJECT_ID.firebaseapp.com",
        projectId: "ВАШ_PROJECT_ID",
        storageBucket: "ВАШ_PROJECT_ID.firebasestorage.app",
        messagingSenderId: "ВАШ_SENDER_ID",
        appId: "ВАШ_APP_ID"
    };
    ```
3.  **Локальний запуск:**
    Оскільки додаток використовує ES6 модулі, його потрібно запускати через локальний веб-сервер (наприклад, Live Server у VS Code або `http-server` у Node.js).
    ```bash
    npx http-server ./
    ```
