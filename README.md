# Общая программа

Репозиторий объединяет три клиентских приложения, общую админку и API на Cloudflare. Клиенты используют Nuxt, Vue и TypeScript. У каждого направления свои рабочие данные и идентификатор установки. Админка управляет заявками, лицензиями, сообщениями, обновлениями и облачными архивами всех трёх направлений.

## Структура репозитория

| Папка | Назначение |
| --- | --- |
| [tsekh/](tsekh/) | «Цех», ID направления `tsekh`. Веб-приложение и оболочка Windows x64 |
| [shawarma/](shawarma/) | «Шаурмичная», ID направления `shawarma`. Веб-приложение |
| [production/](production/) | «Простое производство», ID направления `production`. Веб-приложение |
| [admin/](admin/) | Общая админка. Интерфейс в `app/`, запросы к API в `admin-endpoints/` |
| [cloudflare/worker/](cloudflare/worker/) | API, миграции D1 и привязки к Cloudflare |
| [shared/contracts/](shared/contracts/) | ID и названия направлений, контракты запросов, форматы архивов и функции работы с API |
| [shared/ui/](shared/ui/) | Общие компоненты, навигация, формы активации и PIN, сообщения и настройки |

Корневой `package.json` объявляет npm workspaces. Устанавливайте зависимости из корня с помощью общего `package-lock.json`.

В клиентских приложениях `app/pages/` определяет маршруты, `app/features/` содержит компоненты и логику разделов, а `app/middleware/access.global.ts` управляет переходами между активацией, входом и рабочими страницами. В `endpoints/warehouse/` операции `get-warehouses`, `create-warehouse`, `update-warehouse` и `delete-warehouse` разделены по папкам. У каждой операции есть файлы `.types.ts`, `.service.ts` и `.store.ts`.

## Запуск на Windows

Откройте PowerShell в папке `new-projectss`, где лежит корневой `package.json`. Сборки проверялись с Node.js `22.22.3`. При использовании Volta команды npm можно запускать через `volta run --node 22.22.3 npm`.

```powershell
npm.cmd ci
```

Запускайте каждое приложение в отдельном терминале из корня. Порты указаны явно, чтобы все приложения могли работать одновременно.

