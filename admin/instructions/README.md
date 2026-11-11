# Карта админ-панели

UI каждой области изолирован в `app/features/`. Маршруты в `app/pages/` остаются тонкими и подключают соответствующие фичи. Сейчас панель работает на демонстрационных данных.

## Разделы

- Заметки: [инструкция](../app/features/notes/instructions/README.md); демо-записи сохраняются в браузере.
- Заявки: [инструкция](../app/features/requests/instructions/README.md), API — `admin-endpoints/requests/`.
- Клиенты: [инструкция](../app/features/clients/instructions/README.md), API — `admin-endpoints/clients/`.
- Сообщения: [инструкция](../app/features/messages/instructions/README.md), API — `admin-endpoints/messages/`.
- Обновления: [инструкция](../app/features/updates/instructions/README.md), API — `admin-endpoints/updates/`.
- Оболочка панели: [инструкция](../app/features/shell/instructions/README.md).

Каждая фича ведёт собственный `CHANGELOG.md`. Серверная реализация API находится отдельно в `cloudflare/worker/`.
