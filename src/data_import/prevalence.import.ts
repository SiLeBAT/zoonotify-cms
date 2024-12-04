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

        if (prevalenceData.data.length <= 1) {
            console.error('No data found in the Prevalences sheet');
            return;
        }

        // Adjust the indices based on your Excel file structure
        let dataList = prevalenceData.data.slice(1).map(row => ({
            dbId: String(row[0]),
            zomoProgram: row[1],
            samplingYear: parseInt(row[2]),
            microorganism_de: row[3],
            microorganism_en: row[4],
            sampleType_de: row[5],
            sampleType_en: row[6],
            superCategorySampleOrigin_de: row[7],
            superCategorySampleOrigin_en: row[8],
            sampleOrigin_de: row[9],
            sampleOrigin_en: row[10],
            samplingStage_de: row[11],
            samplingStage_en: row[12],
            matrixGroup_de: row[13],
            matrixGroup_en: row[14],
            matrix_de: row[15],
            matrix_en: row[16],
            matrixDetail_de: row[17],
            matrixDetail_en: row[18],
            furtherDetails: row[19],
            numberOfSamples: parseInt(row[20]),
            numberOfPositive: parseInt(row[21]),
            percentageOfPositive: parseFloat(row[22]),
            ciMin: row[23] !== '' && row[23] != null ? parseFloat(row[23]) : null,
            ciMax: row[24] !== '' && row[24] != null ? parseFloat(row[24]) : null,
        }));

        importLog.TotalRecords = dataList.length;

        for (const item of dataList) {
            try {
                // Fetch IDs for English locale
                const matrixId_en = await findEntityIdByName('api::matrix.matrix', item.matrix_en, 'en');
                const matrixDetailId_en = await findEntityIdByName('api::matrix-detail.matrix-detail', item.matrixDetail_en, 'en');
                const microorganismId_en = await findEntityIdByName('api::microorganism.microorganism', item.microorganism_en, 'en');
                const sampleTypeId_en = await findEntityIdByName('api::sample-type.sample-type', item.sampleType_en, 'en');
                const samplingStageId_en = await findEntityIdByName('api::sampling-stage.sampling-stage', item.samplingStage_en, 'en');
                const sampleOriginId_en = await findEntityIdByName('api::sample-origin.sample-origin', item.sampleOrigin_en, 'en');
                const matrixGroupId_en = await findEntityIdByName('api::matrix-group.matrix-group', item.matrixGroup_en, 'en');
                const superCategorySampleOriginId_en = await findEntityIdByName('api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin_en, 'en');

                const dataToSave_en = {
                    dbId: item.dbId,
                    zomoProgram: item.zomoProgram,
                    samplingYear: item.samplingYear,
                    furtherDetails: item.furtherDetails,
                    numberOfSamples: item.numberOfSamples,
                    numberOfPositive: item.numberOfPositive,
                    percentageOfPositive: item.percentageOfPositive,
                    ciMin: item.ciMin,
                    ciMax: item.ciMax,
                    matrix: matrixId_en,
                    matrixDetail: matrixDetailId_en,
                    microorganism: microorganismId_en,
                    sampleType: sampleTypeId_en,
                    samplingStage: samplingStageId_en,
                    sampleOrigin: sampleOriginId_en,
                    matrixGroup: matrixGroupId_en,
                    superCategorySampleOrigin: superCategorySampleOriginId_en,
                    locale: 'en',
                };

                // Create or update the default locale ('en') entry
                let existingEntriesEn = await strapi.entityService.findMany('api::prevalence.prevalence', {
                    filters: { dbId: item.dbId },
                    locale: 'en',
                });

                let defaultEntry;

                if (existingEntriesEn.length > 0) {
                    // Update existing English entry
                    defaultEntry = await strapi.entityService.update('api::prevalence.prevalence', existingEntriesEn[0].id, {
                        data: dataToSave_en,
                    });
                } else {
                    // Create new English entry
                    defaultEntry = await strapi.entityService.create('api::prevalence.prevalence', {
                        data: dataToSave_en,
                    });
                }

                // Fetch IDs for German locale
                const matrixId_de = await findEntityIdByName('api::matrix.matrix', item.matrix_de, 'de');
                const matrixDetailId_de = await findEntityIdByName('api::matrix-detail.matrix-detail', item.matrixDetail_de, 'de');
                const microorganismId_de = await findEntityIdByName('api::microorganism.microorganism', item.microorganism_de, 'de');
                const sampleTypeId_de = await findEntityIdByName('api::sample-type.sample-type', item.sampleType_de, 'de');
                const samplingStageId_de = await findEntityIdByName('api::sampling-stage.sampling-stage', item.samplingStage_de, 'de');
                const sampleOriginId_de = await findEntityIdByName('api::sample-origin.sample-origin', item.sampleOrigin_de, 'de');
                const matrixGroupId_de = await findEntityIdByName('api::matrix-group.matrix-group', item.matrixGroup_de, 'de');
                const superCategorySampleOriginId_de = await findEntityIdByName('api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin_de, 'de');

                const dataToSave_de = {
                    dbId: item.dbId,
                    zomoProgram: item.zomoProgram,
                    samplingYear: item.samplingYear,
                    furtherDetails: item.furtherDetails,
                    numberOfSamples: item.numberOfSamples,
                    numberOfPositive: item.numberOfPositive,
                    percentageOfPositive: item.percentageOfPositive,
                    ciMin: item.ciMin,
                    ciMax: item.ciMax,
                    matrix: matrixId_de,
                    matrixDetail: matrixDetailId_de,
                    microorganism: microorganismId_de,
                    sampleType: sampleTypeId_de,
                    samplingStage: samplingStageId_de,
                    sampleOrigin: sampleOriginId_de,
                    matrixGroup: matrixGroupId_de,
                    superCategorySampleOrigin: superCategorySampleOriginId_de,
                    locale: 'de',
                    localizationOf: defaultEntry.id,
                };

                // Check if German entry exists
                let existingEntriesDe = await strapi.entityService.findMany('api::prevalence.prevalence', {
                    filters: { dbId: item.dbId },
                    locale: 'de',
                });

                if (existingEntriesDe.length > 0) {
                    // Update existing German entry
                    await strapi.entityService.update('api::prevalence.prevalence', existingEntriesDe[0].id, {
                        data: dataToSave_de,
                    });
                } else {
                    // Create new German entry linked to the English one
                    await strapi.entityService.create('api::prevalence.prevalence', {
                        data: dataToSave_de,
                    });
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

// Utility function to find entity ID by name and locale
async function findEntityIdByName(apiEndpoint, name, locale) {
    if (!name) return null;
    const entities = await strapi.entityService.findMany(apiEndpoint, {
        filters: { name },
        locale: locale,
    });
    return entities.length > 0 ? entities[0].id : null;
}

export { importPrevalences };
