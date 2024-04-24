import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importMicroorganisms(strapi) {
    let filePath = path.join(__dirname, '../../../data//master-data/microorganism.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const microorganismData = dataFromExcel.find(sheet => sheet.name === 'microorganism');

        if (!microorganismData) {
            console.error('Microorganisms sheet not found in the file');
            return;
        }

        if (microorganismData.data.length === 0) {
            console.error('No data found in the Microorganisms sheet');
            return;
        }

        let dataList = microorganismData.data.slice(1).map(row => {
            
            return {
                name: row[0], // Assuming 'name' is in the first column
                iri: row[1],  // Assuming 'iri' is in the second column
                isolateName: row[2] // Assuming the name or identifier of the isolate is in the third column
            };
        });

        for (const item of dataList) {
            try {
                let existingMicroorganism = await strapi.entityService.findMany('api::microorganism.microorganism', {
                    filters: { name: item.name },
                });

                let isolateId = null;
                if (item.isolateName) {
                    // Assuming isolateName is unique or an identifier for isolates
                    let isolates = await strapi.entityService.findMany('api::isolate.isolate', {
                        filters: { name: item.isolateName },
                    });
                    isolateId = isolates.length > 0 ? isolates[0].id : null;
                }

                if (existingMicroorganism.length > 0) {
                    // Update existing entry with potential new isolate linkage
                    await strapi.entityService.update('api::microorganism.microorganism', existingMicroorganism[0].id, {
                        data: { ...item, isolates: isolateId ? [isolateId] : [] },
                    });
                } else {
                    // Create new entry with isolate linkage
                    await strapi.entityService.create('api::microorganism.microorganism', {
                        data: { ...item, isolates: isolateId ? [isolateId] : [] },
                    });
                }
            } catch (error) {
                console.error('Error importing microorganism:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importMicroorganisms };