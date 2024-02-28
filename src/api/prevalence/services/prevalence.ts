/**
 * prevalence service
 */
import { factories } from '@strapi/strapi';
const fs = require('fs');
import xlsx from 'node-xlsx';
import { getId, getOntologyTupleId } from '../../isolate/extensions/helper';
import { IKeys } from '../../isolate/models/models';
import { mapAllSettled } from '../../../extensions/helper';

let microorganisms;
let contexts;
let types;
let stages;
let matrices;
let matrixDetails;
let categories;
let productions;

let newMicroorganisms;
let newContexts;
let newTypes;
let newStages;
let newMatrices;
let newMatrixDetails;
let newCategories;
let newProductions;

export default factories.createCoreService('api::prevalence.prevalence', ({ strapi }) => ({
    async import(filePath: string) {
        console.time("Import");

        /**
            * Fetch master data
        */
        microorganisms = await strapi.entityService.findMany('api::microorganism.microorganism', {
            fields: ['id', 'name']
        });

        contexts = await strapi.entityService.findMany('api::sampling-context.sampling-context', {
            populate: { ontology_tuple: true }
        });

        types = await strapi.entityService.findMany('api::sample-type.sample-type', {
            populate: { ontology_tuple: true }
        });

        stages = await strapi.entityService.findMany('api::sampling-stage.sampling-stage', {
            populate: { ontology_tuple: true }
        });

        matrices = await strapi.entityService.findMany('api::matrix.matrix', {
            fields: ['id', 'name']
        });

        matrixDetails = await strapi.entityService.findMany('api::matrix-detail.matrix-detail', {
            fields: ['id', 'name']
        });

        categories = await strapi.entityService.findMany('api::animal-species-food-category.animal-species-food-category', {
            populate: { ontology_tuple: true }
        });

        productions = await strapi.entityService.findMany('api::animal-species-production-type-food.animal-species-production-type-food', {
            populate: { ontology_tuple: true }
        });

        /**
            * Get the file from the context and read the data as a json array
        */
        console.time('FileRead');
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer);
        console.timeEnd('FileRead');

        if (!dataFromExcel || dataFromExcel.length == 0) {
            console.timeEnd('Import');
            throw new TypeError("File is not in expected format.");
        }

        let dataFromFirstSheet = dataFromExcel[0].data;

        if (!dataFromFirstSheet || dataFromExcel.length == 0) {
            console.timeEnd('Import');
            throw new TypeError("File is empty.");
        }

        const headers = dataFromFirstSheet.shift();
        let recs: PrevalenceData[] = []
        let keyMappings: IKeys[] = [];

        Object.values(headers).forEach((entry, index) => {
            let key = entry.replace(/\s+/g, '_');
            key = key.replace(/\//g, '_');
            key = key.replace(/\./g, '_');
            key = key.replace(/-/g, '_');
            keyMappings.push({
                index: index,
                name: entry,
                displayName: key
            });
        });

        let recList: any[] = [];
        dataFromFirstSheet.forEach(async (rec, index) => {
            let newRec = {};
            keyMappings.forEach((keyEntry) => {
                newRec[keyEntry.displayName] = rec[keyEntry.index] ? rec[keyEntry.index].toString() : "";
            });
            recList.push(newRec);
        });

        newMicroorganisms = new Set(recList
            .filter((r) => { return r.Mikroorganismus && !getId(microorganisms, "name", r.Mikroorganismus); })
            .map((m) => { return m.Mikroorganismus; }));

        newContexts = new Set(recList
            .filter((r) => { return r.Probenahmegrund && !getOntologyTupleId(contexts, "token", r.Probenahmegrund); })
            .map((m) => { return m.Probenahmegrund; }));

        newTypes = new Set(recList
            .filter((r) => { return r.Probenherkunft && !getOntologyTupleId(types, "token", r.Probenherkunft); })
            .map((m) => { return m.Probenherkunft; }));

        newStages = new Set(recList
            .filter((r) => { return r.Probenahmestelle && !getOntologyTupleId(stages, "token", r.Probenahmestelle); })
            .map((m) => { return m.Probenahmestelle; }));

        newMatrices = new Set(recList
            .filter((r) => { return r.Matrix && !getId(matrices, "name", r.Matrix); })
            .map((m) => { return m.Matrix; }));

        newMatrixDetails = new Set(recList
            .filter((r) => { return r.Matrixdetail && !getId(matrixDetails, "name", r.Matrixdetail); })
            .map((m) => { return m.Matrixdetail; }));

        newCategories = new Set(recList
            .filter((r) => { return r.Tierart_Lebensmittel_Oberkategorie && !getOntologyTupleId(categories, "token", r.Tierart_Lebensmittel_Oberkategorie); })
            .map((m) => { return m.Tierart_Lebensmittel_Oberkategorie; }));

        newProductions = new Set(recList
            .filter((r) => { return r.Tierart_Produktionsrichtung_Lebensmittel && !getOntologyTupleId(productions, "token", r.Tierart_Produktionsrichtung_Lebensmittel); })
            .map((m) => { return m.Tierart_Produktionsrichtung_Lebensmittel; }));

        // Add microorganism
        if (newMicroorganisms.size > 0) {
            let newMD = [];
            newMicroorganisms.forEach((rec: string) => {
                newMD.push({
                    name: rec
                });
            });
            let newMDRes = await addBulkMasterData('api::microorganism.microorganism', newMD);
            newMDRes.ids.forEach((id: number, index: number) => {
                microorganisms.push({ id, name: newMD[index].name });
            });
        }

        // Add sampling-context
        if (newContexts.size > 0) {
            let newSC = [];
            newContexts.forEach((rec: string) => {
                newSC.push({
                    ontology_tuple: {
                        token: rec
                    }
                });
            });

            for (let i = 0; i < newSC.length; i++) {
                const entry = await strapi.entityService.create('api::sampling-context.sampling-context', {
                    data: newSC[i],
                });
                contexts.push(
                    {
                        id: entry.id, ontology_tuple: newSC[i].ontology_tuple
                    }
                );
            }

        }

        // Add sample-types
        if (newTypes.size > 0) {
            let newT = [];
            newTypes.forEach((rec: string) => {
                newT.push({
                    ontology_tuple: {
                        token: rec
                    }
                });
            });
            for (let i = 0; i < newT.length; i++) {
                const entry = await strapi.entityService.create('api::sample-type.sample-type', {
                    data: newT[i],
                });
                types.push(
                    {
                        id: entry.id, ontology_tuple: newT[i].ontology_tuple
                    }
                );
            }
        }

        // Add sampling-stage
        if (newStages.size > 0) {
            let newSt = [];
            newStages.forEach((rec: string) => {
                newSt.push({
                    ontology_tuple: {
                        token: rec
                    }
                });
            });
            for (let i = 0; i < newSt.length; i++) {
                const entry = await strapi.entityService.create('api::sampling-stage.sampling-stage', {
                    data: newSt[i],
                });
                stages.push(
                    {
                        id: entry.id, ontology_tuple: newSt[i].ontology_tuple
                    }
                );
            }
        }

        // Add matrix
        if (newMatrices.size > 0) {
            let newM = [];
            newMatrices.forEach((rec: string) => {
                newM.push({
                    name: rec
                });
            });
            let newMRes = await addBulkMasterData('api::matrix.matrix', newM);
            let newMatricesArr = Array.from(newMatrices);
            newMRes.ids.forEach((id: number, index: number) => {
                matrices.push({ id, name: newM[index].name });
            });
        }

        // Add matrix-details
        if (newMatrixDetails.size > 0) {
            let newMDD = [];
            newMatrixDetails.forEach((rec: string) => {
                newMDD.push({
                    name: rec
                });
            });

            let newMDDRes = await addBulkMasterData('api::matrix-detail.matrix-detail', newMDD);
            newMDDRes.ids.forEach((id: number, index: number) => {
                matrixDetails.push({ id, name: newMDD[index].name });
            });
        }

        // Add categories
        if (newCategories.size > 0) {
            let newC = [];
            newCategories.forEach((rec: string) => {
                newC.push({
                    ontology_tuple: {
                        token: rec
                    }
                });
            });
            for (let i = 0; i < newC.length; i++) {
                const entry = await strapi.entityService.create('api::animal-species-food-category.animal-species-food-category', {
                    data: newC[i],
                });
                categories.push(
                    {
                        id: entry.id, ontology_tuple: newC[i].ontology_tuple
                    }
                );
            }
        }

        // Add productions
        if (newProductions.size > 0) {
            let newP = [];
            newProductions.forEach((rec: string) => {
                newP.push({
                    ontology_tuple: {
                        token: rec
                    }
                });
            });
            for (let i = 0; i < newP.length; i++) {
                const entry = await strapi.entityService.create('api::animal-species-production-type-food.animal-species-production-type-food', {
                    data: newP[i],
                });
                productions.push(
                    {
                        id: entry.id, ontology_tuple: newP[i].ontology_tuple
                    }
                );
            }
        }

        for (let index = 0; index < dataFromFirstSheet.length; index++) {
            const rec = dataFromFirstSheet[index];
            let newRec = {};
            keyMappings.forEach((keyEntry) => {
                newRec[keyEntry.displayName] = rec[keyEntry.index] ? rec[keyEntry.index].toString() : "";
            });
            let newRecord = await setRelationalData(newRec);

            if (newRecord.dbId) {
                recs.push(newRecord);
            }
        }

        console.log(`Inserting total ${recs.length} records`);
        console.time('mapAllSettled');
        const results = await mapAllSettled(recs, savePrevalence, 100, "ID");
        console.timeEnd('mapAllSettled');
        console.timeEnd('Import');
        return results;
    }
}));

