import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importSamplingStages(strapi) {
    let filePath = path.join(__dirname, '../../../data//master-data/samplingstage.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const samplingStageData = dataFromExcel.find(sheet => sheet.name === 'samplingstage');

        if (!samplingStageData) {
            console.error('SamplingStages sheet not found in the file');
            return;
        }

        if (samplingStageData.data.length === 0) {
            console.error('No data found in the SamplingStages sheet');
            return;
        }

        let dataList = samplingStageData.data.slice(1).map(row => {
            // Logging each row to see what data is available
            return {
                name: row[0], // Assuming 'name' is in the first column
                iri: row[1]  // Assuming 'iri' is in the second column
            };
        });


        for (const item of dataList) {
            try {
                // Check if the entry already exists based on 'name'
                let existingEntries = await strapi.entityService.findMany('api::sampling-stage.sampling-stage', {
                    filters: { name: item.name },
                });

                if (existingEntries.length > 0) {
                    // Update the first found entry (assuming 'name' is unique)
                    await strapi.entityService.update('api::sampling-stage.sampling-stage', existingEntries[0].id, { data: item });
                } else {
                    // Create new entry
                    await strapi.entityService.create('api::sampling-stage.sampling-stage', { data: item });
                }
            } catch (error) {
                console.error('Error importing sampling stage:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importSamplingStages };
