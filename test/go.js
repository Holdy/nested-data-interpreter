'use strict';

const sut = require('../index');

sut.setup('./menu', './field_defaults');

const records = sut.prepare(['person-basic','order-basic']);

records.forEach(record => {

    const sql = generate_insert_sql(record);
    console.log(sql);

    // we would create the insert sql here, with 'returning *' and pass all the fields back.
    record.set_resolved_value('pk','1234');
let v =1;
});

function generate_insert_sql(record) {
    const insert_values = record.get_insert_values();
    let columns = insert_values.map(item => item.name);
    let values = insert_values.map(item => `$$${item.value}$$`);

    let sql = `
    INSERT INTO ${record.table_name}
           (${columns.join(', ')}) 
           VALUES
           (${values.join(', ')}) 
           RETURNING *;`;

    return sql;
}