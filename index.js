'use strict';

const fs = require('fs');
const path = require('path');

const value_wrapper = require('./lib/value_wrapper');
const record_wrapper = require('./lib/record_wrapper');

let settings;


function setup(menu_directory, field_defaults_directory) {
    settings = {menu_directory, field_defaults_directory};
}

function prepare (menu_choices) {
    const result_records = [];

    menu_choices.forEach(raw_choice => {
        const choice = raw_choice.replace(':','/').replace('\\','/');
        process_directory(path.join(settings.menu_directory, choice), null, result_records);
    });

    return result_records;
}

function find_by_table_name_and_record_reference(result_records, table_name, record_reference) {
    // search backwards
    for(let i = result_records.length - 1; i >=0; i--) {
        const test_record = result_records[i];
        if (test_record.table_name === table_name && test_record.record_reference === record_reference) {
            return test_record;
        }
    }

}

function process_directory(directory_name, table_name, result_records) {

    // may be no files, especially for the root menu choice.
    const directory_entries = fs.readdirSync(directory_name);

    directory_entries.forEach(directory_entry => {
        const full_entry_name = path.join(directory_name, directory_entry);
        const stats = fs.statSync(full_entry_name);
        if (stats.isFile()) {
            if (table_name === null) {
                throw new Error(`Not expecting files at this level: ${full_entry_name}`);
            }
            const record_reference = directory_entry.split('.')[0];
            const content = fs.readFileSync(full_entry_name).toString();
            
            const item = new record_wrapper(table_name, record_reference);
            result_records.push(item);

            content.split('\n').forEach(rawLine => {
                const line = rawLine.trim();
                if (line != '') {
                    const interpretation = interpret_record_line(full_entry_name, line);

                    item.field_definitions.push(interpretation); //.name] = interpretation.value_wrapper;
                }
            });

            // apply defaults.
            const default_file_name = path.join(settings.field_defaults_directory, `${table_name}.txt`);
            if (fs.existsSync(default_file_name)) {
                const default_file_content = fs.readFileSync(default_file_name).toString();
                default_file_content.split('\n').forEach(rawLine => {
                    const line = rawLine.trim();
                    if (line != '') {
                        const interpretation = interpret_record_line(default_file_content, line);
                        if (!item.contains_field_definition(interpretation.name)) {
                            item.field_definitions.push(interpretation);
                        }
                    }
                });
            }

            // check all references are known
            item.field_definitions.forEach(field_definition => {
                if (field_definition.value_wrapper.lookup_table_name && !field_definition.value_wrapper.lookup_name_value) {
                    const referenced_record = find_by_table_name_and_record_reference(
                                                result_records,
                                                field_definition.value_wrapper.lookup_table_name, 
                                                field_definition.value_wrapper.lookup_record_reference);
                    if (!referenced_record) {
                        throw new Error(`line from ${full_entry_name} specified unavailable value ${field_definition.value_wrapper.lookup_table_name}#${field_definition.value_wrapper.lookup_record_reference} for field ${field_definition.name}`);
                    } else {
                        field_definition.value_wrapper.lookup_record = referenced_record;
                    }
                    
                }
            });

        }
    });

    directory_entries.forEach(directory_entry => {
        const full_entry_name = path.join(directory_name, directory_entry);
        const stats = fs.statSync(full_entry_name);
        if (!stats.isFile()) {
            process_directory(full_entry_name, directory_entry, result_records);
        }
    });

}

function interpret_record_line(source_file, line) {
    const equals_index = line.indexOf('=');
    if (equals_index != -1) {
        return {
            name: line.substring(0,equals_index).trim(),
            value_wrapper: new value_wrapper(line.substring(equals_index+1).trim())

        }
    } else {
        const parts = line.replace(/[ \t]+/g, ' ').split(' ');

        if (parts.length > 4 && parts[1] == 'where' && parts[3] == 'is') {
            if (parts[0].indexOf('_id') != -1) {
                const ofIndex = line.indexOf(' is ');
                const name_value= line.substring(ofIndex + 4).trim();
                return {
                    name: parts[0],
                    value_wrapper: build_id_resolution_from_name(parts[0], parts[2], name_value, line, source_file)
                }
            } else {
                throw new Error(`Column must follow the pattern *_id to use 'where x =' - "${line}" from ${source_file}`);
            }
        }

        if (parts.length != 3 || parts[1].toLowerCase() != 'from') {
            throw new Error(`Line not understood: "${line}" from ${source_file}`);
        }

        const name = parts[0];
        const source = parts[2];

        if (source === 'guid-generator' || source === 'uuid-generator') {
            const wrapper = new value_wrapper();
            wrapper.generator_name = 'guid-generator';
            return {
                name: name,
                value_wrapper : wrapper
            }
        } else {
            // table name and 
            // should be of the form {table_name}#{record_reference}
            const parts = source.split(/[#@]/);

            if (parts.length == 2) {
                parts.push(name);
            }
            if (parts.length != 3) {
                throw new Error(`Expected table-name#record-reference[@field] but got "${line} from ${source_file}"`)
            }
            return {
                name: name,
                value_wrapper:new value_wrapper(null, parts[0], parts[1], parts[2])
            }
        }

    }
}

function build_id_resolution_from_name(id_column_name,  name_column, name_value, line, source_file) {

    const result = new value_wrapper();

    result.lookup_table_name = id_column_name.replace(/_id$/, '');
    result.lookup_record_field = id_column_name;
    result.lookup_name_value = name_value;
    result.lookup_name_column = name_column;

    return result;
}

module.exports.setup = setup;
module.exports.prepare = prepare;
