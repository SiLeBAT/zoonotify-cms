const { promisify } = require('util');
const { setImmediate } = require('timers');
const setImmediateP = promisify(setImmediate);
/**
 * A generator function to get chunk of the huge array
 * @param array Original huge array that holds records to be saved
 */
export const arrayGenerator = function* (array) {
    for (let index = 0; index < array.length; index++) {
        const currentValue = array[index];
        yield [currentValue, index, array];
    }
}

/**
 * Return promise for a record my calling a save action function
 * @param mapFn Function which does actual ddatabase save call
 * @param currentValue Current record which needs to be saved
 * @param index Indedx of the current record
 * @param array Collections of the records need to be saved
 * @returns Promise with either Id of the saved record or the error
 */
export const mapItem = async (mapFn, currentValue, index, array , key) => {
    try {
        await setImmediateP()
        return {
            statusCode: 200,
            id: currentValue[key],
            status: `Successfully saved a record with ID ${currentValue.ID}`,
            value: await mapFn(currentValue, index, array)
        }
    } catch (reason) {
        return {
            statusCode: 500,
            id: currentValue[key],
            status: `Error occured for a record with ID ${currentValue.ID}`,
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
export const worker = async (id, gen, mapFn, result, key) => {
    console.time(`Worker ${id}`);
    for (let [currentValue, index, array] of gen) {
        console.time(`Worker ${id} --- index ${index} item ${currentValue}`);
        result[index] = await mapItem(mapFn, currentValue, index, array, key);
        console.timeEnd(`Worker ${id} --- index ${index} item ${currentValue}`);
    }
    console.timeEnd(`Worker ${id}`);
}

/**
 * 
 * @param arr Original huge array that holds records to be saved
 * @param mapFn Function which does actual ddatabase save call
 * @param limit Max number of workers to be used
 * @returns A promise containing all individual results
 */
export const mapAllSettled = async (arr, mapFn, limit = arr.length, key) => {
    const result = [];
    if (arr.length === 0) {
        return result;
    }

    const gen = arrayGenerator(arr);
    limit = Math.min(limit, arr.length);
    const workers = new Array(limit);

    for (let i = 0; i < limit; i++) {
        workers.push(worker(i, gen, mapFn, result, key));
    }
    console.log(`Initialized ${limit} workers`);
    await Promise.all(workers);
    return result;
}