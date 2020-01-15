export default function createDivisor(num) {
    const results = [];
    for (let i = 1; i <= num; i++) {
        if (num % i === 0) {
            results.push(i);
        }
    }
    return results;
}
