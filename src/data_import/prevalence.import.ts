import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importPrevalences(strapi) {
    let filePath = path.join(__dirname, '../../../data//master-data/prevalence.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const prevalenceData = dataFromExcel.find(sheet => sheet.name === 'prevalence');

        if (!prevalenceData) {
            console.error('Prevalences sheet not found in the file');
            return;
        }

        if (prevalenceData.data.length === 0) {
            console.error('No data found in the Prevalences sheet');
            return;
        }

        let dataList = prevalenceData.data.slice(1).map(row => {
            // Logging each row to see what data is available
            console.log('Row data:', row);
            return {
                dbId: String(row[0]), // Convert dbId to string
                samplingYear: parseInt(row[2]),
                zomoProgram: row[1],
                furtherDetails: row[11],
                numberOfSamples: parseInt(row[12]),
                numberOfPositive: parseInt(row[13]),
                percentageOfPositive: parseFloat(row[14]),
                ciMin: parseFloat(row[15]),
                ciMax: parseFloat(row[16]),
                matrix: row[9], // Relation identifier
                matrixDetail: row[10], // Relation identifier
                microorganism: row[3], // Relation identifier
                sampleType: row[4], // Relation identifier
                samplingStage: row[7], // Relation identifier
                sampleOrigin: row[6], // Relation identifier
                matrixGroup: row[8], // Relation identifier
                superCategorySampleOrigin: row[5] // Relation identifier
            };
        });

        for (const item of dataList) {
            console.log('Processing item:', item);
            try {
                // Assuming the existence of utility functions to resolve relations by unique identifier
                const matrixId = await findEntityIdByName('api::matrix.matrix', item.matrix);
                const matrixDetailId = await findEntityIdByName('api::matrix-detail.matrix-detail', item.matrixDetail);
                const microorganismId = await findEntityIdByName('api::microorganism.microorganism', item.microorganism);
                const sampleTypeId = await findEntityIdByName('api::sample-type.sample-type', item.sampleType);
                const samplingStageId = await findEntityIdByName('api::sampling-stage.sampling-stage', item.samplingStage);
                const sampleOriginId = await findEntityIdByName('api::sample-origin.sample-origin', item.sampleOrigin);
                const matrixGroupId = await findEntityIdByName('api::matrix-group.matrix-group', item.matrixGroup);
                const superCategorySampleOriginId = await findEntityIdByName('api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin);

                const dataToSave = {
                    ...item,
                    matrix: matrixId,
                    matrixDetail: matrixDetailId,
                    microorganism: microorganismId,
                    sampleType: sampleTypeId,
                    samplingStage: samplingStageId,
                    sampleOrigin: sampleOriginId,
                    matrixGroup: matrixGroupId,
                    superCategorySampleOrigin: superCategorySampleOriginId
                };

                // Check if the entry already exists based on 'dbId'
                let existingEntries = await strapi.entityService.findMany('api::prevalence.prevalence', {
                    filters: { dbId: item.dbId },
                });

                if (existingEntries.length > 0) {
                    console.log('Updating existing item:', item.dbId);
                    await strapi.entityService.update('api::prevalence.prevalence', existingEntries[0].id, { data: dataToSave });
                } else {
                    console.log('Creating new item:', item.dbId);
                    await strapi.entityService.create('api::prevalence.prevalence', { data: dataToSave });
                }
            } catch (error) {
                console.error('Error importing prevalence data:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

// Utility function to find entity ID by name
async function findEntityIdByName(apiEndpoint, name) {
    if (!name) return null;
    const entities = await strapi.entityService.findMany(apiEndpoint, {
        filters: { name },
    });
    return entities.length > 0 ? entities[0].id : null;
}

export { importPrevalences };
