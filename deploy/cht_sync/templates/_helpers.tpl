{{- define "cht_sync.postgres_connection_string" -}}
postgres://{{ .Values.postgres.user }}:{{ .Values.postgres.password }}@{{ .Values.postgres.host | default "postgres" }}:{{ .Values.postgres.port | default 5432 }}/{{ .Values.postgres.db }}?sslmode=disable
{{- end -}}
