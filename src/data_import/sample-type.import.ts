import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importSampleTypes(strapi) {
    let filePath = path.join(__dirname, '../../../data//master-data/sampletypes.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const sampleTypeData = dataFromExcel.find(sheet => sheet.name === 'sampletypes');

        if (!sampleTypeData) {
            console.error('SampleTypes sheet not found in the file');
            return;
        }

        if (sampleTypeData.data.length === 0) {
            console.error('No data found in the SampleTypes sheet');
            return;
        }

        let dataList = sampleTypeData.data.slice(1).map(row => {
            // Logging each row to see what data is available
            return {
                name: row[0], // Assuming 'name' is in the first column
                iri: row[1]  // Assuming 'iri' is in the second column
            };
        });


        for (const item of dataList) {
            try {
                // Check if the entry already exists based on 'name'
                let existingEntries = await strapi.documents('api::sample-type.sample-type').findMany({
                    filters: { name: item.name },
                });

                if (existingEntries.length > 0) {
                    // Update the first found entry (assuming 'name' is unique)
                    await strapi.documents('api::sample-type.sample-type').update({
                        documentId: "__TODO__",
                        data: item
                    });
                } else {
                    // Create new entry
                    await strapi.documents('api::sample-type.sample-type').create({ data: item });
                }
            } catch (error) {
                console.error('Error importing sample type:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importSampleTypes };
