import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importPrevalences(strapi) {
    let filePath = path.join(__dirname, '../../../data/master-data/prevalence.xlsx');

    let outFilePath = path.join(__dirname, '../../../data/prevalence-import-result.json');  // Path for the output log file

    let importLog = {
        TotalRecords: 0,
        SuccessfullySaved: 0,
        Failures: []
    };


    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer);
        const prevalenceData = dataFromExcel.find(sheet => sheet.name === 'prevalence');

        if (!prevalenceData) {
            console.error('Prevalences sheet not found in the file');
            return;
        }

        if (prevalenceData.data.length === 0) {
            console.error('No data found in the Prevalences sheet');
            return;
        }


        let dataList = prevalenceData.data.slice(1).map(row => ({
            dbId: String(row[0]),
            samplingYear: parseInt(row[2]),
            zomoProgram: row[1],
            furtherDetails: row[11],
            numberOfSamples: parseInt(row[12]),
            numberOfPositive: parseInt(row[13]),
            percentageOfPositive: parseFloat(row[14]),
            ciMin: row[15] !== '' && row[15] != null ? parseFloat(row[15]) : null,
            ciMax: row[16] !== '' && row[16] != null ? parseFloat(row[16]) : null,
            matrix: row[9],
            matrixDetail: row[10],
            microorganism: row[3],
            sampleType: row[4],
            samplingStage: row[7],
            sampleOrigin: row[6],
            matrixGroup: row[8],
            superCategorySampleOrigin: row[5]
        }));

        importLog.TotalRecords = dataList.length;

        for (const item of dataList) {
            try {

        let dataList = prevalenceData.data.slice(1).map((row, index) => { // Include index for row identification
            // Log each row to see what data is available
            //console.log(`Row ${index + 2} data:`, row);
            return {
                dbId: String(row[0]), // Convert dbId to string
                samplingYear: parseInt(row[2]),
                zomoProgram: row[1],
                numberOfSamples: parseInt(row[12]),
                numberOfPositive: parseInt(row[13]),
                percentageOfPositive: parseFloat(row[14]),
                ciMin: row[15] !== '' && row[15] != null ? parseFloat(row[15]) : null,
                ciMax: row[16] !== '' && row[16] != null ? parseFloat(row[16]) : null,
                matrix: row[9],
                microorganism: row[3],
                samplingStage: row[7],
                sampleOrigin: row[6],
                matrixGroup: row[8],
                superCategorySampleOrigin: row[5]
            };
        });

        for (const [index, item] of dataList.entries()) { // Use entries to get index
            try {
                // Resolve relations by unique identifier

                const matrixId = await findEntityIdByName('api::matrix.matrix', item.matrix);
                const microorganismId = await findEntityIdByName('api::microorganism.microorganism', item.microorganism);
                const samplingStageId = await findEntityIdByName('api::sampling-stage.sampling-stage', item.samplingStage);
                const sampleOriginId = await findEntityIdByName('api::sample-origin.sample-origin', item.sampleOrigin);
                const matrixGroupId = await findEntityIdByName('api::matrix-group.matrix-group', item.matrixGroup);
                const superCategorySampleOriginId = await findEntityIdByName('api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin);

                const dataToSave = {
                    ...item,
                    matrix: matrixId,
                    microorganism: microorganismId,
                    samplingStage: samplingStageId,
                    sampleOrigin: sampleOriginId,
                    matrixGroup: matrixGroupId,
                    superCategorySampleOrigin: superCategorySampleOriginId
                };

                let existingEntries = await strapi.entityService.findMany('api::prevalence.prevalence', {
                    filters: { dbId: item.dbId },
                });

                if (existingEntries.length > 0) {
                    await strapi.entityService.update('api::prevalence.prevalence', existingEntries[0].id, { data: dataToSave });
                    //console.log(`Successfully updated item at row ${index + 2} with dbId: ${item.dbId}`);
                } else {
                    await strapi.entityService.create('api::prevalence.prevalence', { data: dataToSave });
                    console.log(`Successfully created new item at row ${index + 2} with dbId: ${item.dbId}`);
                }
                importLog.SuccessfullySaved++;
            } catch (error) {

                console.error('Error importing prevalence data:', error);
                importLog.Failures.push({ dbId: item.dbId, error: error.message });

            }
        }

        fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
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