/**
 * Converts the input any type object into LabTest object
 * @param record object received from the imported excel
 * @returns new object of type LabTest
 */
const setRelationalData = async (record: any): Promise<PrevalenceData> => {
    const { Jahr, BL, Mikroorganismus, Probenahmegrund, Probenahmestelle, Probenherkunft, Tierart_Lebensmittel_Oberkategorie, Tierart_Produktionsrichtung_Lebensmittel, Matrix, Matrixdetail, ...strippedRecord } = record;
    let newTest: PrevalenceData = strippedRecord;
    newTest.dbId = record.ID;
    newTest.samplingYear = Number(record.Jahr);
    newTest.zomoProgram = record.ZoMo_Programm;
    newTest.furtherDetails = record.Weitere_Details;
    newTest.numberOfSamples = Number(record.Anzahl_Proben_N);
    newTest.numberOfPositive = Number(record.Positive_Proben_N);
    newTest.percentageOfPositive = Number(record.Pos_Proben_Proz);
    newTest.ciMin = Number(record["95_Konfintervall_(min)"]);
    newTest.ciMax = Number(record["95_Konfintervall_(max)"]);
    if (Mikroorganismus) {
        let id = getId(microorganisms, "name", Mikroorganismus);
        if (!id) {
            console.log(`Mikroorganismus ${Mikroorganismus} not found in the master data`);
        }
        newTest.microorganism = {
            "set": [id]
        }
    }

    if (Probenahmegrund) {
        let id = getOntologyTupleId(contexts, "token", Probenahmegrund);
        if (!id) {
            console.log(`Context ${Probenahmegrund} not found in the master data`);
        }
        newTest.samplingContext = {
            "set": [id]
        }
    }

    if (Probenahmestelle) {
        let id = getOntologyTupleId(stages, "token", Probenahmestelle);
        if (!id) {
            console.log(`Stage ${Probenahmestelle} not found in the master data`);
        }
        newTest.samplingStage = {
            "set": [id]
        }
    }

    if (Probenherkunft) {
        let id = getOntologyTupleId(types, "token", Probenherkunft);
        if (!id) {
            console.log(`Type ${Probenherkunft} not found in the master data`);
        }
        newTest.sampleType = {
            "set": [id]
        }
    }

    if (Tierart_Lebensmittel_Oberkategorie) {
        let id = getOntologyTupleId(categories, "token", Tierart_Lebensmittel_Oberkategorie);
        if (!id) {
            console.log(`Category ${Tierart_Lebensmittel_Oberkategorie} not found in the master data`);
        }
        newTest.animalSpeciesFoodCategory = {
            "set": [id]
        }
    }

    if (Tierart_Produktionsrichtung_Lebensmittel) {
        let id = getOntologyTupleId(productions, "token", Tierart_Produktionsrichtung_Lebensmittel);
        if (!id) {
            console.log(`Productions ${Tierart_Produktionsrichtung_Lebensmittel} not found in the master data`);
        }
        newTest.animalSpeciesProductionTypeFood = {
            "set": [id]
        }
    }

    if (Matrix) {
        let id = getId(matrices, "name", Matrix);
        if (!id) {
            console.log(`Matrices ${Matrix} not found in the master data`);
        }
        newTest.matrix = {
            "set": [id]
        }
    }

    if (Matrixdetail) {
        let id = getId(matrixDetails, "name", Matrixdetail);
        if (!id) {
            console.log(`Matrix-Detail ${Matrixdetail} not found in the master data`);
        }
        newTest.matrixDetail = {
            "set": [id]
        }
    }

    return newTest;
}

