'use strict'

class value_wrapper {
    literal_value = null;
    resolved_value = null;
    lookup_table_name = null;
    lookup_record_reference = null;
    lookup_record_field = null;
    generator_name = null;

    constructor(literal_value, lookup_table_name, lookup_record_reference, lookup_record_field) {
        this.literal_value = literal_value;
        this.lookup_table_name = lookup_table_name;
        this.lookup_record_reference = lookup_record_reference;
        this.lookup_record_field = lookup_record_field;
    }

}

module.exports = value_wrapper;