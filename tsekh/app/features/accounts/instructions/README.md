# accounts feature

- components/: UI owned by this section.
- composables/: section-specific UI behavior and orchestration.
- Keep API calls in 	sekh/endpoints; do not import another feature's internals.
- Keep files focused and under 120 lines; split by responsibility when needed.

Кнопка информации открывает `AccountDetailsDialog.vue` и загружает баланс и расходы одним запросом `GET /api/accounts/:id`. В таблице с пагинацией показаны проведённые закупки, ручные списания и исходящие переводы. Для закупок количество и цена относятся к единице поступления, а содержимое упаковки показано отдельно.