const addBulkMasterData = async (endpoint: string, data: any) => {
    let response = await strapi.db.query(endpoint).createMany({
        data: data
    });
    return response;
}

/**
 * Save prevalence data using db query
 * @param rec Individual prevalence record to be saved
 * @param i Index of the record for logging purpose
 * @returns Id of the newly added record
 */
const savePrevalence = async (rec, i) => {
    const [entries, count] = await strapi.db.query("api::prevalence.prevalence").findWithCount({
        select: ['id'],
        where: { dbId: rec.dbId }
    });
    if (count > 0) {
        const entry = await strapi.entityService.update("api::prevalence.prevalence", entries[0].id, {
            data: JSON.parse(JSON.stringify(rec))
        });
        return entries[0].id;
    } else {
        let response = await strapi.db.query("api::prevalence.prevalence").create({
            data: JSON.parse(JSON.stringify(rec))
        });
        return response.id;
    }

}

export interface PrevalenceData {
    dbId: any;
    samplingYear: number
    zomoProgram: string
    furtherDetails: string
    numberOfSamples: number
    numberOfPositive: number
    percentageOfPositive: number
    ciMin: number
    ciMax: number
    samplingContext: { "set": number[] }
    samplingStage: { "set": number[] }
    sampleType: { "set": number[] }
    animalSpeciesFoodCategory: { "set": number[] }
    animalSpeciesProductionTypeFood: { "set": number[] }
    matrix: { "set": number[] }
    matrixDetail: { "set": number[] }
    microorganism: { "set": number[] }
}
