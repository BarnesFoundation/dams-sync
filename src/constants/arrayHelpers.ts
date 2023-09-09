export function splitArray<T>(array: Array<T>, splitSize: number): Array<Array<T>> {
    const result = [];
    for (let i = 0; i < array.length; i += splitSize) {
        const chunk = array.slice(i, i + splitSize);
        result.push(chunk);
    }
    return result;
}

export function flattenArray<T>(list: Array<Array<T>>): Array<T> {
    return list.reduce((acc, curVal) => {
        return acc.concat(curVal)
    }, []);
}