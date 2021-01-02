'use strict';

const path = require('path');

const sut = require('../index');

sut.setup(path.join(__dirname, 'menu'), path.join(__dirname, './field_defaults'));

test('reference-fail-on-table-name', () => {
    
    expect(() => sut.prepare(['fails/invalid-table-name']))
    .toThrow(Error);
    
});

test('fail-if-file-at-wrong-level', () => {
    
    expect(() => sut.prepare(['fails/file-too-high']))
    .toThrow(Error);
    
});

test('fail-on-bad-line-1', () => {
    
    expect(() => sut.prepare(['fails/non-literal-too-many-tokens']))
    .toThrow(Error);
    
});

test('fail-on-bad-line-2', () => {
    
    expect(() => sut.prepare(['fails/non-literal-bad-reference-format']))
    .toThrow(Error);
    
});
test('field-trumps-default', () => {
    
    const records = sut.prepare(['fails/field-trumps-default']);
    const record = records[0];
    const field = record.field_definitions[0];
    expect(field.value_wrapper.literal_value).toBe('Fred');
    
});

test('basic-sql-preparation', () => {

    const records = sut.prepare(['person/basic','order/basic']);

    expect(records.length).toBe(2);

    const record_0_sql = records[0].generate_insert_sql_postgres();
    let simplified_sql = simplify_sql(record_0_sql);
    expect(simplified_sql).toBe('INSERT INTO myschema.person (firstname, person_id) VALUES ($$Steve$$, $$some-guid$$) RETURNING *;');

    records[0].set_resolved_value('pk', '1234');

    const record_1_sql = records[1].generate_insert_sql_postgres();
    simplified_sql = simplify_sql(record_1_sql);
    expect(simplified_sql).toBe('INSERT INTO myschema.order (person_id, order_id, order_person_pk) VALUES ($$some-guid$$, $$1$$, $$1234$$) RETURNING *;');
});

test('sql-preparation_with_guid_prefix', () => {

    const records = sut.prepare(['person/basic']);

    expect(records.length).toBe(1);

    const record_0_sql = records[0].generate_insert_sql_postgres({generated_guid_prefix: 'facefeed'});
   
    expect(record_0_sql).toContain('$$facefeed-');
});

test('sql-preparation_with_of_subquery', () => {

    const records = sut.prepare(['person/basic','order/basic','order-line/tooth-brush']);

    expect(records.length).toBe(3);

    const record_2_sql = simplify_sql(records[2].generate_insert_sql_postgres({generated_guid_prefix: 'facefeed'}));
   
    expect(record_2_sql).toBe('INSERT INTO myschema.order_line (order_id, product_id) VALUES ($$1$$, (SELECT MIN(product_id) FROM product WHERE prod_name =$$Tooth Brush$$)) RETURNING *;');
});

function simplify_sql(sql) {
    return sql.replace(/[\n\r \t\s]+/g, ' ').replace(/........-....-....-....-............/g, 'some-guid').trim();
}
