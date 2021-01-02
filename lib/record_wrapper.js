const { valueToNode } = require("@babel/types");
const uuid = require('uuid');
const value_wrapper = require("./value_wrapper");

class record_wrapper {

    table_name = null;
    record_reference = null;
    field_definitions = [];

    constructor(table_name, record_reference) {
        this.table_name = table_name;
        this.record_reference = record_reference;
    }

    contains_field_definition(name) {
        let found = false;
        this.field_definitions.forEach(item => {
            if (item.name === name) {
                found = item;
            }
        });
        return found;
    }

    get_insert_values(options) {
        const result = [];

        this.field_definitions.forEach(field_definition => {
            const wrapper = field_definition.value_wrapper;
            if (wrapper.literal_value || wrapper.literal_value === '') {
                result.push({name: field_definition.name, value: wrapper.literal_value});
            } else if (wrapper.generator_name === 'guid-generator') {
                let guid_value = uuid.v4().toString();

                if (options && options.generated_guid_prefix) {
                    guid_value = options.generated_guid_prefix + guid_value.substring(options.generated_guid_prefix.length);
                }
                const pair = {name: field_definition.name, value: guid_value };
                result.push(pair);
                wrapper.resolved_value = pair.value;
            } else if (wrapper.lookup_name_value) {
                const subquery = `(SELECT MIN(${wrapper.lookup_record_field}) FROM ${wrapper.lookup_table_name} WHERE ${wrapper.lookup_name_column} =$$${wrapper.lookup_name_value}$$)`;
                result.push({
                    name: wrapper.lookup_record_field,
                    subquery: subquery
                });           
            } else if (wrapper.lookup_table_name) {
                const pre_resolved_record = wrapper.lookup_record;
                const source_field_name = field_definition.value_wrapper.lookup_record_field;
                const definition = pre_resolved_record.contains_field_definition(source_field_name);
                if (!definition) {
                    throw new Error(`Attempted to find field: ${source_field_name} but not present on ${wrapper.lookup_table_name}#${wrapper.lookup_record_reference}`);
                }
                let value = definition.value_wrapper.literal_value;
                if (!value && value != 0 && value != '') {
                    value = definition.value_wrapper.resolved_value;
                }
                if (!value && value != 0 && value != '') {
                    throw new Error(`Attempted to find field: ${source_field_name} but value was empty on ${wrapper.lookup_table_name}#${wrapper.lookup_record_reference}`);
                } 
                result.push({name: field_definition.name, value: value});
                wrapper.resolved_value = value;

            } else {
                throw new Error('Unhandled definition');
            }

        });

        return result;
    }

    set_resolved_value(name, value) {
        let definition = this.contains_field_definition(name);
        if (!definition) {
            definition = {
                name:name,
                value_wrapper: new value_wrapper()
            };
            this.field_definitions.push(definition);
        }
        definition.value_wrapper.resolved_value = value;
    }

    generate_insert_sql_postgres(options) {
        const insert_values = this.get_insert_values(options);
        let columns = insert_values.map(item => item.name);
        let values = insert_values.map(item => {
            if (item.subquery) {
                return item.subquery;
            } else {
                return `$$${item.value}$$`;
            }
        });
    
        let sql = `
        INSERT INTO ${this.table_name}
               (${columns.join(', ')}) 
               VALUES
               (${values.join(', ')}) 
               RETURNING *;`;
    
        return sql;
    }
    
}

module.exports = record_wrapper;