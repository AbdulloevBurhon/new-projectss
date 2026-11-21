# Цех — главная карта проекта

Начинай здесь при добавлении функции, расследовании ошибки или проверке работы. Найди раздел по экрану, затем открой его инструкцию. Для ошибки на стыке модулей используй таблицу симптомов.

- [Передача проекта другому ИИ](AI-HANDOFF.md)
- [Диагностика по симптомам](docs/diagnostics.md)
- [План изменения и проверки](docs/change-guide.md)
- [Где хранятся данные и какой сервер выполняет запрос](docs/data-and-runtime.md)

## Карта разделов

| Что видно пользователю | Маршрут | Где искать | Журнал |
| --- | --- | --- | --- |
| Активация, вход, ПИН и сообщения поддержки | `/activation`, `/pin`, панель сообщений | [Доступ и поддержка](app/features/access/instructions/README.md) | [Изменения](app/features/access/CHANGELOG.md) |
| Главная и боковое меню | `/`, оболочка приложения | [Главная](app/features/home/instructions/README.md) | [Изменения](app/features/home/CHANGELOG.md) |
| Склады, остатки, история, товары, техкарты, поступление и срок годности | `/warehouses` | [Склад](app/features/warehouse/INSTRUCTION.md) | [Изменения](app/features/warehouse/CHANGELOG.md) |
| Ревизия, пересчёт расхождений и итог | `/revision` | [Ревизия](app/features/revision/INSTRUCTION.md) | [Изменения](app/features/revision/CHANGELOG.md) |
| Счёт, поступление, списание, перевод, история счёта | `/accounts` | [Счета](app/features/accounts/instructions/README.md) | [Изменения](app/features/accounts/CHANGELOG.md) |
| Сотрудники, права, вход сотрудника и его отчёт | `/workers` | [Сотрудники](app/features/workers/INSTRUCTION.md) | [Изменения](app/features/workers/CHANGELOG.md) |
| Клиенты и задолженность | `/clients` | [Клиенты](app/features/clients/instructions/README.md) | [Изменения](app/features/clients/CHANGELOG.md) |
| Продажа, корзина, оплата и чек | `/sales` | [Продажи](app/features/sales/instructions/README.md) | [Изменения](app/features/sales/CHANGELOG.md) |
| Отчёты по продажам | `/reports` | [Отчёты](docs/features/reports.md) | [Изменения](docs/features/reports/CHANGELOG.md) |
| Итоги | `/summary` | [Карточки, периоды и доступ](app/features/summary/instructions/README.md) | [Изменения](app/features/summary/CHANGELOG.md) |
| ПИН, обновления, архив и расписание копий | `/settings` | [Настройки](app/features/settings/instructions/README.md) | [Изменения](app/features/settings/CHANGELOG.md) |
| Telegram, сверка остатков, продажи за два дня и архив | `/settings`, карточка Telegram | [Доставка в Telegram](docs/features/telegram.md) | [Изменения](docs/features/telegram/CHANGELOG.md) |
| Админка, заявки, клиенты, сообщения, обновления и архивы | Отдельное приложение `admin` | [Админка и облако](docs/features/admin.md) | [Изменения](docs/features/admin/CHANGELOG.md) |
| Приложение Windows | Локальный сервер внутри EXE | [Документация Windows](desktop/README.md) | [Изменения](desktop/CHANGELOG.md) |

## Устройство каталогов

| Папка | Что в ней искать |
| --- | --- |
| `app/pages/`, `app/app.vue`, `app/middleware/` | Маршруты, оболочка, меню и переходы между режимами входа |
| `app/features/<раздел>/` | Экраны, компоненты и состояние конкретного раздела |
| `endpoints/` | Контракты, клиентские запросы и состояние операций |
| `server/api/`, `server/middleware/` | Маршруты локального API Nuxt, проверка запросов и прав |
| `server/services/`, `server/database/` | Бизнес-правила, транзакции, схема и запросы SQLite |
| `desktop/`, `desktop/modules/` | Обработчики локального API на C#, управление окнами, архивами и обновлениями |
| `../shared/ui/` | Общие компоненты интерфейса для приложений монорепозитория |
| `../cloudflare/worker/` | Облачный API, D1, R2, интеграция Telegram |
| `../admin/` | Интерфейс операторской админки |

При изменении поступления проверь остаток и историю счёта. При изменении продажи проверь остаток, счёт, долг клиента, чек и отчёт сотрудника. При изменении схемы проверь обновление старой базы и перенос данных через архив.

Команда запуска из корня монорепозитория — `npm.cmd run dev:tsekh`. Если сервер уже запущен, используй текущий адрес из терминала, обычно `http://localhost:3000/`.