| Приложение | Команда | Адрес |
| --- | --- | --- |
| Цех | `npm.cmd run dev --workspace @obshaya/tsekh -- --port 3000` | [localhost:3000](http://localhost:3000) |
| Шаурмичная | `npm.cmd run dev --workspace @obshaya/shawarma -- --port 3001` | [localhost:3001](http://localhost:3001) |
| Админка | `npm.cmd run dev --workspace @obshaya/admin -- --port 3002` | [localhost:3002](http://localhost:3002) |
| Простое производство | `npm.cmd run dev:production` | [localhost:3003](http://localhost:3003) |

Корневые команды `npm.cmd run dev:tsekh`, `npm.cmd run dev:shawarma` и `npm.cmd run dev:admin` тоже запускают соответствующие приложения. Без явного порта используйте адрес, который вывел Nuxt.

## Создание нового направления

Из корня репозитория создайте приложение на основе `production`:

```powershell
npm run create:direction -- bakery "Пекарня"
npm run dev:bakery
```

Укажите уникальный ID латиницей в нижнем регистре. Команда создаёт отдельную Nuxt-папку, копирует PIN-доступ, настройки, архивы и склады, меняет ID приложения, добавляет workspace и регистрирует направление для лицензий и админки. Новое приложение использует тот же Cloudflare API, что и остальные. Складские записи хранятся локально в браузере; архивы можно загрузить в облако из настроек.

Чтобы новые направления принимались базой данных, один раз примените миграцию, удаляющую старое ограничение списка ID, и разверните обновлённый API. После генерации каждого направления разверните API и админку, чтобы облачные версии получили его регистрацию:

```powershell
npm.cmd exec --workspace @obshaya/worker -- wrangler d1 migrations apply tsekh4-licenses --remote
npm.cmd exec --workspace @obshaya/worker -- wrangler deploy
$env:VITE_ADMIN_API_BASE = 'https://obshaya-programma-api.burhon-2001-tjk.workers.dev'
npm.cmd exec --workspace @obshaya/admin -- nuxt generate
npm.cmd exec --workspace @obshaya/worker -- wrangler deploy --config ../../admin/wrangler.jsonc
```

Удалите созданное направление командой `npm run remove:direction -- bakery` и подтвердите операцию, точно введя `REMOVE bakery`. Встроенные `tsekh`, `shawarma` и `production` защищены. Удаляется локальный проект и его регистрации; облачные лицензии, архивы и файлы обновлений сохраняются, чтобы случайно не потерять клиентские данные.

| Маршрут клиента | Экран |
| --- | --- |
| `/` | Главная страница |
| `/activation` | Запрос доступа и ожидание решения |
| `/pin` | Вход по PIN и обращение в поддержку |
| `/warehouses` | Список складов, добавление, редактирование и удаление |
| `/settings` | PIN, обновления, импорт и экспорт, папки и расписание копирования |

## Активация, PIN и склады

1. Клиент создаёт ID установки для своего направления в браузере и отправляет его вместе с `product` и версией в `POST /api/client/activation`.
2. Администратор открывает вкладку **«Заявки»** и одобряет либо отклоняет заявку. При одобрении API создаёт лицензию и начальный пятизначный PIN.
3. Клиент опрашивает `GET /api/client/activation/{installationId}`. После одобрения он показывает PIN и предлагает перейти ко входу.
4. При входе API проверяет PIN и срок действия лицензии. Для защищённых клиентских запросов приложение передаёт заголовки `X-Installation-Id` и `X-Client-Pin`.
5. После входа можно добавлять, редактировать и удалять склады. У склада есть название и тип **«Материалы»** или **«Готовая продукция»**. Склады хранятся в `localStorage` соответствующего приложения. Данные можно перенести экспортом и импортом JSON.

Во вкладке **«Клиенты»** администратор может менять срок лицензии, отключать доступ, выдавать новый PIN для входа или временный PIN на час. Сообщения между клиентом и администратором хранятся в D1 и отображаются в карточке клиента. Вкладка **«Заметки»** хранит отдельные записи администратора.

## Резервные копии

- **Ручной экспорт.** В **«Настройки» → «Архив данных»** кнопка **«Экспорт»** скачивает JSON. При включённой облачной копии `POST /api/client/archives` создаёт отдельную запись в админке.
- **Импорт.** Кнопка **«Импорт»** заменяет данные текущего направления содержимым архива. Приложение проверяет формат и направление перед заменой.
- **Расписание.** В **«Папки хранения»** выберите две папки. В **«Резервные копии»** задайте часы и минуты и нажмите **«Сохранить расписание»**. Например, `0 ч 1 мин` создаёт первую копию через минуту после сохранения, а нулевой интервал отключает расписание.
- **Локальные папки.** Каждый цикл записывает свежий снимок в `<product>-backup.json` в обе выбранные папки. Если удалён сам файл, следующий цикл создаст его заново при доступной папке. Веб-версия использует браузерный выбор папок с разрешением на запись. Windows-версия «Цеха» использует системный диалог.
- **Облако.** При включённом параметре **«Копировать в облако»** и доступном API запрос `PUT /api/client/archives/latest` перезаписывает одну актуальную копию для лицензии. JSON хранится в R2, метаданные в D1. Администратор может скачать файл из вкладки **«Архивация»**.
- **Условия работы.** Копии по расписанию создаются, пока приложение открыто и выполнен вход. Пропущенный интервал проверяется после входа. Последнюю созданную копию можно скачать из настроек. Копия и дескрипторы папок веб-версии хранятся в IndexedDB, расписание в `localStorage`.

Архив содержит снимок записей `localStorage` с префиксом `obshaya:data:<product>:`, в том числе склады. Выбор папок, PIN и параметры входа хранятся отдельно от этого набора данных.

## API, админка и Cloudflare

- Статический интерфейс публикуется в Worker `obshaya-programma-admin`. [Облачная админка](https://obshaya-programma-admin.burhon-2001-tjk.workers.dev/)
- Обработчики API работают в Worker `obshaya-programma-api`. [Проверка API](https://obshaya-programma-api.burhon-2001-tjk.workers.dev/health)
- D1 `tsekh4-licenses` хранит заявки, лицензии, сообщения, заметки, метаданные архивов и обновлений, отметки скачивания и установки. Привязка в Worker называется `DB`.
- R2 `tsekh4-updates` хранит файлы EXE и JSON. Привязка называется `UPDATES_BUCKET`.
- Маршруты `/api/admin/*` требуют ключ `ADMIN_API_KEY`. Администратор вводит его при входе, админка передаёт его в заголовке `Authorization: Bearer …`. Рабочее значение хранится в секрете Worker.

Точка входа API находится в [cloudflare/worker/src/index.ts](cloudflare/worker/src/index.ts), обработчики расположены в `src/handlers/admin/` и `src/handlers/client/`. Схема базы меняется через [миграции](cloudflare/worker/migrations/). Миграция `0003_production_product.sql` добавляет направление `production` к ограничениям существующей базы.

### Локальная проверка API и админки

По умолчанию запущенные на компьютере клиенты и админка обращаются к облачному API. Для проверки на отдельных данных создайте `cloudflare/worker/.dev.vars` по [примеру](cloudflare/worker/.dev.vars.example) и задайте отдельный локальный `ADMIN_API_KEY`. Из корня выполните:

```powershell
npm.cmd exec --workspace @obshaya/worker -- wrangler d1 migrations apply tsekh4-licenses --local
npm.cmd exec --workspace @obshaya/worker -- wrangler dev --ip 127.0.0.1 --port 8787
```

Перед запуском каждого клиента в его терминале задайте адрес локального Worker. Например, для «Простого производства»:

```powershell
$env:NUXT_PUBLIC_LICENSE_API_BASE = 'http://127.0.0.1:8787'
npm.cmd run dev:production
```

Для локальной админки используется отдельная переменная. При входе укажите ключ из локального `.dev.vars`.

```powershell
$env:VITE_ADMIN_API_BASE = 'http://127.0.0.1:8787'
npm.cmd run dev --workspace @obshaya/admin -- --port 3002
```

### Публикация в Cloudflare

Команды выполняются из корня. Для обновления Workers и D1 нужна сессия Wrangler с соответствующими правами в аккаунте Cloudflare. Для именованного профиля добавляйте `--profile production-deploy` к командам Wrangler.

```powershell
npm.cmd exec --workspace @obshaya/worker -- wrangler d1 migrations list tsekh4-licenses --remote
npm.cmd exec --workspace @obshaya/worker -- wrangler d1 migrations apply tsekh4-licenses --remote
npm.cmd exec --workspace @obshaya/worker -- wrangler deploy

$env:VITE_ADMIN_API_BASE = 'https://obshaya-programma-api.burhon-2001-tjk.workers.dev'
npm.cmd exec --workspace @obshaya/admin -- nuxt generate
npm.cmd exec --workspace @obshaya/worker -- wrangler deploy --config ../../admin/wrangler.jsonc
```

Если на новом Worker ещё нет ключа администратора, задайте его командой `npm.cmd exec --workspace @obshaya/worker -- wrangler secret put ADMIN_API_KEY`. Значения ключей держите вне Git.

При ошибке авторизации D1 проверьте права профиля командой `wrangler whoami`. Именованный профиль в используемой версии Wrangler можно создать или обновить так:

```powershell
npm.cmd exec --workspace @obshaya/worker -- wrangler auth create production-deploy --scopes account:read user:read workers:write workers_scripts:write d1:write
```

На странице Cloudflare проверьте **D1 Write** и нажмите **Authorize**.

## EXE «Цеха» и доставка обновлений

Из корня репозитория на Windows x64 с установленными зависимостями выполните:

```powershell
npm.cmd run desktop:build --workspace @obshaya/tsekh
```

Скрипт [tsekh/desktop/build.ps1](tsekh/desktop/build.ps1) генерирует статический Nuxt, упаковывает его в оболочку WinForms с WebView2 и создаёт `tsekh/release/Tsekh-<версия>-Windows-x64.exe`. Версия по умолчанию берётся из `tsekh/package.json`. Для запуска нужен Microsoft Edge WebView2 Runtime. Профиль приложения хранится в `%LOCALAPPDATA%\Tsekh-4\profile`.

1. Для выпуска увеличьте версию в `tsekh/package.json`, обновите общий lock-файл командой `npm.cmd install --package-lock-only` и соберите EXE.
2. В админке откройте **«Обновления»**, выберите **«Цех»**, укажите версию сборки и загрузите EXE. API записывает контрольную сумму файла и показывает клиенту обновления его направления.
3. В настольном «Цехе» нажмите **«Проверить обновление»**, затем **«Установить и перезапустить»**. EXE должен лежать в папке, доступной пользователю на запись. После входа новая версия отправляет отметку об установке в админку.

В браузере карточка обновлений предлагает скачать опубликованный файл. Настольная установка и перезапуск реализованы в `tsekh/desktop/`. [Инструкция по Windows-версии](tsekh/desktop/README.md)

## Проверка перед публикацией

```powershell
npm.cmd run build --workspace @obshaya/tsekh
npm.cmd run build --workspace @obshaya/shawarma
npm.cmd run build --workspace @obshaya/production
npm.cmd run build --workspace @obshaya/admin
```

На локальных данных пройдите активацию и вход по PIN в каждом направлении. Создайте склад, перезагрузите страницу и убедитесь, что он сохранился. Проверьте экспорт и восстановление на тестовых данных. Для расписания установите `0 ч 1 мин`, выберите две тестовые папки и включите отправку копии. После первого цикла проверьте оба файла и вкладку **«Архивация»**, после следующего — обновление файлов и той же записи. Для выпуска Windows отдельно проверьте переход между двумя реальными версиями EXE и отметку об установке в админке.
