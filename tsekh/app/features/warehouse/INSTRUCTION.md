# Склады

Раздел показывает список складов и позволяет добавлять, редактировать и удалять склады. У склада есть название и тип «Готовая продукция» или «Материалы». Для ранее сохранённых складов без типа таблица показывает прочерк.

- Маршрут `/warehouses` объявлен в `app/pages/warehouses/index.vue`.
- Интерфейс раздела находится в `app/features/warehouse/components/WarehousePage.vue`.
- Форма добавления и редактирования находится в `components/WarehouseFormDialog.vue`. Подтверждение удаления находится в `components/DeleteWarehouseDialog.vue`.
- В `tsekh/endpoints/warehouse/` находятся `get-warehouses`, `create-warehouse`, `update-warehouse` и `delete-warehouse`. В каждой папке есть файлы типов, сервиса и стора.
- Сервисы работают с локальным хранилищем браузера. Данные складов входят в JSON-архив «Цеха».
- Пункт «Склады» зарегистрирован в сайдбаре в `app/app.vue`.
