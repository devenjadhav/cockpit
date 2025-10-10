// Quick test script to verify Airtable organization filtering
require('dotenv').config();
const Airtable = require('airtable');

const organizationSlug = 'shelburne';

Airtable.configure({
  apiKey: process.env.AIRTABLE_API_KEY,
});

const base = Airtable.base(process.env.AIRTABLE_BASE_ID);
const eventsTable = base('events');

console.log(`Testing Airtable filter for organization: ${organizationSlug}`);
console.log(`Filter formula: {slug} = "${organizationSlug}"`);

eventsTable
  .select({
    filterByFormula: `{slug} = "${organizationSlug}"`,
    maxRecords: 100,
  })
  .all()
  .then(records => {
    console.log(`\nFound ${records.length} events for organization "${organizationSlug}":`);
    records.forEach((record, index) => {
      console.log(`${index + 1}. ${record.fields.event_name} (slug: ${record.fields.slug})`);
    });
    
    if (records.length === 0) {
      console.log('\n⚠️  No events found! Checking all events...');
      return eventsTable.select({ maxRecords: 10 }).all();
    }
  })
  .then(allRecords => {
    if (allRecords) {
      console.log(`\nSample of all events in Airtable:`);
      allRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.fields.event_name} (slug: ${record.fields.slug || 'NO SLUG'})`);
      });
    }
  })
  .catch(error => {
    console.error('Error querying Airtable:', error);
  });
