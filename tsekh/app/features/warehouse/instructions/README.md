# warehouse feature

- components/: UI owned by this section.
- composables/: section-specific UI behavior and orchestration.
- Keep API calls in 	sekh/endpoints; do not import another feature's internals.
- Keep files focused and under 120 lines; split by responsibility when needed.
