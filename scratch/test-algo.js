const { assignRequestsGreedy } = require('../utils/algorithm');

const talepler = [
    { id: 1, enlem: 41.0082, boylam: 28.9784, oncelik: 'acil', olusturulma_tarihi: new Date() },
    { id: 2, enlem: 41.0082, boylam: 28.9784, oncelik: 'acil', olusturulma_tarihi: new Date() },
    { id: 3, enlem: 41.0082, boylam: 28.9784, oncelik: 'acil', olusturulma_tarihi: new Date() }
];

const gonulluler = [
    { id: 'Nisa', enlem: 41.0082, boylam: 28.9784, kapasite: 5 },
    { id: 'Other', enlem: 41.0082, boylam: 28.9784, kapasite: 5 }
];

const result = assignRequestsGreedy(talepler, gonulluler);
console.log(JSON.stringify(result.assignments, null, 2));
