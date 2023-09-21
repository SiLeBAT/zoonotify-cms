/**
 * isolate service
 */
import { factories } from '@strapi/strapi';
import { IKeys, IIsolate, Isolate } from '../models/models';
import { getDateTimeISOString, getId } from '../../../extensions/helper';
const fs = require('fs');
import xlsx from 'node-xlsx';
const { promisify } = require('util');
const { setImmediate } = require('timers');
const setImmediateP = promisify(setImmediate);

let states;
let microorganisms;
let objectives;
let salmonellas;
let origins;
let points;
let matrices;
let matrixDetails;
let categories;
let productions;

export default factories.createCoreService('api::isolate.isolate', ({ strapi }) => ({
    async import(ctx) {
        console.time("Import");

        /**
            * Fetch master data
        */
        states = await strapi.entityService.findMany('api::state.state', {
            fields: ['id', 'name']
        });

        microorganisms = await strapi.entityService.findMany('api::microorganism.microorganism', {
            fields: ['id', 'name']
        });

        objectives = await strapi.entityService.findMany('api::sampling-objective.sampling-objective', {
            fields: ['id', 'name']
        });

        salmonellas = await strapi.entityService.findMany('api::salmonella.salmonella', {
            fields: ['id', 'name']
        });

        origins = await strapi.entityService.findMany('api::sampling-origin.sampling-origin', {
            fields: ['id', 'name']
        });

        points = await strapi.entityService.findMany('api::sampling-point.sampling-point', {
            fields: ['id', 'name']
        });

        matrices = await strapi.entityService.findMany('api::matrix.matrix', {
            fields: ['id', 'name']
        });

        matrixDetails = await strapi.entityService.findMany('api::matrix-detail.matrix-detail', {
            fields: ['id', 'name']
        });

        categories = await strapi.entityService.findMany('api::animal-species-food-category.animal-species-food-category', {
            fields: ['id', 'name']
        });

        productions = await strapi.entityService.findMany('api::animal-species-production-direction-food.animal-species-production-direction-food', {
            fields: ['id', 'name']
        });

        /**
            * Get the file from the context and read the data as a json array
        */
        console.time('FileRead');
        const { request: { files: { file = '' } = {} } } = ctx;
        const buffer = fs.readFileSync(file.path);
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
        let recs: Isolate[] = []
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

        dataFromFirstSheet.forEach((rec) => {
            let newRec = {};
            keyMappings.forEach((keyEntry) => {
                newRec[keyEntry.displayName] = rec[keyEntry.index] ? rec[keyEntry.index].toString() : "";
            });
            recs.push(setRelationalData(newRec));
        });

        console.log(`Inserting total ${recs.length} records`);
        console.time('mapAllSettled');
        const results = await mapAllSettled(recs, saveIsolate, 100);
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
const setRelationalData = (record: any): Isolate => {
    const { Jahr, BL, Mikroorganismus, Probenahmegrund, Probenahmestelle, Probenherkunft, Tierart_Lebensmittel_Oberkategorie, Tierart_Produktionsrichtung_Lebensmittel, Matrix, Matrixdetail, Salm_Serovar, ...strippedRecord } = record;
    let newTest = new Isolate(strippedRecord as IIsolate);

    newTest.year = Number(record.Jahr);

    if (record.BL) {
        newTest.state = {
            "set": [getId(states, "name", record.BL)]
        };
    }

    if (record.Mikroorganismus) {
        newTest.microorganism = {
            "set": [getId(microorganisms, "name", record.Mikroorganismus)]
        }
    }

    if (record.Probenahmegrund) {
        newTest.sampling_objective = {
            "set": [getId(objectives, "name", record.Probenahmegrund)]
        }
    }

    if (record.Probenahmestelle) {
        newTest.sampling_point = {
            "set": [getId(points, "name", record.Probenahmestelle)]
        }
    }

    if (record.Probenherkunft) {
        newTest.sampling_origin = {
            "set": [getId(origins, "name", record.Probenherkunft)]
        }
    }

    if (record.Tierart_Lebensmittel_Oberkategorie) {
        newTest.animal_species_food_upper_category = {
            "set": [getId(categories, "name", record.Tierart_Lebensmittel_Oberkategorie)]
        }
    }

    if (record.Tierart_Produktionsrichtung_Lebensmittel) {
        newTest.animal_species_production_direction_food = {
            "set": [getId(productions, "name", record.Tierart_Produktionsrichtung_Lebensmittel)]
        }
    }

    if (record.Matrix) {
        newTest.matrix = {
            "set": [getId(matrices, "name", record.Matrix)]
        }
    }

    if (record.Matrixdetail) {
        newTest.matrix_detail = {
            "set": [getId(matrixDetails, "name", record.Matrixdetail)]
        }
    }

    if (record.Salm_Serovar) {
        newTest.salmonella = {
            "set": [getId(salmonellas, "name", record.Salm_Serovar)]
        }
    }

    newTest.createdAt = getDateTimeISOString();
    newTest.updatedAt = getDateTimeISOString();

    return newTest;
}

/**
 * Save isolate data using db query
 * @param rec Individual isolate record to be saved
 * @param i Index of the record for logging purpose
 * @returns Id of the newly added record
 */
const saveIsolate = async (rec, i) => {
    let response = await strapi.db.query("api::isolate.isolate").create({
        data: JSON.parse(JSON.stringify(rec))
    });
    return response.id;
}

/**
 * Return promise for a record my calling a save action function
 * @param mapFn Function which does actual ddatabase save call
 * @param currentValue Current record which needs to be saved
 * @param index Indedx of the current record
 * @param array Collections of the records need to be saved
 * @returns Promise with either Id of the saved record or the error
 */
const mapItem = async (mapFn, currentValue, index, array) => {
    try {
        await setImmediateP()
        return {
            status: 'fulfilled',
            value: await mapFn(currentValue, index, array)
        }
    } catch (reason) {
        return {
            status: 'rejected',
            reason
        }
    }
}

/**
 * Call mapItem for each record inside an array for a worker
 * @param id Id of the worker under execution
 * @param gen Array chunk specific to the worker
 * @param mapFn Function which does actual ddatabase save call
 * @param result Array holding final result
 */
const worker = async (id, gen, mapFn, result) => {
    console.time(`Worker ${id}`);
    for (let [currentValue, index, array] of gen) {
        console.time(`Worker ${id} --- index ${index} item ${currentValue}`);
        result[index] = await mapItem(mapFn, currentValue, index, array);
        console.timeEnd(`Worker ${id} --- index ${index} item ${currentValue}`);
    }
    console.timeEnd(`Worker ${id}`);
}

/**
 * A generator function to get chunk of the huge array
 * @param array Original huge array that holds records to be saved
 */
function* arrayGenerator(array) {
    for (let index = 0; index < array.length; index++) {
        const currentValue = array[index];
        yield [currentValue, index, array];
    }
}

/**
 * 
 * @param arr Original huge array that holds records to be saved
 * @param mapFn Function which does actual ddatabase save call
 * @param limit Max number of workers to be used
 * @returns A promise containing all individual results
 */
const mapAllSettled = async (arr, mapFn, limit = arr.length) => {
    const result = [];
    if (arr.length === 0) {
        return result;
    }

    const gen = arrayGenerator(arr);
    limit = Math.min(limit, arr.length);
    const workers = new Array(limit);

    for (let i = 0; i < limit; i++) {
        workers.push(worker(i, gen, mapFn, result));
    }
    console.log(`Initialized ${limit} workers`);
    await Promise.all(workers);
    return result;
}