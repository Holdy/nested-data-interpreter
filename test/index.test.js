'use strict';

const sut = require('../index');
const path = require('path');

sut.setup(path.join(__dirname, 'menu'), path.join(__dirname, './field_defaults'));

test('basic sql preparation', () => {

    const records = sut.prepare(['person/basic','order/basic']);

    expect(records.length).toBe(2);

    const record_0_sql = records[0].generate_insert_sql_postgres();
    let simplified_sql = simplify_sql(record_0_sql);
    expect(simplified_sql.substring(0, 71)).toBe(' INSERT INTO myschema.person (firstname, person_id) VALUES ($$Steve$$, ');

    records[0].set_resolved_value('pk', '1234');

    const record_1_sql = records[1].generate_insert_sql_postgres();
    simplified_sql = simplify_sql(record_1_sql.replace(/........-....-....-....-............/, 'some-guid'));
    expect(simplified_sql).toBe(' INSERT INTO myschema.order (person_id, order_person_pk) VALUES ($$some-guid$$, $$1234$$) RETURNING *;');
});

function simplify_sql(sql) {
    return sql.replace(/[\n\r \t\s]+/g, ' ');
}
