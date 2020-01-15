// とある数が素数か否かを判定する
export default function isPrime(n) {
    if (n < 2) return false;
    if (n === 2 || n === 3 || n === 5) return true;
    if (n % 2 === 0 || n % 3 === 0 || n % 5 === 0) return false;
    let prime = 7;
    let step = 4;
    const limit = Math.sqrt(n);
    while (prime <= limit) {
        if (n % prime === 0) return false;
        prime += step;
        step = 6 - step;
    }
    return true;
}
