{% macro select_table(source_table, test_table) %}

  {% if target.name == 'test' %}

    {{ return(test_table) }}

  {% else %}

    {{ return(source_table) }}

  {% endif %}

{% endmacro %}
