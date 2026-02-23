# Gemini Relay для Railway + GitHub

Прокси для Google Gemini API. Бот Insta Art шлёт запросы сюда вместо прямого вызова Google — удобно, если с сервера до `generativelanguage.googleapis.com` есть ограничения.

## Что нужно от relay

- Принимать **POST** на путь **`/gemini`**
- Читать заголовки: **`X-Gemini-Key`** (API key), **`X-Gemini-Path`** (например `/v1beta/models/gemini-2.0-flash-exp:generateContent`)
- Проксировать тело запроса на  
  `https://generativelanguage.googleapis.com{X-Gemini-Path}?key={X-Gemini-Key}`  
  и вернуть ответ как есть.

В этом репозитории уже есть `server.js`, который это делает.

---

## Инструкция: новый Gemini Relay через Railway и GitHub

### 1. Репозиторий на GitHub

1. Зайди на [github.com](https://github.com) → **New repository**.
2. Название, например: **`gemini-relay-railway`** (или любое).
3. **Public**, без README / .gitignore (создашь пустой репо).
4. Не ставь галочку «Add a README».

### 2. Залить файлы в репозиторий

Репозиторий уже создан: **https://github.com/Alepha98/gemini-relay-railway-instArt**

В папке **`gemini-relay-railway`** (рядом с ботом) лежат 4 файла — их нужно закинуть в репо:

| Файл | Назначение |
|------|------------|
| `package.json` | Зависимости и команда `npm start` |
| `server.js` | Код relay |
| `README.md` | Эта инструкция |
| `.gitignore` | Игнор node_modules и т.д. |

**Вариант А — через Git (из терминала):**

```bash
cd "/Users/alepha98/Downloads/bot Insta Art/gemini-relay-railway"
git init
git add .
git commit -m "Gemini relay for Railway"
git branch -M main
git remote add origin https://github.com/Alepha98/gemini-relay-railway-instArt.git
git push -u origin main
```

**Вариант Б — вручную через сайт GitHub:**

1. Открой https://github.com/Alepha98/gemini-relay-railway-instArt
2. Нажми **「Add file」 → 「Upload files」**
3. Перетащи в окно браузера все 4 файла из папки `gemini-relay-railway` (или выбери их).
4. Внизу нажми **「Commit changes」**

### 3. Railway: проект и деплой из GitHub

1. Зайди на [railway.app](https://railway.app), войди (через GitHub удобнее).
2. **New Project** → **Deploy from GitHub repo**.
3. Выбери репозиторий **gemini-relay-railway-instArt** (если не видно — настрой доступ к репо в настройках GitHub).
4. Railway сам определит Node.js и команду `npm start` (в `package.json` уже прописано `"start": "node server.js"`).
5. Дождись сборки и деплоя (обычно 1–2 минуты).

### 4. Публичный URL в Railway

1. В проекте открой свой **Service** (сервис с деплоем).
2. Вкладка **Settings** → блок **Networking** → **Generate Domain** (или **Public Networking**).
3. Railway выдаст домен вида:  
   **`https://gemini-relay-railway-production-xxxx.up.railway.app`**  
   Скопируй его **без слэша в конце**.

### 5. Подключить relay в боте

В **`.env`** бота (локально и на сервере) укажи:

```env
GEMINI_RELAY_URL=https://ТВОЙ_ДОМЕН.up.railway.app
```

Пример:

```env
GEMINI_RELAY_URL=https://gemini-relay-railway-production-a1b2.up.railway.app
```

Перезапусти бота (и воркеры, если они отдельно). После этого запросы к Gemini пойдут через твой relay на Railway.

### 6. (По желанию) Переменные в Railway

Сейчас API key бот передаёт в заголовке **`X-Gemini-Key`**, relay его только проксирует. Хранить ключ в Railway не обязательно.

Если захочешь хранить ключ только на Railway: можно доработать relay так, чтобы он подставлял ключ из `process.env.GEMINI_API_KEY` и игнорировал заголовок. Тогда в Railway: **Variables** → добавить **`GEMINI_API_KEY`** (значение из Google AI Studio). В текущей версии `server.js` ключ всегда берётся из заголовка.

---

## Проверка

Проверить, что relay живой:

```bash
curl -X POST https://ТВОЙ_ДОМЕН.up.railway.app/gemini \
  -H "Content-Type: application/json" \
  -H "X-Gemini-Key: ТВОЙ_GEMINI_API_KEY" \
  -H "X-Gemini-Path: /v1beta/models/gemini-2.0-flash-exp:generateContent" \
  -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
```

Должен вернуться JSON ответа от Gemini (или ошибка от Google, но не 502 от relay).

---

## Сводка

| Шаг | Действие |
|-----|----------|
| 1 | Репо уже есть: [gemini-relay-railway-instArt](https://github.com/Alepha98/gemini-relay-railway-instArt) |
| 2 | Залить в него 4 файла из папки `gemini-relay-railway` (git push или Upload files на GitHub) |
| 3 | Railway → New Project → Deploy from GitHub → выбрать репо |
| 4 | В сервисе Railway сгенерировать домен (Generate Domain) |
| 5 | В `.env` бота прописать `GEMINI_RELAY_URL=https://...домен...` |
| 6 | Перезапустить бота |

После этого новый Gemini relay через Railway и GitHub готов к работе.
