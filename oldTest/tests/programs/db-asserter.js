const assert = require('assert')

let dbAsserter = (error, output) => {
  try {
    output = JSON.parse(output)
  } catch (error) {}
    // insert
  assert(output.insert_doc.name == 'Tono Stark', 'FAIL, insert_doc.name should be Tono Stark\n')
  assert(output.update_doc.name == 'Toni Stark', 'FAIL, update_doc.name should be Toni Stark\n')
    // insert again
  assert(output.another_insert_doc.name == 'Tono Stark', 'FAIL, another_insert_doc should be Tono Stark\n')
    // bulk insert
  assert(output.insert_bulk_docs.length == 2, 'FAIL, insert_bulk_docs\n')
    // bulk update
  assert(output.update_bulk_docs.length == 3, 'FAIL, update_bulk_docs\n')
  for (let i = 0; i < 3; i++) {
    assert(output.update_bulk_docs[i].affiliation == 'Avenger', 'FAIL, update_bulk_docs[' + i + '].affiliation should be Avenger\n')
  }
    // superman
  assert(output.superman_doc.name == 'Clark Kent', 'FAIL, superman_doc.name should be Clark Kent\n')
    // ironman
  assert(output.ironman_doc.name == 'Toni Stark', 'FAIL, ironman_doc.name should be Toni Stark\n')
    // ironman with name
  assert(output.ironman_doc_with_name_1.name == 'Toni Stark', 'FAIL, ironman_doc_with_name_1.name shoud be Toni Stark\n')
  assert(!('affiliation' in output.ironman_doc_with_name_1), 'FAIL, ironman_doc_with_name_1 should not contain affiliation\n')
    // ironman no name
  assert(output.ironman_doc_no_name_1.affiliation == 'Avenger', 'FAIL, ironman_doc_no_name_1.affiliation shoud be Avenger\n')
  assert(!('name' in output.ironman_doc_no_name_1), 'FAIL, ironman_doc_no_name_1 should not contain name\n')
  assert(output.ironman_doc_with_name_1._id == output.ironman_doc_no_name_1._id, 'FAIL, ironman_doc_with_name_1 and ironman_doc_no_name_1 should have the same _id\n')
    // ironman no name & with name 2
  assert(JSON.stringify(output.ironman_doc_no_name_2) == JSON.stringify(output.ironman_doc_no_name_1), 'FAIL, ironman_doc_no_name_2 should be the same with ironman_doc_no_name_1\n')
  assert(JSON.stringify(output.ironman_doc_no_name_3) == JSON.stringify(output.ironman_doc_no_name_1), 'FAIL, ironman_doc_no_name_3 should be the same with ironman_doc_no_name_1\n')
    // ironman no name & with name 3
  assert(JSON.stringify(output.ironman_doc_with_name_2) == JSON.stringify(output.ironman_doc_with_name_1), 'FAIL, ironman_doc_with_name_2 should be the same with ironman_doc_with_name_1\n')
  assert(JSON.stringify(output.ironman_doc_with_name_3) == JSON.stringify(output.ironman_doc_with_name_1), 'FAIL, ironman_doc_with_name_3 should be the same with ironman_doc_with_name_1\n')
    // ironman no name & with name 4
  assert(output.find_docs.length == 4, 'FAIL, find_docs.length should be 4\n')
  assert(!('_history' in output.find_docs[0]), 'Fail, find_docs[0] should not contains _history\n')
    // skip and sort
  assert(output.find_limited_skipped_sorted_docs[0].name == 'Clark Kent', 'FAIL, find_limited_sorted_docs[0].name should be Clark Kent\n')
  assert(output.find_limited_skipped_sorted_docs.length == 2, 'FAIL, find_limited_skipped_sorted_docs.length should be 2\n')
  assert(output.find_limited_skipped_sorted_docs[0].name == 'Clark Kent', 'FAIL, find_limited_skipped_sorted_docs[0].name should be Clark Kent\n')
  assert(output.find_limited_skipped_sorted_docs[1].name == 'Steve Roger', 'FAIL, find_limited_skipped_sorted_docs[1].name should be Steve Roger\n')
    // skip, sort, and filter
  assert(output.find_limited_sorted_filtered_docs.length == 2, 'FAIL, find_limited_sorted_filtered_docs.length should be 2\n')
  assert(output.find_limited_sorted_filtered_docs[0].alias == 'Captain America', 'FAIL, find_limited_sorted_filtered_docs[0].alias should be Captain America\n')
  assert(output.find_limited_sorted_filtered_docs[1].alias == 'Hulk', 'FAIL, find_limited_sorted_filtered_docs[1].alias should be Hulk\n')
  assert(!('name' in output.find_limited_sorted_filtered_docs[0]), 'FAIL, find_limited_sorted_filtered_docs[0] should not have name\n')
  assert(output.find_avenger_docs.length == 3, 'FAIL, find_avenger_docs.length should be 3\n')
  assert(output.find_sharingan_docs.length == 5, 'FAIL, find_sharingan_docs.length should be 5\n')
  assert(('_history' in output.find_sharingan_docs[0]), 'Fail, find_sharingan_docs[0] should contains _history\n')
  assert(output.aggregation_result[0].count == 4, 'FAIL, aggregation_result[0].count should be 4\n')
  assert(output.sum_all_result == 126, 'FAIL, sum_all_result should be 126\n')
  assert(output.sum_avenger_result == 93, 'FAIL, sum_avenger_result should be 93\n')
  assert(output.sum_by_affiliation_result['Justice League'] == 33, 'FAIL, sum_by_affiliation_result["Justice League"] should be 33\n')
  assert(output.sum_by_affiliation_result['Avenger'] == 93, 'FAIL, sum_by_affiliation_result["Avenger"] should be 93\n')
  assert(output.avg_all_result == 31.5, 'FAIL, avg_all_result should be 31.5\n')
  assert(output.avg_avenger_result == 31, 'FAIL, avg_avenger_result should be 31\n')
  assert(output.avg_by_affiliation_result['Justice League'] == 33, 'FAIL, avg_by_affiliation_result["Justice League"] should be 33\n')
  assert(output.avg_by_affiliation_result['Avenger'] == 31, 'FAIL, avg_by_affiliation_result["Avenger"] should be 31\n')
  assert(output.max_all_result == 33, 'FAIL, max_all_result should be 33\n')
  assert(output.max_avenger_result == 32, 'FAIL, max_avenger_result should be 32\n')
  assert(output.max_by_affiliation_result['Justice League'] == 33, 'FAIL, max_by_affiliation_result["Justice League"] should be 33\n')
  assert(output.max_by_affiliation_result['Avenger'] == 32, 'FAIL, max_by_affiliation_result["Avenger"] should be 32\n')
  assert(output.min_all_result == 30, 'FAIL, min_all_result should be 30\n')
  assert(output.min_avenger_result == 30, 'FAIL, min_avenger_result should be 30\n')
  assert(output.min_by_affiliation_result['Justice League'] == 33, 'FAIL, min_by_affiliation_result["Justice League"] should be 33\n')
  assert(output.min_by_affiliation_result['Avenger'] == 30, 'FAIL, min_by_affiliation_result["Avenger"] should be 30\n')
  assert(output.permanent_remove_result.ok == 1, 'FAIL, permanent_remove_result.ok should be 1\n')
  assert(output.permanent_remove_result.n == 5, 'FAIL, permanent_remove_result.n should be 5\n')
}

module.exports = dbAsserter
