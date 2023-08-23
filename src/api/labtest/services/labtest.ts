/**
 * labtest service
 */
import { factories } from '@strapi/strapi';
import { IKeys, ILabTest, LabTest } from '../models/models';
import { getDateTimeISOString, getId } from '../../../extensions/helper';
const fs = require('fs');
const xlsx = require("xlsx");
var states;
var microorganisms;
var objectives;
var salmonellas;
var origins;
var points;
var matrices;
var matrixDetails;
var categories;

export default factories.createCoreService('api::labtest.labtest', ({ strapi }) => ({
    async import(ctx) {
        console.time("Started");

        /**
            * Fetch master data
        */
        states = await strapi.entityService.findMany('api::state.state', {
            fields: ['id', 'name']
        });

        microorganisms = await strapi.entityService.findMany('api::microorganism.microorganism', {
            fields: ['id', 'name']
        });

        objectives = await strapi.entityService.findMany('api::objective.objective', {
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

        /**
            * Get the file from the context and read the data as a json array
        */
        const { request: { body, files: { file = '' } = {} } } = ctx;
        const buffer = fs.readFileSync(file.path);
        var workbook = xlsx.read(buffer);
        var sheet_name_list = workbook.SheetNames;
        var response = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]], { defval: "" });

        var recs: LabTest[] = []
        var keyMappings: IKeys[] = [];

        response.forEach((rec, recIndex) => {
            var newRec = {};
            if (recIndex == 0) {
                Object.keys(rec).forEach((entry) => {
                    var key = entry.replace(/\s+/g, '_');
                    key = key.replace(/\//g, '_');
                    key = key.replace(/\./g, '_');
                    key = key.replace(/\-/g, '_');
                    keyMappings.push({
                        name: entry,
                        displayName: key
                    });
                });
            }

            keyMappings.forEach((keyEntry) => {
                newRec[keyEntry.displayName] = rec[keyEntry.name] ? rec[keyEntry.name].toString() : "";
            });

            recs.push(setRelationalData(newRec));
        });

        console.log(`Inserting total ${recs.length} records`);

        var res = await Promise.all(recs.map(async (rec) => {
            var res = await strapi.db.query("api::labtest.labtest").create({
                data: JSON.parse(JSON.stringify(rec))
            });
            return res.id;
        }));
        console.timeEnd('Started');
        return res;
    }
}));

/**
 * Converts the input any type object into LabTest object
 * @param record object received from the imported excel
 * @returns new object of type LabTest
 */
const setRelationalData = (record: any): LabTest => {
    const { Jahr, BL, Mikroorganismus, Probenahmegrund, Probenahmestelle, Probenherkunft, Tierart_Lebensmittel_Oberkategorie, Tierart_Produktionsrichtung_Lebensmittel, Matrix, Matrixdetail, Salm_Serovar, ...strippedRecord } = record;
    var newTest = new LabTest(strippedRecord as ILabTest);

    newTest.year = Number(record.Jahr);

    newTest.state = {
        "set": [getId(states, "name", record.BL)]
    };

    newTest.microorganism = {
        "set": [getId(microorganisms, "name", record.Mikroorganismus)]
    }

    newTest.objective = {
        "set": [getId(objectives, "name", record.Probenahmegrund)]
    }

    newTest.sampling_point = {
        "set": [getId(points, "name", record.Probenahmestelle)]
    }

    newTest.sampling_origin = {
        "set": [getId(origins, "name", record.Probenherkunft)]
    }

    newTest.animal_species_food_upper_category = {
        "set": [getId(categories, "name", record.Tierart_Lebensmittel_Oberkategorie)]
    }

    newTest.animal_species_production_direction_food = {
        "set": [getId(categories, "name", record.Tierart_Produktionsrichtung_Lebensmittel)]
    }

    newTest.matrix = {
        "set": [getId(matrices, "name", record.Matrix)]
    }

    newTest.matrix_detail = {
        "set": [getId(matrixDetails, "name", record.Matrixdetail)]
    }

    newTest.salmonella = {
        "set": [getId(salmonellas, "name", record.Salm_Serovar)]
    }

    newTest.createdAt = getDateTimeISOString();
    newTest.updatedAt = getDateTimeISOString();

    return newTest;
}