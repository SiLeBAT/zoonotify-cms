/**
 * Get id of the record from the collection using the key and value passed
 * @param collection list of the data on which search will be performed
 * @param key key by which search will be performed
 * @param value value for which search will be performed
 * @returns id of the matching record as a number
 */
export const getId = (collection: any, key: string, value: string) : number => {
    var item = collection.find(item => item[key] == value);
    if (item) {
        return item.id;
    } else {
        return null;
    }
}

/**
 * Get current DateTime in ISO string
 * @returns DateTime in ISO string format
 */
export const getDateTimeISOString =() : string => {
    return new Date().toISOString();
}